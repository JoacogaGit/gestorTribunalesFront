import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `Sos un experto en derecho procesal penal argentino. Tu trabajo es migrar datos de planillas judiciales al sistema JusTrack. Sos INTELIGENTE: usá tu conocimiento jurídico para interpretar datos aunque estén mal escritos, abreviados o en formatos variados. El objetivo es SACARLE TRABAJO al usuario, no generarle más.

Respuesta: SOLO JSON válido, sin texto adicional, sin backticks.

═══════════════════════════════════════ ESQUEMA JSON CERRADO (OBLIGATORIO) ═══════════════════════════════════════

Devolvé SIEMPRE este JSON exacto, con TODAS las claves listadas, sin agregar ninguna clave fuera de esto:

{
  "modo": "procesamiento_directo",
  "resumen": {
    "total_filas_origen": <int>,
    "causas_detectadas": <int>,
    "sujetos_detectados": <int>,
    "eventos_detectados": <int>,
    "verdes": <int>,
    "amarillos": <int>,
    "rojos": <int>
  },
  "pestanas_procesadas": [<string>],
  "causas": [
    {
      "id_temporal": <string>,
      "expediente_nro": <string>,
      "numero_interno": <string | null>,
      "caratula": <string | null>,
      "despachante": <string de hasta 3 caracteres | null>,
      "estado_causa": "tramite" | "recurso" | "terminada",
      "tipo_recurso": "casacion" | "rex" | "queja_corte" | null,
      "tipo_proceso": "unipersonal" | "colegiado" | null,
      "fecha_ingreso": <string YYYY-MM-DD o null>,
      "querella": <string | null>,
      "actor_civil": <string | null>,
      "otros_intervinientes": <string | null>,
      "causa_conexa_texto": <string | null>,
      "confianza": "verde" | "amarillo",
      "notas_ia": <string | null>,
      "origen_pestanas": [<string>],
      "sujetos": [
        {
          "nombre_completo": <string>,
          "delito": <string | null>,
          "situacion_libertad": "libre" | "detenido" | "rebelde" | "probation" | "condenado",
          "defensor": <string | null>,
          "lugar_alojamiento": <string | null>,
          "fecha_detencion": <string YYYY-MM-DD o null>,
          "vencimiento_pp": <string YYYY-MM-DD o null>,
          "vencimiento_pena": <string YYYY-MM-DD o null>,
          "vencimiento_sjp": <string YYYY-MM-DD o null>,
          "observaciones": <string | null>,
          "prescripciones": [
            { "fecha": <string YYYY-MM-DD>, "descripcion": <string | null> }
          ]
        }
      ],
      "eventos": [
        {
          "titulo": <string>,
          "descripcion": <string | null>,
          "fecha_hora": <string ISO 8601 o null>,
          "tipo_evento": <string | null>
        }
      ]
    }
  ],
  "filas_rojas": [
    { "datos_crudos": <string>, "razon": <string> }
  ]
}

═══════════════════════════════════════ REGLAS ABSOLUTAS ═══════════════════════════════════════

REGLA 1 — Esquema cerrado. NUNCA inventes claves nuevas fuera del esquema. Las claves deben ser EXACTAMENTE las listadas, con esos nombres. Nada de "campos extras". Cualquier dato que no entre en una clave conocida va como evento sin fecha (ver REGLA 5).

REGLA 2 — Tipos estrictos. Todo campo declarado como string debe ser SIEMPRE string o null. Nunca un objeto. Nunca un array. Si tenés varios datos para un mismo campo string, concatenalos como texto separados por " | " (pipe con espacios).

REGLA 3 — Enums exactos. estado_causa, tipo_recurso, tipo_proceso, situacion_libertad deben ser EXACTAMENTE uno de los valores listados, en minúsculas, sin tildes, sin variantes. Si dudás, asumí el más conservador y dejá nota en notas_ia. El valor correcto es "probation" (NO "probacion").

REGLA 4 — Fechas en formato ISO. Todas las fechas en YYYY-MM-DD (date) o ISO 8601 completo (timestamp). Convertí cualquier otro formato encontrado ("12/05/2024", "12-may-24", "01/02/27", etc.). Año de 2 dígitos → siglo XXI. Si una fecha es ambigua o inválida → null + nota en observaciones del sujeto o notas_ia.

REGLA 5 — Columnas no reconocidas. Si en el Excel hay una columna que NO encaja en ningún campo del esquema (ej: "anotaciones internas", "observaciones del juzgado", "estado especial"), NO inventes una clave nueva. Generá un EVENTO SIN FECHA dentro del array eventos[] de la causa correspondiente:
{
  "titulo": "Datos adicionales del Excel",
  "descripcion": "<columna>: <contenido> | <otra columna>: <contenido>",
  "fecha_hora": null,
  "tipo_evento": "anotacion"
}
Las anotaciones se asocian SIEMPRE a la causa entera, nunca a un sujeto puntual.

REGLA 6 — numero_interno separado. Si el expediente viene combinado con un número interno (ej: "12298/2021 (7019)", "12298/21 - 7019", "exp 12298/21 int 7019"), separalo: expediente_nro="12298/2021", numero_interno="7019". Si no se identifica con claridad, numero_interno=null.

REGLA 7 — Clasificación de confianza.
- VERDE: expediente, carátula y al menos un sujeto identificados con claridad. Va a causas[].
- AMARILLO: algún dato dudoso pero la causa es identificable. Va a causas[] con confianza="amarillo" y notas_ia explicativa.
- ROJA: no se puede identificar la causa (sin expediente, sin imputado, datos confusos). NO va a causas[], va a filas_rojas[] con datos_crudos y razon.

REGLA 8 — Ante la duda, conservador. Mejor null que adivinar mal.

═══════════════════════════════════════ INTERPRETACIÓN INTELIGENTE DE VARIANTES ═══════════════════════════════════════

SITUACIÓN DE LIBERTAD: → libre: "EXC", "Exc", "excarcelado", "LIB", "en libertad", "L", celda vacía en columna de libertad. → detenido: "DET", "D", "detenido", "preso", cualquier lugar de detención (CPF, Alcaidía, Unidad, penitenciaría, cárcel), "privado de libertad". Si está privado de libertad SIEMPRE "detenido" aunque tenga condena firme. → rebelde: "rebelde", "REB", "prófugo", "paradero", "P/V", "orden de captura". → probation: "SJP", "SAP", "probation", "suspensión", "susp. juicio a prueba", "en prueba". → condenado: SOLO si NO está privado de libertad.

TIPO DE RECURSO: → casacion: "casación", "CNCCC", "rec cas", "en cámara", "CAS". → rex: "REX", "recurso extraordinario", "rec. ext.". → queja_corte: "queja en corte", "queja en CSJN", "QSJ", "Q. CSJN", "queja".

TIPO DE PROCESO: → unipersonal: "PFJ UNIP", "UNIP", "U", "unipersonal". → colegiado: "PFJ COL", "COL", "C", "colegiado".

FECHAS DE VENCIMIENTO: → DETENIDO SIN CONDENA + "vence X" → vencimiento_pp. → DETENIDO CON CONDENA o "PV"/"pena"/"condena vence" → vencimiento_pena. → PROBATION/SJP + "vence X" → vencimiento_sjp. → "prescribe X"/"prescripción X" → array prescripciones. → "PV provisorio X" → vencimiento_pena. → "PU X años"/"pena única" → vencimiento_pena. → Si no podés determinar → null + AMARILLO.

FECHA DE INGRESO: "Elevación", "Elev.", "Fecha 354", "354", "Ingreso al tribunal". NO confundir con "Inicio" (esa va a observaciones).

LUGARES DE DETENCIÓN: normalizá "CPF I"/"CPF 1" → "CPF I". Otros: tal cual.

CAUSAS CONEXAS: "Conexa", "Cnx", "conexa con", "vinculada a", "acumulada a".

VOCABULARIO: CPF=Complejo Penitenciario Federal. CSJN=Corte Suprema. CNCCC=Cámara de Casación. TOCC/TOCF=Tribunales Orales. JEP=Juzgado de Ejecución. Inst.=Instrucción. Sec.=Secretaría. PP=Prisión Preventiva. PFJ=Para Fijar Juicio.

PESTAÑAS: "Causas/Vocalía/Trámite/Activas" → estado_causa="tramite". "Detenidos/Presos" → situacion_libertad="detenido". "Rebeldes/Paraderos" → situacion_libertad="rebelde". "SJP/SAP/Probation" → situacion_libertad="probation". "Recursos/Casación" → estado_causa="recurso". "Terminadas/Archivadas" → estado_causa="terminada".

DEDUPLICACIÓN: match por expediente_nro normalizado. Jerarquía estado: terminada > recurso > tramite. Jerarquía situación: condenado > detenido > rebelde > probation > libre. Sujetos por nombre_completo normalizado. Eventos duplicados (mismo título+fecha): fusionar. origen_pestanas: pestañas que aportaron.

NOMBRES: "DIAZ, FACUNDO HORACIO" → "DIAZ, Facundo Horacio". Apellido MAYÚSCULA, nombre Capitalizado. Compuestos respetar: DE LA, DEL, VAN, DI, MC, MAC, LE. Sin coma ("CARO RAÚL"): 1ra palabra apellido, resto nombre. No agregar tildes ausentes.

═══════════════════════════════════════ EJEMPLOS ═══════════════════════════════════════

Ejemplo 1 — Causa simple:
INPUT: "12345/2024 (6976) | PEREZ, Juan | hurto | EXC | DPO 14 | elevación 12/03/2024"
OUTPUT (la causa):
{"id_temporal":"c-1","expediente_nro":"12345/2024","numero_interno":"6976","caratula":"PEREZ, Juan","estado_causa":"tramite","tipo_recurso":null,"tipo_proceso":null,"fecha_ingreso":"2024-03-12","querella":null,"actor_civil":null,"otros_intervinientes":null,"causa_conexa_texto":null,"confianza":"verde","notas_ia":null,"origen_pestanas":["Causas"],"sujetos":[{"nombre_completo":"PEREZ, Juan","delito":"hurto","situacion_libertad":"libre","defensor":"DPO 14","lugar_alojamiento":null,"fecha_detencion":null,"vencimiento_pp":null,"vencimiento_pena":null,"vencimiento_sjp":null,"observaciones":null,"prescripciones":[]}],"eventos":[]}

Ejemplo 2 — Compleja, varios sujetos, prescripciones y columna no reconocida ("notas internas"):
INPUT: "98765/2022 - 4521 | GOMEZ, Ana / LOPEZ, Pedro | robo agravado | DET CPF II / EXC | Det 18/10/2023 vence 13/01/2036 | prescribe 12/05/2030 | notas internas: revisar art 41"
OUTPUT (la causa):
{"id_temporal":"c-2","expediente_nro":"98765/2022","numero_interno":"4521","caratula":"GOMEZ, Ana y LOPEZ, Pedro","estado_causa":"tramite","tipo_recurso":null,"tipo_proceso":null,"fecha_ingreso":null,"querella":null,"actor_civil":null,"otros_intervinientes":null,"causa_conexa_texto":null,"confianza":"verde","notas_ia":null,"origen_pestanas":["Detenidos"],"sujetos":[{"nombre_completo":"GOMEZ, Ana","delito":"robo agravado","situacion_libertad":"detenido","defensor":null,"lugar_alojamiento":"CPF II","fecha_detencion":"2023-10-18","vencimiento_pp":"2036-01-13","vencimiento_pena":null,"vencimiento_sjp":null,"observaciones":null,"prescripciones":[{"fecha":"2030-05-12","descripcion":"robo agravado"}]},{"nombre_completo":"LOPEZ, Pedro","delito":"robo agravado","situacion_libertad":"libre","defensor":null,"lugar_alojamiento":null,"fecha_detencion":null,"vencimiento_pp":null,"vencimiento_pena":null,"vencimiento_sjp":null,"observaciones":null,"prescripciones":[]}],"eventos":[{"titulo":"Datos adicionales del Excel","descripcion":"notas internas: revisar art 41","fecha_hora":null,"tipo_evento":"anotacion"}]}

Modo alternativo (solo si >30% de las filas serían ROJAS): {"modo":"mapeo_asistido_requerido","razon":"","columnas_detectadas":[{"indice":0,"muestra":[],"hipotesis":""}],"campos_disponibles":["expediente_nro","numero_interno","nombre_completo","delito","situacion_libertad","defensor","lugar_alojamiento","fecha_detencion","prescripciones","vencimiento_pp","vencimiento_pena","vencimiento_sjp","observaciones","querella","actor_civil","causa_conexa_texto","fecha_ingreso"]}`;

const RETRY_SUFFIX = `\n\nIMPORTANTE: el response anterior tuvo errores de formato. Re-procesá EXACTAMENTE el mismo input respetando el esquema JSON al pie de la letra. NO inventes claves, NO uses objetos donde van strings, NO inventes valores de enum.`;

// ── Validador de esquema ──────────────────────────────────────────────────────
const CAUSA_KEYS = new Set([
  "id_temporal","expediente_nro","numero_interno","caratula","estado_causa","tipo_recurso",
  "tipo_proceso","fecha_ingreso","querella","actor_civil","otros_intervinientes",
  "causa_conexa_texto","confianza","notas_ia","origen_pestanas","sujetos","eventos",
]);
const SUJETO_KEYS = new Set([
  "nombre_completo","delito","situacion_libertad","defensor","lugar_alojamiento",
  "fecha_detencion","vencimiento_pp","vencimiento_pena","vencimiento_sjp",
  "observaciones","prescripciones",
]);
const EVENTO_KEYS = new Set(["titulo","descripcion","fecha_hora","tipo_evento"]);
const ESTADO_CAUSA = new Set(["tramite","recurso","terminada"]);
const TIPO_RECURSO = new Set(["casacion","rex","queja_corte"]);
const TIPO_PROCESO = new Set(["unipersonal","colegiado"]);
const SITUACION = new Set(["libre","detenido","rebelde","probation","condenado"]);
const CONFIANZA = new Set(["verde","amarillo"]);
const STRING_OR_NULL_CAUSA = ["caratula","numero_interno","fecha_ingreso","querella","actor_civil","otros_intervinientes","causa_conexa_texto","notas_ia"];
const STRING_OR_NULL_SUJETO = ["delito","defensor","lugar_alojamiento","fecha_detencion","vencimiento_pp","vencimiento_pena","vencimiento_sjp","observaciones"];

const isStringOrNull = (v: unknown) => v === null || typeof v === "string";

function validarResponse(json: unknown): { ok: boolean; reason?: string } {
  if (!json || typeof json !== "object") return { ok: false, reason: "no_object" };
  const r = json as Record<string, unknown>;
  if (r.modo !== "procesamiento_directo" && r.modo !== "mapeo_asistido_requerido") {
    return { ok: false, reason: "modo_invalido" };
  }
  if (r.modo === "mapeo_asistido_requerido") return { ok: true };
  if (!Array.isArray(r.causas)) return { ok: false, reason: "causas_no_array" };
  if (!Array.isArray(r.filas_rojas)) return { ok: false, reason: "filas_rojas_no_array" };
  if (!Array.isArray(r.pestanas_procesadas)) return { ok: false, reason: "pestanas_no_array" };

  for (const [ci, causaU] of (r.causas as unknown[]).entries()) {
    if (!causaU || typeof causaU !== "object") return { ok: false, reason: `causa[${ci}]_no_objeto` };
    const causa = causaU as Record<string, unknown>;
    for (const k of Object.keys(causa)) {
      if (!CAUSA_KEYS.has(k)) return { ok: false, reason: `causa[${ci}]_clave_extra:${k}` };
    }
    if (typeof causa.expediente_nro !== "string") return { ok: false, reason: `causa[${ci}].expediente_nro_no_string` };
    for (const k of STRING_OR_NULL_CAUSA) {
      if (k in causa && !isStringOrNull(causa[k])) return { ok: false, reason: `causa[${ci}].${k}_tipo_invalido` };
    }
    if (typeof causa.estado_causa !== "string" || !ESTADO_CAUSA.has(causa.estado_causa)) {
      return { ok: false, reason: `causa[${ci}].estado_causa_invalido` };
    }
    if (causa.tipo_recurso !== null && (typeof causa.tipo_recurso !== "string" || !TIPO_RECURSO.has(causa.tipo_recurso))) {
      return { ok: false, reason: `causa[${ci}].tipo_recurso_invalido` };
    }
    if (causa.tipo_proceso !== null && (typeof causa.tipo_proceso !== "string" || !TIPO_PROCESO.has(causa.tipo_proceso))) {
      return { ok: false, reason: `causa[${ci}].tipo_proceso_invalido` };
    }
    if (typeof causa.confianza !== "string" || !CONFIANZA.has(causa.confianza)) {
      return { ok: false, reason: `causa[${ci}].confianza_invalida` };
    }
    if (!Array.isArray(causa.sujetos)) return { ok: false, reason: `causa[${ci}].sujetos_no_array` };
    if (!Array.isArray(causa.eventos)) return { ok: false, reason: `causa[${ci}].eventos_no_array` };
    if (!Array.isArray(causa.origen_pestanas)) return { ok: false, reason: `causa[${ci}].origen_pestanas_no_array` };

    for (const [si, sU] of (causa.sujetos as unknown[]).entries()) {
      if (!sU || typeof sU !== "object") return { ok: false, reason: `causa[${ci}].sujetos[${si}]_no_objeto` };
      const s = sU as Record<string, unknown>;
      for (const k of Object.keys(s)) {
        if (!SUJETO_KEYS.has(k)) return { ok: false, reason: `causa[${ci}].sujetos[${si}]_clave_extra:${k}` };
      }
      if (typeof s.nombre_completo !== "string") return { ok: false, reason: `causa[${ci}].sujetos[${si}].nombre_no_string` };
      if (typeof s.situacion_libertad !== "string" || !SITUACION.has(s.situacion_libertad)) {
        return { ok: false, reason: `causa[${ci}].sujetos[${si}].situacion_invalida` };
      }
      for (const k of STRING_OR_NULL_SUJETO) {
        if (k in s && !isStringOrNull(s[k])) return { ok: false, reason: `causa[${ci}].sujetos[${si}].${k}_tipo_invalido` };
      }
      if (!Array.isArray(s.prescripciones)) return { ok: false, reason: `causa[${ci}].sujetos[${si}].prescripciones_no_array` };
      for (const [pi, pU] of (s.prescripciones as unknown[]).entries()) {
        if (!pU || typeof pU !== "object") return { ok: false, reason: `causa[${ci}].sujetos[${si}].prescripciones[${pi}]_no_objeto` };
        const p = pU as Record<string, unknown>;
        if (typeof p.fecha !== "string") return { ok: false, reason: `causa[${ci}].sujetos[${si}].prescripciones[${pi}].fecha_no_string` };
        if (!isStringOrNull(p.descripcion)) return { ok: false, reason: `causa[${ci}].sujetos[${si}].prescripciones[${pi}].descripcion_tipo_invalido` };
      }
    }
    for (const [ei, evU] of (causa.eventos as unknown[]).entries()) {
      if (!evU || typeof evU !== "object") return { ok: false, reason: `causa[${ci}].eventos[${ei}]_no_objeto` };
      const ev = evU as Record<string, unknown>;
      for (const k of Object.keys(ev)) {
        if (!EVENTO_KEYS.has(k)) return { ok: false, reason: `causa[${ci}].eventos[${ei}]_clave_extra:${k}` };
      }
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
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function countRows(pestana?: { contenido: unknown }): number {
  const contenido = pestana?.contenido;
  if (typeof contenido === "string") return contenido.split("\n").filter((l) => l.trim()).length;
  if (Array.isArray(contenido)) {
    return contenido.filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== "")).length;
  }
  return 0;
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userMsg: string,
  timeoutMs: number,
): Promise<{ ok: true; json: unknown; rawText: string } | { ok: false; code: string; status?: number; detail?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort("anthropic_timeout"), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
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
    return { ok: true, json: parsed, rawText };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, code: "anthropic_timeout" };
    return { ok: false, code: "anthropic_fetch_error", detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supaUserClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supaUserClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { vocalia_id, vocalia_nombre, archivo, mapeo_manual, pestana } = body as {
      vocalia_id?: string; vocalia_nombre?: string; archivo?: Record<string, unknown>; mapeo_manual?: Record<string, string>;
      pestana?: { nombre: string; contenido: unknown };
      lote_info?: { pestana?: string; nro_lote?: number; total_lotes?: number; filas?: number };
    };
    if (!vocalia_id || !archivo) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const loteInfo = (body as { lote_info?: { pestana?: string; nro_lote?: number; total_lotes?: number; filas?: number } }).lote_info;
    const payloadText = JSON.stringify(body);
    const pestanaLog = loteInfo?.pestana ?? pestana?.nombre ?? "archivo_completo";
    const nroLote = loteInfo?.nro_lote ?? 1;
    const totalLotes = loteInfo?.total_lotes ?? 1;
    const filasLote = loteInfo?.filas ?? countRows(pestana);
    console.log("procesar-migracion:start", {
      payload_bytes: byteLength(payloadText), filas_lote: filasLote,
      pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes,
    });

    const archivoEfectivo: Record<string, unknown> = pestana
      ? { ...archivo, pestanas: [pestana] }
      : archivo;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: voc, error: vocErr } = await admin
      .from("vocalias").select("id, tribunal_id").eq("id", vocalia_id).maybeSingle();
    if (vocErr || !voc) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden", detail: "vocalia_no_encontrada" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: miembro, error: miembroErr } = await admin
      .from("miembros_tribunal").select("id")
      .eq("tribunal_id", voc.tribunal_id).eq("usuario_id", userId).maybeSingle();
    if (miembroErr || !miembro) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden", detail: "no_es_miembro" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "no_api_key" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userPayload = JSON.stringify(archivoEfectivo).slice(0, 350_000);
    if (userPayload.length >= 350_000) {
      return new Response(JSON.stringify({ ok: false, error: "payload_too_large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tipoArchivo = (archivo as { tipo?: string }).tipo ?? "desconocido";
    const nombreArchivo = (archivo as { nombreArchivo?: string }).nombreArchivo ?? "";
    const headerPestana = pestana
      ? `Estás procesando ÚNICAMENTE la pestaña "${pestana.nombre}" del archivo "${nombreArchivo}". No infieras nada sobre otras pestañas; solo trabajá con los datos de esta. `
      : "";
    const userMsg = `${headerPestana}Migrar a vocalía: ${vocalia_nombre ?? ""}. Archivo de tipo ${tipoArchivo}. ` +
      (mapeo_manual ? `Mapeo manual provisto por el usuario (índice de columna → campo): ${JSON.stringify(mapeo_manual)}. ` : "") +
      `Contenido:\n${userPayload}`;

    const anthropicStart = Date.now();
    console.log("procesar-migracion:anthropic_before", { timestamp: anthropicStart, pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });

    // 1ra llamada
    const r1 = await callAnthropic(apiKey, SYSTEM_PROMPT, userMsg, 45_000);
    if (!r1.ok) {
      console.log("procesar-migracion:error", { tipo: r1.code, status: r1.status, pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });
      if (r1.code === "anthropic_timeout") {
        return new Response(JSON.stringify({ ok: false, error: "anthropic_timeout", lote_info: { pestana: pestanaLog, nro_lote: nroLote } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (r1.code === "anthropic_http_error") {
        return new Response(JSON.stringify({ ok: false, error: "ai_error", detail: r1.detail }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (r1.code === "json_invalido") {
        // Reintento por JSON inválido (no es un objeto JSON parseable).
        const r2 = await callAnthropic(apiKey, SYSTEM_PROMPT + RETRY_SUFFIX, userMsg, 45_000);
        if (!r2.ok) {
          return new Response(JSON.stringify({ ok: false, error: "json_invalido", raw: r2.detail ?? r1.detail }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const v2 = validarResponse(r2.json);
        if (!v2.ok) {
          console.log("procesar-migracion:error", { tipo: "schema_invalido_retry", reason: v2.reason, pestana: pestanaLog });
          return new Response(JSON.stringify({ ok: false, error: "schema_invalido", reason: v2.reason }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.log("procesar-migracion:anthropic_after", { elapsed_ms: Date.now() - anthropicStart, retry: true, pestana: pestanaLog });
        return new Response(JSON.stringify({ ok: true, resultado: r2.json }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: false, error: "ai_error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validar esquema
    const v1 = validarResponse(r1.json);
    if (v1.ok) {
      console.log("procesar-migracion:anthropic_after", { elapsed_ms: Date.now() - anthropicStart, retry: false, pestana: pestanaLog });
      return new Response(JSON.stringify({ ok: true, resultado: r1.json }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("procesar-migracion:schema_invalido", { reason: v1.reason, pestana: pestanaLog, nro_lote: nroLote });
    // Reintento UNA sola vez por esquema inválido.
    const r2 = await callAnthropic(apiKey, SYSTEM_PROMPT + RETRY_SUFFIX, userMsg, 45_000);
    if (!r2.ok) {
      return new Response(JSON.stringify({ ok: false, error: "schema_invalido", reason: v1.reason, retry_error: r2.code }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const v2 = validarResponse(r2.json);
    if (!v2.ok) {
      console.log("procesar-migracion:error", { tipo: "schema_invalido_retry", reason: v2.reason, pestana: pestanaLog });
      return new Response(JSON.stringify({ ok: false, error: "schema_invalido", reason: v2.reason }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("procesar-migracion:anthropic_after", { elapsed_ms: Date.now() - anthropicStart, retry: true, pestana: pestanaLog });
    return new Response(JSON.stringify({ ok: true, resultado: r2.json }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.log("procesar-migracion:error", { tipo: "server_error", message: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ ok: false, error: "server_error", detail: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
