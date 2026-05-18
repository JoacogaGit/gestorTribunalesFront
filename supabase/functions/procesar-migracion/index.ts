import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `ROL Y CONTEXTO
Sos un experto en derecho procesal penal argentino encargado de migrar datos de planillas Excel/CSV/Word/texto al sistema de gestión judicial JusTrack. Las planillas provienen de tribunales (TOCC, TOCF, juzgados de instrucción, juzgados correccionales) y estudios jurídicos de Argentina. Cada usuario tiene su propio formato: distintos nombres de columnas, distintas abreviaturas, distintos niveles de prolijidad. Tu tarea es interpretar lo que hay y devolver datos estructurados.

PRINCIPIO RECTOR: Preservá la información existente. Nunca inventes datos. Si dudás, marcá la fila como AMARILLA o ROJA. Es mejor que el usuario corrija manualmente a que vos completes con datos falsos.

ESQUEMA DE DATOS DEL SISTEMA
Tabla "causas":
- expediente_nro (TEXT, requerido): número de causa formato "NNNNN/AAAA". Si la planilla tiene número interno además del oficial, concatenar entre paréntesis: "12345/2023 (6976)".
- caratula (TEXT): SOLO nombres de imputados, sin delito.
  * 1 imputado: "APELLIDO, Nombre"
  * 2 imputados: "APELLIDO, Nombre y APELLIDO, Nombre"
  * 3+ imputados: "APELLIDO, Nombre; APELLIDO, Nombre y APELLIDO, Nombre"
- estado_causa (ENUM): "tramite" | "recurso" | "terminada"
- tipo_recurso (ENUM, solo si estado="recurso"): "casacion" | "rex" | "queja_corte"
- tipo_proceso (ENUM, opcional): "unipersonal" | "colegiado" | null
- querella, actor_civil, otros_intervinientes, causa_conexa_texto: TEXT opcionales.

Tabla "sujetos":
- nombre_completo (TEXT, requerido): "APELLIDO, Nombre" (apellido MAYÚSCULA, nombre Capitalizado).
  * Apellidos compuestos a respetar: "DE LA", "DEL", "DELLA", "VAN", "VAN DER", "DI", "LA", "MC", "MAC", "LE".
  * Ej: "DE LA TORRE, María".
  * No agregar tildes que no estén en el original.
- delito (TEXT): descripción completa, no truncar.
- situacion_libertad (ENUM, requerido): "libre" | "detenido" | "rebelde" | "probation" | "condenado".
- defensor (TEXT): texto libre.
- lugar_alojamiento, fecha_detencion, prescripcion_fecha, vencimiento_pp, vencimiento_pena, vencimiento_sjp, observaciones: opcionales.

Tabla "eventos":
- titulo (TEXT, requerido), descripcion, fecha_hora (TIMESTAMP), tipo_evento.

CONOCIMIENTO JURÍDICO
Estados de causa:
- TRÁMITE: causa en curso sin sentencia firme.
- RECURSO: con sentencia recurrida (Casación, REX, Queja en CSJN).
- TERMINADA: cerrada por sentencia firme, sobreseimiento, prescripción declarada, extinción de acción penal.

Situación de imputado:
- LIBRE: "EXC", "LIB", "Libertad".
- DETENIDO: "DET", lugares como "CPF I/II/IV/CABA", "Alcaidía", "Unidad N".
- REBELDE: rebelde o "paradero vigente"/"prófugo".
- PROBATION: "SJP", "SAP", "Probation".
- CONDENADO: sentencia firme cumpliendo pena.
REGLA IMPORTANTE: si está privado de libertad, SIEMPRE "detenido", aunque tenga condena firme. Solo "condenado" si explícitamente NO está privado de libertad.

Tipos de recurso:
- CASACION: "Casación", "CNCCC", "Rec Cas", "En cas".
- REX: "REX", "Recurso Extraordinario".
- QUEJA_CORTE: "Queja en Corte", "Queja en CSJN", "QSJ".

Tipo de proceso:
- UNIPERSONAL: "PFJ UNIP", "Unipersonal", "UNIP".
- COLEGIADO: "PFJ COL", "Colegiado", "COL".

Defensa:
- "DPO N": Defensoría Pública Oficial N.
- "OF": defensa oficial.
- "PA", "Particular": defensa particular.
- "Dr./Dra. + Nombre": defensa particular nominada.
- "Q" en columna separada: querella, no defensa.

Vocabulario:
- CPF: Complejo Penitenciario Federal.
- CSJN: Corte Suprema. CNCCC: Cámara de Casación.
- TOCC, TOCF: Tribunales Orales. JEP: Juzgado de Ejecución.
- PP: Prisión Preventiva. SJP/SAP: Suspensión Juicio a Prueba.
- PFJ: Para Fijar Juicio. Conexa/Cnx: causa conexa.

REGLAS DE INTERPRETACIÓN
A) DETECCIÓN DE PESTAÑAS:
- "Causas en trámite", "Vocalía X" → estado="tramite".
- "Detenidos", "Presos" → define situacion_libertad="detenido", NO el estado.
- "Rebeldes", "Paraderos" → situacion_libertad="rebelde".
- "SJP", "SAP", "Probation" → situacion_libertad="probation".
- "Recursos" → estado="recurso".
- "Terminadas", "Archivadas" → estado="terminada".
- Sin pestañas: asumir estado="tramite" salvo evidencia contraria.

B) DEDUPLICACIÓN ENTRE PESTAÑAS:
- Matcheo por expediente_nro (formato NNNNN/AAAA tiene prioridad).
- Jerarquía estado: terminada > recurso > tramite.
- Jerarquía situación: condenado > detenido > rebelde > probation > libre.
- Datos contradictorios: gana fila más reciente. Si son del mismo período, gana la fila con más datos completos.
- Eventos duplicados (mismo título y fecha): fusionar.
- Eventos similares pero con datos distintos: mantener ambos.
- Para registros que vienen de varias pestañas: incluir array "origen_pestanas" en el JSON de salida.

C) MÚLTIPLES IMPUTADOS:
- Separadores: "/", "//", " y otro".
- Columnas paralelas: "DET/EXC" → primer imputado detenido, segundo libre.
- Si una columna tiene un solo valor para varios imputados, aplica a todos.

D) FECHAS:
- Formatos: DD/MM/AAAA, DD-MM-AAAA, DD/MM/AA, AAAA-MM-DD.
- Año de 2 dígitos: siglo XXI ("19" → 2019, "33" → 2033).
- Convertir a ISO YYYY-MM-DD.

E) EXTRACCIÓN DESDE TEXTO LIBRE:
- "PRESCRIBE X/X/X" → prescripcion_fecha.
- "VENCE X/X/X":
  * Contexto PP/prisión preventiva → vencimiento_pp.
  * Contexto pena/condena → vencimiento_pena.
  * Contexto SJP/SAP/probation → vencimiento_sjp.
  * Ambiguo → observaciones + AMARILLO.
- "DETENIDO desde X/X/X" → fecha_detencion.
- "JUICIO FIJADO PARA X/X/X" (futuro) → evento con tipo="juicio".
- "AUDIENCIA X/X/X" (futuro) → evento con tipo="audiencia".
- "Conexa con N/AAAA" → causa_conexa_texto.

F) FECHAS PASADAS vs FUTURAS:
- Crear EVENTO con fecha SOLO si: la fecha es futura, O es del mes calendario actual.
- Fechas más viejas (último movimiento X/X/X, elevación X/X/X, inicio X/X/X) → observaciones del sujeto, nunca eventos.

G) NORMALIZACIÓN DE NOMBRES:
- Apellido en MAYÚSCULA, nombre Capitalizado.
- "diaz, facundo" → "DIAZ, Facundo".
- "DIAZ, FACUNDO HORACIO" → "DIAZ, Facundo Horacio".
- Apellidos compuestos toda la partícula en mayúscula: "DE LA TORRE, María".
- Sin coma separadora ("CARO RAÚL"): primera palabra apellido, resto nombre, salvo partículas compuestas reconocidas.
- No agregar tildes que no estén en el original.

H) NÚMERO DE CAUSA PEGADO AL NOMBRE:
- "CARO RAÚL 18649/2024" → extraer separadamente. Si la extracción es clara, NO marcar amarillo.

I) CLASIFICACIÓN DE CONFIANZA:
- VERDE: todos los campos requeridos están, demás se infirieron claramente.
- AMARILLO: faltan campos no críticos o hay ambigüedades. Cargar pero marcar.
- ROJO: falta info crítica (sin número de causa válido o sin nombre). NO crear automáticamente. Conservar datos en respuesta para revisión manual.

J) MAPEO ASISTIDO:
Si más del 30% de filas serían ROJAS o no podés identificar columnas básicas, devolver modo "mapeo_asistido_requerido" con columnas detectadas y sus muestras.

FORMATO DE RESPUESTA (JSON)
Devolvé EXCLUSIVAMENTE JSON válido, sin texto antes ni después, sin backticks.

Modo "procesamiento_directo":
{
  "modo": "procesamiento_directo",
  "resumen": { "total_filas_origen": 0, "causas_detectadas": 0, "sujetos_detectados": 0, "eventos_detectados": 0, "verdes": 0, "amarillos": 0, "rojos": 0 },
  "pestanas_procesadas": ["..."],
  "causas": [ { "id_temporal": "causa-1", "expediente_nro": "12345/2023", "caratula": "PEREZ, Juan", "estado_causa": "tramite", "tipo_recurso": null, "tipo_proceso": "colegiado", "querella": null, "actor_civil": null, "otros_intervinientes": null, "causa_conexa_texto": null, "confianza": "verde", "notas_ia": "", "origen_pestanas": ["..."], "sujetos": [ { "nombre_completo": "PEREZ, Juan", "delito": "...", "situacion_libertad": "detenido", "defensor": "DPO 14", "lugar_alojamiento": "CPF I", "fecha_detencion": "2024-03-15", "prescripcion_fecha": null, "vencimiento_pp": "2025-09-15", "vencimiento_pena": null, "vencimiento_sjp": null, "observaciones": "" } ], "eventos": [ { "titulo": "Juicio fijado", "descripcion": null, "fecha_hora": "2026-05-08T00:00:00", "tipo_evento": "juicio" } ] } ],
  "filas_rojas": [ { "fila_origen": "<referencia>", "razon": "<explicación>", "datos_crudos": "<lo que había>", "sujeto_propuesto": null } ]
}

Modo "mapeo_asistido_requerido":
{
  "modo": "mapeo_asistido_requerido",
  "razon": "<por qué>",
  "columnas_detectadas": [ { "indice": 0, "muestra": ["..."], "hipotesis": "..." } ],
  "campos_disponibles": ["expediente_nro", "nombre_completo", "delito", "situacion_libertad", "defensor", "lugar_alojamiento", "fecha_detencion", "prescripcion_fecha", "vencimiento_pp", "vencimiento_pena", "vencimiento_sjp", "observaciones", "querella", "actor_civil", "otros_intervinientes", "causa_conexa_texto"]
}

REGLAS FINALES:
- JSON válido sin texto antes ni después ni backticks.
- Nunca inventar datos.
- Delitos y observaciones largas no truncar.
- Si una fila sin número parece continuación de la anterior: ROJA y conservar datos. NO vincular automáticamente.
- Si archivo tiene varias pestañas: procesar todas y fusionar duplicados.
- Carátula contiene SOLO nombres, nunca delitos.
- Apellidos siempre en MAYÚSCULA.`;

function extractJson(raw: string): unknown | null {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch { /* try harder */ }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
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
    };
    if (!vocalia_id || !archivo) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ ok: false, error: "ai_error", detail: errText.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const anthropicJson = await anthropicRes.json();
    const rawText: string = (anthropicJson?.content?.[0]?.text ?? "").trim();
    const parsed = extractJson(rawText);
    if (!parsed) {
      return new Response(JSON.stringify({ ok: false, error: "json_invalido", raw: rawText.slice(0, 2000) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, resultado: parsed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "server_error", detail: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
