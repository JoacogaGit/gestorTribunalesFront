import type { CausaIA, EventoIA, PrescripcionIA, SujetoIA } from "@/hooks/useMigracion";

/** Convierte cualquier valor a string limpio o null. Si llega un objeto,
 *  lo aplana en "k: v | k: v" para que NUNCA se renderice un objeto directo
 *  en React (evita error #31: "Objects are not valid as a React child"). */
export function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const partes = value
      .map((v) => toStringOrNull(v))
      .filter((v): v is string => !!v);
    return partes.length ? partes.join(" | ") : null;
  }
  if (typeof value === "object") {
    try {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => {
          const sv = typeof v === "object" ? JSON.stringify(v) : String(v);
          return `${k}: ${sv}`;
        });
      return entries.length > 0 ? entries.join(" | ") : null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizarPrescripcion(p: unknown): PrescripcionIA {
  const src = (p ?? {}) as Record<string, unknown>;
  return {
    fecha: toStringOrNull(src.fecha) ?? "",
    descripcion: toStringOrNull(src.descripcion),
  };
}

function normalizarSujeto(s: unknown): SujetoIA {
  const src = (s ?? {}) as Record<string, unknown>;
  const sitRaw = toStringOrNull(src.situacion_libertad) ?? "libre";
  const sit = (["libre", "detenido", "rebelde", "probation", "condenado"].includes(sitRaw)
    ? sitRaw
    : "libre") as SujetoIA["situacion_libertad"];
  const prescRaw = Array.isArray(src.prescripciones) ? src.prescripciones : [];
  return {
    nombre_completo: toStringOrNull(src.nombre_completo) ?? "",
    delito: toStringOrNull(src.delito),
    situacion_libertad: sit,
    defensor: toStringOrNull(src.defensor),
    lugar_alojamiento: toStringOrNull(src.lugar_alojamiento),
    fecha_detencion: toStringOrNull(src.fecha_detencion),
    prescripcion_fecha: toStringOrNull(src.prescripcion_fecha),
    prescripciones: prescRaw.map(normalizarPrescripcion),
    vencimiento_pp: toStringOrNull(src.vencimiento_pp),
    vencimiento_pena: toStringOrNull(src.vencimiento_pena),
    vencimiento_sjp: toStringOrNull(src.vencimiento_sjp),
    observaciones: toStringOrNull(src.observaciones),
  };
}

function normalizarEvento(e: unknown): EventoIA {
  const src = (e ?? {}) as Record<string, unknown>;
  return {
    titulo: toStringOrNull(src.titulo) ?? "",
    descripcion: toStringOrNull(src.descripcion),
    fecha_hora: toStringOrNull(src.fecha_hora),
    tipo_evento: toStringOrNull(src.tipo_evento),
  };
}

export function normalizarCausa(c: unknown): CausaIA {
  const src = (c ?? {}) as Record<string, unknown>;
  const estadoRaw = toStringOrNull(src.estado_causa) ?? "tramite";
  const estado = (["tramite", "recurso", "terminada"].includes(estadoRaw)
    ? estadoRaw
    : "tramite") as CausaIA["estado_causa"];
  const tipoRecRaw = toStringOrNull(src.tipo_recurso);
  const tipoRec = tipoRecRaw && ["casacion", "rex", "queja_corte"].includes(tipoRecRaw)
    ? (tipoRecRaw as CausaIA["tipo_recurso"])
    : null;
  const tipoProcRaw = toStringOrNull(src.tipo_proceso);
  const tipoProc = tipoProcRaw && ["unipersonal", "colegiado"].includes(tipoProcRaw)
    ? (tipoProcRaw as CausaIA["tipo_proceso"])
    : null;
  const confRaw = toStringOrNull(src.confianza) ?? "amarillo";
  const conf = (["verde", "amarillo", "rojo"].includes(confRaw)
    ? confRaw
    : "amarillo") as CausaIA["confianza"];
  const sujetos = Array.isArray(src.sujetos) ? src.sujetos.map(normalizarSujeto) : [];
  const eventos = Array.isArray(src.eventos) ? src.eventos.map(normalizarEvento) : [];
  const origen = Array.isArray(src.origen_pestanas)
    ? (src.origen_pestanas as unknown[]).map((x) => toStringOrNull(x)).filter((x): x is string => !!x)
    : [];
  return {
    id_temporal: toStringOrNull(src.id_temporal) ?? "",
    expediente_nro: toStringOrNull(src.expediente_nro) ?? "",
    caratula: toStringOrNull(src.caratula),
    estado_causa: estado,
    tipo_recurso: tipoRec,
    tipo_proceso: tipoProc,
    fecha_ingreso: toStringOrNull(src.fecha_ingreso),
    querella: toStringOrNull(src.querella),
    actor_civil: toStringOrNull(src.actor_civil),
    otros_intervinientes: toStringOrNull(src.otros_intervinientes),
    causa_conexa_texto: toStringOrNull(src.causa_conexa_texto),
    confianza: conf,
    notas_ia: toStringOrNull(src.notas_ia) ?? undefined,
    origen_pestanas: origen,
    sujetos,
    eventos,
  };
}
