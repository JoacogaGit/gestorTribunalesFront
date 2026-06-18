// Procesa lotes de migración server-side, con chaining para evitar timeouts.
// Reutiliza la misma lógica de IA (Claude) que `procesar-migracion`, pero
// trabajando contra `migraciones_jobs` y permitiendo continuar incluso si el
// usuario cierra la pestaña.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `Sos un experto en derecho procesal penal argentino. Tu trabajo es migrar datos de planillas judiciales al sistema JusTrack. Sos INTELIGENTE: usá tu conocimiento jurídico para interpretar datos aunque estén mal escritos, abreviados o en formatos variados. El objetivo es SACARLE TRABAJO al usuario, no generarle más.

Respuesta: SOLO JSON válido, sin texto adicional, sin backticks.

Devolvé SIEMPRE un objeto con esta forma exacta (no inventes claves nuevas):
{
  "modo": "procesamiento_directo",
  "resumen": { "total_filas_origen": <int>, "causas_detectadas": <int>, "sujetos_detectados": <int>, "eventos_detectados": <int>, "verdes": <int>, "amarillos": <int>, "rojos": <int> },
  "pestanas_procesadas": [<string>],
  "causas": [ { "id_temporal": <string>, "expediente_nro": <string>, "numero_interno": <string|null>, "caratula": <string|null>, "estado_causa": "tramite"|"recurso"|"terminada", "tipo_recurso": "casacion"|"rex"|"queja_corte"|null, "tipo_proceso": "unipersonal"|"colegiado"|null, "fecha_ingreso": <string YYYY-MM-DD|null>, "querella": <string|null>, "actor_civil": <string|null>, "otros_intervinientes": <string|null>, "causa_conexa_texto": <string|null>, "confianza": "verde"|"amarillo", "notas_ia": <string|null>, "origen_pestanas": [<string>], "sujetos": [ { "nombre_completo": <string>, "delito": <string|null>, "situacion_libertad": "libre"|"detenido"|"rebelde"|"probation"|"condenado", "defensor": <string|null>, "lugar_alojamiento": <string|null>, "fecha_detencion": <string YYYY-MM-DD|null>, "vencimiento_pp": <string YYYY-MM-DD|null>, "vencimiento_pena": <string YYYY-MM-DD|null>, "vencimiento_sjp": <string YYYY-MM-DD|null>, "observaciones": <string|null>, "prescripciones": [ { "fecha": <string YYYY-MM-DD>, "descripcion": <string|null> } ] } ], "eventos": [ { "titulo": <string>, "descripcion": <string|null>, "fecha_hora": <string ISO 8601|null>, "tipo_evento": <string|null> } ] } ],
  "filas_rojas": [ { "datos_crudos": <string>, "razon": <string> } ]
}

Reglas: tipos estrictos (string|null nunca objeto); enums exactos en minúscula y sin tildes ("probation" no "probacion"); fechas ISO; columnas no reconocidas van como evento sin fecha con tipo_evento="anotacion"; numero_interno separado del expediente; clasificá confianza verde/amarillo/roja (las rojas a filas_rojas[]); ante la duda, conservador. Si >30% de filas serían rojas devolvé { "modo":"mapeo_asistido_requerido", "razon": <string>, "columnas_detectadas":[{"indice":<int>,"muestra":[<string>],"hipotesis":<string>}], "campos_disponibles":[...] }.`;

const RETRY_SUFFIX = `\n\nIMPORTANTE: el response anterior tuvo errores de formato. Re-procesá EXACTAMENTE el mismo input respetando el esquema JSON al pie de la letra. NO inventes claves, NO uses objetos donde van strings, NO inventes valores de enum.`;

// ── Validador de esquema (replica el de procesar-migracion) ───────────────────
const CAUSA_KEYS = new Set(["id_temporal","expediente_nro","numero_interno","caratula","despachante","estado_causa","tipo_recurso","tipo_proceso","fecha_ingreso","querella","actor_civil","otros_intervinientes","causa_conexa_texto","confianza","notas_ia","origen_pestanas","sujetos","eventos"]);
const SUJETO_KEYS = new Set(["nombre_completo","delito","situacion_libertad","defensor","lugar_alojamiento","fecha_detencion","vencimiento_pp","vencimiento_pena","vencimiento_sjp","observaciones","prescripciones"]);
const EVENTO_KEYS = new Set(["titulo","descripcion","fecha_hora","tipo_evento"]);
const ESTADO_CAUSA = new Set(["tramite","recurso","terminada"]);
const TIPO_RECURSO = new Set(["casacion","rex","queja_corte"]);
const TIPO_PROCESO = new Set(["unipersonal","colegiado"]);
const SITUACION = new Set(["libre","detenido","rebelde","probation","condenado"]);
const CONFIANZA = new Set(["verde","amarillo"]);
const STRING_OR_NULL_CAUSA = ["caratula","numero_interno","despachante","fecha_ingreso","querella","actor_civil","otros_intervinientes","causa_conexa_texto","notas_ia"];
const STRING_OR_NULL_SUJETO = ["delito","defensor","lugar_alojamiento","fecha_detencion","vencimiento_pp","vencimiento_pena","vencimiento_sjp","observaciones"];
const isStringOrNull = (v: unknown) => v === null || typeof v === "string";

function validarResponse(json: unknown): { ok: boolean; reason?: string } {
  if (!json || typeof json !== "object") return { ok: false, reason: "no_object" };
  const r = json as Record<string, unknown>;
  if (r.modo !== "procesamiento_directo" && r.modo !== "mapeo_asistido_requerido") return { ok: false, reason: "modo_invalido" };
  if (r.modo === "mapeo_asistido_requerido") return { ok: true };
  if (!Array.isArray(r.causas)) return { ok: false, reason: "causas_no_array" };
  if (!Array.isArray(r.filas_rojas)) return { ok: false, reason: "filas_rojas_no_array" };
  if (!Array.isArray(r.pestanas_procesadas)) return { ok: false, reason: "pestanas_no_array" };
  for (const [ci, causaU] of (r.causas as unknown[]).entries()) {
    if (!causaU || typeof causaU !== "object") return { ok: false, reason: `causa[${ci}]_no_objeto` };
    const causa = causaU as Record<string, unknown>;
    for (const k of Object.keys(causa)) if (!CAUSA_KEYS.has(k)) return { ok: false, reason: `causa[${ci}]_clave_extra:${k}` };
    if (typeof causa.expediente_nro !== "string") return { ok: false, reason: `causa[${ci}].expediente_nro_no_string` };
    for (const k of STRING_OR_NULL_CAUSA) if (k in causa && !isStringOrNull(causa[k])) return { ok: false, reason: `causa[${ci}].${k}_tipo_invalido` };
    if (typeof causa.estado_causa !== "string" || !ESTADO_CAUSA.has(causa.estado_causa)) return { ok: false, reason: `causa[${ci}].estado_causa_invalido` };
    if (causa.tipo_recurso !== null && (typeof causa.tipo_recurso !== "string" || !TIPO_RECURSO.has(causa.tipo_recurso))) return { ok: false, reason: `causa[${ci}].tipo_recurso_invalido` };
    if (causa.tipo_proceso !== null && (typeof causa.tipo_proceso !== "string" || !TIPO_PROCESO.has(causa.tipo_proceso))) return { ok: false, reason: `causa[${ci}].tipo_proceso_invalido` };
    if (typeof causa.confianza !== "string" || !CONFIANZA.has(causa.confianza)) return { ok: false, reason: `causa[${ci}].confianza_invalida` };
    if (!Array.isArray(causa.sujetos)) return { ok: false, reason: `causa[${ci}].sujetos_no_array` };
    if (!Array.isArray(causa.eventos)) return { ok: false, reason: `causa[${ci}].eventos_no_array` };
    if (!Array.isArray(causa.origen_pestanas)) return { ok: false, reason: `causa[${ci}].origen_pestanas_no_array` };
    for (const [si, sU] of (causa.sujetos as unknown[]).entries()) {
      if (!sU || typeof sU !== "object") return { ok: false, reason: `causa[${ci}].sujetos[${si}]_no_objeto` };
      const s = sU as Record<string, unknown>;
      for (const k of Object.keys(s)) if (!SUJETO_KEYS.has(k)) return { ok: false, reason: `causa[${ci}].sujetos[${si}]_clave_extra:${k}` };
      if (typeof s.nombre_completo !== "string") return { ok: false, reason: `causa[${ci}].sujetos[${si}].nombre_no_string` };
      if (typeof s.situacion_libertad !== "string" || !SITUACION.has(s.situacion_libertad)) return { ok: false, reason: `causa[${ci}].sujetos[${si}].situacion_invalida` };
      for (const k of STRING_OR_NULL_SUJETO) if (k in s && !isStringOrNull(s[k])) return { ok: false, reason: `causa[${ci}].sujetos[${si}].${k}_tipo_invalido` };
      if (!Array.isArray(s.prescripciones)) return { ok: false, reason: `causa[${ci}].sujetos[${si}].prescripciones_no_array` };
    }
    for (const [ei, evU] of (causa.eventos as unknown[]).entries()) {
      if (!evU || typeof evU !== "object") return { ok: false, reason: `causa[${ci}].eventos[${ei}]_no_objeto` };
      const ev = evU as Record<string, unknown>;
      for (const k of Object.keys(ev)) if (!EVENTO_KEYS.has(k)) return { ok: false, reason: `causa[${ci}].eventos[${ei}]_clave_extra:${k}` };
      if (typeof ev.titulo !== "string") return { ok: false, reason: `causa[${ci}].eventos[${ei}].titulo_no_string` };
      if (!isStringOrNull(ev.descripcion)) return { ok: false, reason: `causa[${ci}].eventos[${ei}].descripcion_tipo_invalido` };
      if (!isStringOrNull(ev.fecha_hora)) return { ok: false, reason: `causa[${ci}].eventos[${ei}].fecha_hora_tipo_invalido` };
      if (!isStringOrNull(ev.tipo_evento)) return { ok: false, reason: `causa[${ci}].eventos[${ei}].tipo_evento_tipo_invalido` };
    }
  }
  return { ok: true };
}

function extractJson(raw: string): unknown | null {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch { /* try harder */ }
  const start = trimmed.indexOf("{"); const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
}

async function callAnthropic(apiKey: string, systemPrompt: string, userMsg: string, timeoutMs: number):
  Promise<{ ok: true; json: unknown } | { ok: false; code: string; status?: number; detail?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort("anthropic_timeout"), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 16000, system: systemPrompt, messages: [{ role: "user", content: userMsg }] }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500);
      return { ok: false, code: "anthropic_http_error", status: res.status, detail };
    }
    const body = await res.json();
    const rawText: string = (body?.content?.[0]?.text ?? "").trim();
    const parsed = extractJson(rawText);
    if (!parsed) return { ok: false, code: "json_invalido", detail: rawText.slice(0, 1000) };
    return { ok: true, json: parsed };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, code: "anthropic_timeout" };
    return { ok: false, code: "anthropic_fetch_error", detail: e instanceof Error ? e.message : String(e) };
  } finally { clearTimeout(t); }
}

// ── Procesamiento ─────────────────────────────────────────────────────────────
const MAX_LOTES_PER_RUN = 6;       // procesar hasta 6 lotes y luego encadenar
const MAX_RUN_MS = 200_000;        // ~3:20 — tope conservador para self-chain
const TIMEOUT_LOTE_MS = 50_000;

type Lote = { pestana: string; nro_lote: number; total_lotes: number; filas: number; contenido: string[][] };
type ArchivoMeta = { tipo?: string; nombre?: string; vocalia_nombre?: string };
type ResultadoAcum = { pestana: string; resultado: unknown };

async function procesarLote(apiKey: string, archivoMeta: ArchivoMeta, lote: Lote): Promise<{ ok: true; resultado: unknown } | { ok: false; error: string }> {
  const userPayload = JSON.stringify({
    tipo: archivoMeta.tipo ?? "desconocido",
    nombreArchivo: archivoMeta.nombre ?? "",
    pestanas: [{ nombre: lote.pestana, contenido: lote.contenido }],
  }).slice(0, 350_000);
  const userMsg = `Estás procesando ÚNICAMENTE la pestaña "${lote.pestana}" del archivo "${archivoMeta.nombre ?? ""}". No infieras nada sobre otras pestañas; solo trabajá con los datos de esta. Migrar a vocalía: ${archivoMeta.vocalia_nombre ?? ""}. Archivo de tipo ${archivoMeta.tipo ?? "desconocido"}. Contenido:\n${userPayload}`;

  const r1 = await callAnthropic(apiKey, SYSTEM_PROMPT, userMsg, TIMEOUT_LOTE_MS);
  if (r1.ok) {
    const v1 = validarResponse(r1.json);
    if (v1.ok) return { ok: true, resultado: r1.json };
  }
  // 1 reintento (igual que procesar-migracion)
  const r2 = await callAnthropic(apiKey, SYSTEM_PROMPT + RETRY_SUFFIX, userMsg, TIMEOUT_LOTE_MS);
  if (r2.ok) {
    const v2 = validarResponse(r2.json);
    if (v2.ok) return { ok: true, resultado: r2.json };
    return { ok: false, error: `schema_invalido:${v2.reason}` };
  }
  return { ok: false, error: r2.code };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const token = authHeader.replace("Bearer ", "");

  const supaUserClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claimsData, error: claimsErr } = await supaUserClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const isService = (claimsData.claims.role as string) === "service_role";
  const callerUserId = claimsData.claims.sub as string;

  const body = await req.json().catch(() => null);
  const jobId = (body as { job_id?: string } | null)?.job_id;
  if (!jobId) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: job, error: jobErr } = await admin.from("migraciones_jobs").select("*").eq("id", jobId).maybeSingle();
  if (jobErr || !job) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!isService && job.usuario_id !== callerUserId) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (job.estado === "revision" || job.estado === "completado" || job.estado === "error") {
    return new Response(JSON.stringify({ ok: true, estado: job.estado }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  // Si ya está "procesando" y la llamada NO es del propio chaining, no relanzamos
  // para evitar dos workers paralelos sobre el mismo job.
  if (job.estado === "procesando" && !isService) {
    return new Response(JSON.stringify({ ok: true, estado: "procesando" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    await admin.from("migraciones_jobs").update({ estado: "error", error_mensaje: "no_api_key" }).eq("id", jobId);
    return new Response(JSON.stringify({ error: "no_api_key" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await admin.from("migraciones_jobs").update({ estado: "procesando" }).eq("id", jobId);

  const archivoMeta = (job.archivo_meta || {}) as ArchivoMeta;
  const pendientes = ((job.lotes_pendientes as Lote[]) || []).slice();
  const resultados = ((job.resultados as ResultadoAcum[]) || []).slice();
  const filasRojasAcum = ((job.filas_rojas as unknown[]) || []).slice();
  let lotesProcesados = job.lotes_procesados ?? 0;
  let lotesFallidos = job.lotes_fallidos ?? 0;

  const tStart = Date.now();
  let processedThisRun = 0;

  try {
    while (pendientes.length > 0 && processedThisRun < MAX_LOTES_PER_RUN && (Date.now() - tStart) < MAX_RUN_MS) {
      const lote = pendientes[0];
      console.log("procesar-migracion-job:lote_start", { job_id: jobId, pestana: lote.pestana, nro_lote: lote.nro_lote, total_lotes: lote.total_lotes, filas: lote.filas });
      const r = await procesarLote(apiKey, archivoMeta, lote);
      pendientes.shift();
      if (r.ok) {
        lotesProcesados++;
        const res = r.resultado as { filas_rojas?: unknown[] } | undefined;
        resultados.push({ pestana: `${lote.pestana} · lote ${lote.nro_lote}/${lote.total_lotes}`, resultado: r.resultado });
        if (res && Array.isArray(res.filas_rojas)) for (const fr of res.filas_rojas) filasRojasAcum.push(fr);
      } else {
        lotesFallidos++;
        console.log("procesar-migracion-job:lote_error", { job_id: jobId, error: r.error });
      }
      processedThisRun++;
      await admin.from("migraciones_jobs").update({
        lotes_procesados: lotesProcesados,
        lotes_fallidos: lotesFallidos,
        lotes_pendientes: pendientes,
        resultados,
        filas_rojas: filasRojasAcum,
      }).eq("id", jobId);
    }

    if (pendientes.length === 0) {
      await admin.from("migraciones_jobs").update({ estado: "revision" }).eq("id", jobId);
      return new Response(JSON.stringify({ ok: true, estado: "revision", procesados: lotesProcesados, fallidos: lotesFallidos }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Aún quedan lotes → encadenar con service-role para que esta invocación termine
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/procesar-migracion-job`;
    // fire-and-forget; usamos EdgeRuntime.waitUntil si está disponible, sino solo lanzamos la promesa.
    const chainPromise = fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    }).catch((e) => console.log("procesar-migracion-job:chain_fetch_error", { msg: String(e) }));
    // @ts-ignore EdgeRuntime puede no existir en tipos
    try { if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(chainPromise); } catch { /* noop */ }

    return new Response(JSON.stringify({ ok: true, estado: "procesando", chained: true, procesados: lotesProcesados, pendientes: pendientes.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("procesar-migracion-job:server_error", { msg });
    await admin.from("migraciones_jobs").update({ estado: "error", error_mensaje: msg }).eq("id", jobId);
    return new Response(JSON.stringify({ error: "server_error", detail: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
