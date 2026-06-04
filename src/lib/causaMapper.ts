import { Causa, EstadoCausa, EstadoLibertad, Imputado, OtroInterviniente } from "@/data/mockCausas";

export type DbSituacionLibertad = "libre" | "detenido" | "rebelde" | "probation" | "condenado";
export type DbEstadoCausa = "tramite" | "recurso" | "terminada";
export type DbTipoRecurso = "casacion" | "rex" | "queja_corte" | null;

export const SITUACIONES_LIBERTAD: DbSituacionLibertad[] = ["libre", "detenido", "rebelde", "probation", "condenado"];
export const ESTADOS_CAUSA_DB: DbEstadoCausa[] = ["tramite", "recurso", "terminada"];
export const TIPOS_RECURSO: Exclude<DbTipoRecurso, null>[] = ["casacion", "rex", "queja_corte"];

export const labelEstadoCausa: Record<DbEstadoCausa, string> = {
  tramite: "Trámite",
  recurso: "Recurso",
  terminada: "Terminada",
};

export const labelTipoRecurso: Record<Exclude<DbTipoRecurso, null>, string> = {
  casacion: "Casación",
  rex: "REX",
  queja_corte: "Queja en Corte",
};

export const labelSituacionLibertad: Record<DbSituacionLibertad, string> = {
  libre: "Libre",
  detenido: "Detenido",
  rebelde: "Rebelde",
  probation: "Probation",
  condenado: "Condenado",
};

export type DbSujeto = {
  id: string;
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: DbSituacionLibertad;
  defensor: string | null;
  fecha_detencion: string | null;
  prescripcion_fecha: string | null;
  vencimiento_pp: string | null;
  vencimiento_pena: string | null;
  observaciones: string | null;
  lugar_alojamiento: string | null;
  causa_id: string;
  created_at?: string | null;
  /** Fechas de prescripción adicionales (tabla prescripciones). */
  prescripciones?: { id: string; fecha: string; descripcion: string | null }[];
};

export type DbTipoProceso = "unipersonal" | "colegiado" | null;

export type DbCausa = {
  id: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: DbEstadoCausa;
  tipo_recurso: DbTipoRecurso;
  tipo_proceso: DbTipoProceso;
  fecha_ingreso: string | null;
  vocalia_id: string;
  created_at: string | null;
  querella: string | null;
  actor_civil: string | null;
  otros_intervinientes: string | null;
  causa_conexa_texto: string | null;
  causa_conexa_id: string | null;
  link_externo: string | null;
  color_destacado: string | null;
  sujetos?: DbSujeto[];
};

const libertadMap: Record<DbSituacionLibertad, EstadoLibertad> = {
  detenido: "Detenido",
  libre: "Excarcelado",
  rebelde: "Rebelde",
  probation: "SJP",
  condenado: "Excarcelado",
};

function mapEstadoCausa(estado: DbEstadoCausa, tipo: DbTipoRecurso): EstadoCausa {
  if (estado === "tramite") return "En trámite";
  if (estado === "terminada") return "Terminada";
  // recurso
  switch (tipo) {
    case "casacion": return "Casación";
    case "rex": return "REX";
    case "queja_corte": return "Queja en Corte";
    default: return "Casación";
  }
}

export function mapSujeto(s: DbSujeto): Imputado {
  return {
    nombre: s.nombre_completo,
    estadoLibertad: libertadMap[s.situacion_libertad] ?? "Excarcelado",
    lugarDetencion: s.situacion_libertad === "detenido"
      ? (s.lugar_alojamiento ?? s.observaciones ?? undefined)
      : undefined,
    fechaVencimientoPena: s.vencimiento_pena ?? undefined,
    defensor: {
      nombre: s.defensor || "—",
      tipo: "DPO",
      contacto: "",
    },
  };
}

function firstNonNull<T>(values: (T | null | undefined)[]): T | undefined {
  for (const v of values) if (v != null && v !== "") return v as T;
  return undefined;
}

export function dbCausaToUI(row: DbCausa): Causa {
  // Ordenar sujetos: el más nuevo primero (created_at DESC).
  const sujetos = (row.sujetos ?? []).slice().sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  const imputados = sujetos.length > 0
    ? sujetos.map(mapSujeto)
    : [{
        nombre: "(sin imputados)",
        estadoLibertad: "Excarcelado" as EstadoLibertad,
        defensor: { nombre: "—", tipo: "DPO" as const, contacto: "" },
      }];

  const otros: OtroInterviniente[] = [];
  if (row.querella) otros.push({ rol: "Querella", nombre: row.querella });
  if (row.actor_civil) otros.push({ rol: "Actor civil", nombre: row.actor_civil });
  if (row.otros_intervinientes) otros.push({ rol: "Otros", nombre: row.otros_intervinientes });

  // Recolectar todas las fechas de prescripción de todos los sujetos (campo legacy + tabla nueva).
  const todasPrescripciones: { fecha: string; label?: string }[] = [];
  for (const s of sujetos) {
    if (s.prescripcion_fecha) todasPrescripciones.push({ fecha: s.prescripcion_fecha, label: s.nombre_completo });
    (s.prescripciones ?? []).forEach((p) => {
      todasPrescripciones.push({ fecha: p.fecha, label: p.descripcion || s.nombre_completo });
    });
  }
  todasPrescripciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const [prescripcionPrincipal, ...prescripcionExtras] = todasPrescripciones;

  return {
    id: row.id,
    numero: row.expediente_nro,
    caratulaOverride: row.caratula ?? undefined,
    delito: firstNonNull(sujetos.map((s) => s.delito)) ?? "—",
    imputados,
    estadoCausa: mapEstadoCausa(row.estado_causa, row.tipo_recurso),
    fechaInicio: (row.created_at ?? new Date().toISOString()).slice(0, 10),
    fechaIngreso: row.fecha_ingreso ?? null,
    tipoProceso: row.tipo_proceso ?? null,
    fechaPrescripcion: prescripcionPrincipal?.fecha ?? "",
    fechasPrescripcionExtra: prescripcionExtras.length > 0 ? prescripcionExtras : undefined,
    fechaVencimientoPP: firstNonNull(sujetos.map((s) => s.vencimiento_pp)),
    otrosIntervinientes: otros.length ? otros : undefined,
    causasConexas: row.causa_conexa_texto ? [row.causa_conexa_texto] : undefined,
    causaConexaId: row.causa_conexa_id ?? null,
    causaConexaTexto: row.causa_conexa_texto ?? null,
    link: row.link_externo ?? undefined,
    colorDestacado: row.color_destacado ?? null,
    vocalia: 1,
  };
}
