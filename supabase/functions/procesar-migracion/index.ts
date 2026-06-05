import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `Sos un experto en derecho procesal penal argentino. Tu trabajo es migrar datos de planillas judiciales al sistema JusTrack. Sos INTELIGENTE: usá tu conocimiento jurídico para interpretar datos aunque estén mal escritos, abreviados o en formatos variados. El objetivo es SACARLE TRABAJO al usuario, no generarle más.

REGLA DE ORO: interpretá agresivamente usando contexto. Solo dejá algo sin clasificar si es REALMENTE imposible de determinar. Cuando algo no tenga campo específico, creá un evento sin fecha (anotación) vinculado a la causa con el texto original.

Respuesta: SOLO JSON válido, sin texto adicional, sin backticks.

═══════════════════════════════════════ ESQUEMA DE DATOS ═══════════════════════════════════════

CAUSA:

expediente_nro (TEXT, requerido): formato "NNNNN/AAAA". Si hay nro interno del tribunal además, concatenar: "12345/2023 (6976)". Si solo hay nro corto sin año, cargarlo igual.

caratula: SOLO nombres. Sin delito. "APELLIDO, Nombre y APELLIDO, Nombre". Con 3+: usar punto y coma entre los primeros.

estado_causa: "tramite" | "recurso" | "terminada"

tipo_recurso: "casacion" | "rex" | "queja_corte" (solo si recurso)

tipo_proceso: "unipersonal" | "colegiado" | null

querella, actor_civil, otros_intervinientes: texto libre si existen

causa_conexa_texto: si menciona conexidad

fecha_ingreso: fecha de elevación a juicio / ingreso al tribunal / fecha 354

SUJETO:

nombre_completo: "APELLIDO, Nombre". Apellido MAYÚSCULA, nombre Capitalizado. No agregar tildes ausentes en original. Compuestos respetar: DE LA, DEL, VAN, DI, MC, MAC, LE.

delito: completo, no resumir

situacion_libertad: "libre" | "detenido" | "rebelde" | "probation" | "condenado"

defensor: texto libre

lugar_alojamiento: lugar de detención si aplica

fecha_detencion, vencimiento_pp, vencimiento_pena, vencimiento_sjp: fechas ISO

prescripciones: ARRAY [{ fecha: "YYYY-MM-DD", descripcion: "delito si se conoce" | null }]

observaciones: BREVE (1-2 líneas max). Solo lo que no entra en ningún campo. No repetir datos ya cargados en otros campos.

EVENTO (vinculado a causa):

titulo, descripcion, fecha_hora (TIMESTAMP si tiene fecha, null si es anotación), tipo_evento

═══════════════════════════════════════ INTERPRETACIÓN INTELIGENTE DE VARIANTES ═══════════════════════════════════════

SITUACIÓN DE LIBERTAD - reconocé todas estas variantes: → LIBRE: "EXC", "Exc", "exc", "excarcelado", "LIB", "libre", "en libertad", "L", celda vacía en columna de libertad con el resto de datos normales → DETENIDO: "DET", "Det", "D", "detenido", "preso", cualquier nombre de lugar de detención (CPF, Alcaidía, Unidad, penitenciaría, cárcel, instituto), "privado de libertad". REGLA: si está privado de libertad SIEMPRE "detenido" aunque tenga condena firme. → REBELDE: "rebelde", "REB", "prófugo", "paradero", "paradero vigente", "con paradero", "P/V", "orden de captura" → PROBATION: "SJP", "SAP", "Sjp", "probation", "suspensión", "susp. juicio a prueba", "suspendido", "en prueba" → CONDENADO: "condenado" SOLO si NO está privado de libertad

TIPO DE RECURSO - reconocé todas estas variantes: → CASACION: "casación", "casacion", "CNCCC", "en cas", "rec cas", "recurso de casación", "en cámara", "en casación", "CAS", "cas en trámite" → REX: "REX", "rex", "recurso extraordinario", "rec. ext.", "recurso extraordinario federal" → QUEJA_CORTE: "queja en corte", "queja en CSJN", "queja corte", "QSJ", "QEJA", "qeja", "Q. CSJN", "queja", "en corte"

TIPO DE PROCESO - reconocé: → UNIPERSONAL: "PFJ UNIP", "UNIP", "unip", "U", "unipersonal", "trib. unip.", "juicio unipersonal" → COLEGIADO: "PFJ COL", "COL", "col", "C", "colegiado", "trib. coleg.", "juicio colegiado"

DEFENSA - reconocé: → "DPO N", "DPO-N", "Def. Of. N", "Defensoría N": Defensoría Pública Oficial número N → "OF", "Of", "of", "OF N", "oficial", "def. oficial": defensa oficial → "PA", "Pa", "part", "particular", "Part.": defensa particular → "Dr.", "Dra.", "Dr ", "Dra ", seguido de nombre: defensa particular nominada → "Q" en columna separada: es QUERELLA, no defensa

FECHAS DE VENCIMIENTO - usá CONTEXTO para determinar cuál es: → Si el sujeto está DETENIDO SIN CONDENA y dice "vence X": es vencimiento_pp → Si el sujeto está DETENIDO CON CONDENA o dice "PV", "pena", "condena vence": es vencimiento_pena
→ Si el sujeto está en PROBATION/SJP y dice "vence X": es vencimiento_sjp → Si dice "prescribe X" o "prescripción X": va al array prescripciones → Si dice "PV provisorio X": es vencimiento_pena (PV = pena vencimiento) → Si dice "PU X años" o "pena única": es dato de condena, la fecha va a vencimiento_pena → Si REALMENTE no podés determinar cuál es: crear evento sin fecha con el texto + marcar AMARILLO

FECHA DE INGRESO - reconocé: → Columnas: "Elevación", "Elev.", "Fecha 354", "354", "Ingreso", "Ingreso al tribunal", "Fecha elevación", "Elevación a juicio", "Fecha ingreso" → NO confundir con "Inicio" o "Inicio causa" (esa es la fecha del hecho o inicio de instrucción, va a observaciones)

LUGARES DE DETENCIÓN - normalizá: → "CPF I", "CPF 1", "CPF1", "Complejo I" → "CPF I" → "CPF II", "CPF 2" → "CPF II"
→ "CPF IV", "CPF 4" → "CPF IV" → "CPF CABA" → "CPF CABA" → Otros: cargar tal cual

CAUSAS CONEXAS - reconocé: → "Conexa", "Cnx", "cnx", "conexa con", "vinculada a", "acumulada a"

VOCABULARIO JUDICIAL: CPF=Complejo Penitenciario Federal. CSJN=Corte Suprema. CNCCC=Cámara de Casación. TOCC/TOCF=Tribunales Orales. JEP=Juzgado de Ejecución. JCyC/JCC=Juzgado Criminal y Correccional. Inst.=Instrucción. Sec.=Secretaría. PP=Prisión Preventiva. PFJ=Para Fijar Juicio.

═══════════════════════════════════════ REGLAS DE PROCESAMIENTO ═══════════════════════════════════════

PESTAÑAS → qué definen:

"Causas/Vocalía/Trámite/Activas" → estado_causa="tramite"

"Detenidos/Presos" → situacion_libertad="detenido" (NO define estado_causa, hay que cruzar con otras pestañas)

"Rebeldes/Paraderos/Prófugos" → situacion_libertad="rebelde"

"SJP/SAP/Probation/Suspensión" → situacion_libertad="probation"

"Recursos/Casación/En recurso" → estado_causa="recurso"

"Terminadas/Archivadas/Cerradas/Finalizadas" → estado_causa="terminada"

Sin pestañas o nombre no reconocible → "tramite" por defecto

DEDUPLICACIÓN ENTRE PESTAÑAS:

Match por expediente_nro normalizado (trim, lowercase).

Jerarquía estado: terminada > recurso > tramite.

Jerarquía situación: condenado > detenido > rebelde > probation > libre.

Match de sujetos por nombre_completo normalizado.

Campos contradictorios: gana la fila con más datos completos.

Eventos duplicados (mismo título+fecha): fusionar en uno.

origen_pestanas: array con nombres de pestañas que aportaron.

MÚLTIPLES IMPUTADOS EN UNA FILA:

Separadores: "/", "//", " y otro", "- "

"PEREZ, Juan / GOMEZ, Carlos" → 2 sujetos

Columnas paralelas: "DET/EXC" → 1ro detenido, 2do libre. "DPO 14/Part" → 1ro DPO 14, 2do particular.

Un solo valor para varios imputados → aplica a todos.

"/" al final sin segundo nombre → marcar AMARILLO, cargar solo el existente.

FECHAS:

Formatos: DD/MM/AAAA, DD-MM-AAAA, DD/MM/AA, DD-MM-AA, AAAA-MM-DD, "DD de mes de AAAA"

Año 2 dígitos → siglo XXI ("19"→2019, "33"→2033, "28"→2028)

Convertir siempre a ISO YYYY-MM-DD

Si una celda tiene varias fechas ("Detenido desde 18-10-19 - VENCE 13/1/2036"), extraer CADA UNA a su campo.

FECHAS EN EVENTOS:

Futuras o del mes actual → evento CON fecha_hora

Pasadas (>30 días) → evento SIN fecha (anotación) con el texto, O a observaciones del sujeto si es claramente info del sujeto. Usar criterio.

NOMBRES:

Normalizar: "DIAZ, FACUNDO HORACIO" → "DIAZ, Facundo Horacio". "diaz, facundo" → "DIAZ, Facundo".

Sin coma ("CARO RAÚL"): 1ra palabra = apellido, resto = nombre. Excepto partículas compuestas.

Número pegado ("CARO RAÚL 18649/2024"): extraer automáticamente sin marcar amarillo si es claro.

No agregar tildes que no estén en el original.

FILA SIN NRO DE CAUSA: ROJA. Conservar datos. NO vincular automáticamente con fila anterior.

═══════════════════════════════════════ CONFIANZA ═══════════════════════════════════════

VERDE: expediente_nro + nombre_completo presentes, datos interpretados sin ambigüedad. AMARILLO: datos presentes pero hubo alguna ambigüedad o dato faltante menor. ROJO: falta expediente_nro O nombre_completo. NO crear causa. Conservar en filas_rojas.

Si >30% serían ROJAS → devolver modo "mapeo_asistido_requerido".

═══════════════════════════════════════ RESPUESTA JSON ═══════════════════════════════════════

Modo procesamiento_directo: {"modo":"procesamiento_directo","resumen":{"total_filas_origen":0,"causas_detectadas":0,"sujetos_detectados":0,"eventos_detectados":0,"verdes":0,"amarillos":0,"rojos":0},"pestanas_procesadas":[],"causas":[{"id_temporal":"causa-1","expediente_nro":"","caratula":"","estado_causa":"tramite","tipo_recurso":null,"tipo_proceso":null,"querella":null,"actor_civil":null,"otros_intervinientes":null,"causa_conexa_texto":null,"link_externo":null,"fecha_ingreso":null,"confianza":"verde","notas_ia":"","origen_pestanas":[],"sujetos":[{"nombre_completo":"","delito":"","situacion_libertad":"libre","defensor":null,"lugar_alojamiento":null,"fecha_detencion":null,"prescripciones":[],"vencimiento_pp":null,"vencimiento_pena":null,"vencimiento_sjp":null,"observaciones":""}],"eventos":[]}],"filas_rojas":[]}

Modo mapeo_asistido_requerido: {"modo":"mapeo_asistido_requerido","razon":"","columnas_detectadas":[{"indice":0,"muestra":[],"hipotesis":""}],"campos_disponibles":["expediente_nro","nombre_completo","delito","situacion_libertad","defensor","lugar_alojamiento","fecha_detencion","prescripciones","vencimiento_pp","vencimiento_pena","vencimiento_sjp","observaciones","querella","actor_civil","causa_conexa_texto","fecha_ingreso"]}

Cambios clave: prompt más conservador (ante dudas crea anotación sin fecha en vez de adivinar campos), campos nuevos (fecha_ingreso, prescripciones como array), observaciones más breves, tipo_evento "nota_migracion" para anotaciones de duda.`;

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
      payload_bytes: byteLength(payloadText),
      filas_lote: filasLote,
      pestana: pestanaLog,
      nro_lote: nroLote,
      total_lotes: totalLotes,
    });
    // Si viene una pestaña puntual, reemplazamos el array de pestañas por una sola.
    const archivoEfectivo: Record<string, unknown> = pestana
      ? { ...archivo, pestanas: [pestana] }
      : archivo;

    // Validar membresía con service-role: vocalía -> tribunal -> miembro.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: voc, error: vocErr } = await admin
      .from("vocalias")
      .select("id, tribunal_id")
      .eq("id", vocalia_id)
      .maybeSingle();
    if (vocErr || !voc) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden", detail: "vocalia_no_encontrada" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: miembro, error: miembroErr } = await admin
      .from("miembros_tribunal")
      .select("id")
      .eq("tribunal_id", voc.tribunal_id)
      .eq("usuario_id", userId)
      .maybeSingle();
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

    const anthropicBody = JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });
    const estimatedTokens = Math.ceil((SYSTEM_PROMPT.length + userMsg.length) / 4);
    const anthropicStart = Date.now();
    console.log("procesar-migracion:anthropic_before", { timestamp: anthropicStart, estimated_tokens: estimatedTokens, pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("anthropic_timeout"), 45_000);
    let anthropicRes: Response;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: anthropicBody,
        signal: controller.signal,
      });
    } catch (error) {
      const isTimeout = controller.signal.aborted;
      console.log("procesar-migracion:error", { tipo: isTimeout ? "anthropic_timeout" : "anthropic_fetch_error", message: error instanceof Error ? error.message : String(error), pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });
      if (isTimeout) {
        return new Response(JSON.stringify({ ok: false, error: "anthropic_timeout", lote_info: { pestana: pestanaLog, nro_lote: nroLote } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.log("procesar-migracion:error", { tipo: "anthropic_http_error", status: anthropicRes.status, pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });
      return new Response(JSON.stringify({ ok: false, error: "ai_error", detail: errText.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const anthropicJson = await anthropicRes.json();
    console.log("procesar-migracion:anthropic_after", { elapsed_ms: Date.now() - anthropicStart, response_bytes: byteLength(JSON.stringify(anthropicJson)), pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });
    const rawText: string = (anthropicJson?.content?.[0]?.text ?? "").trim();
    const parsed = extractJson(rawText);
    if (!parsed) {
      console.log("procesar-migracion:error", { tipo: "json_invalido", pestana: pestanaLog, nro_lote: nroLote, total_lotes: totalLotes });
      return new Response(JSON.stringify({ ok: false, error: "json_invalido", raw: rawText.slice(0, 2000) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, resultado: parsed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.log("procesar-migracion:error", { tipo: "server_error", message: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ ok: false, error: "server_error", detail: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
