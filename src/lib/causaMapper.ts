import { Causa, EstadoLibertad, Imputado, OtroInterviniente } from "@/data/mockCausas";

type DbSujeto = {
  id: string;
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: "libre" | "detenido" | "rebelde" | "probation" | "condenado";
  defensor: string | null;
  fecha_detencion: string | null;
  prescripcion_fecha: string | null;
  vencimiento_pp: string | null;
  vencimiento_pena: string | null;
  observaciones: string | null;
  causa_id: string;
};

type DbCausa = {
  id: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: string;
  vocalia_id: string;
  created_at: string | null;
  querella: string | null;
  actor_civil: string | null;
  otros_intervinientes: string | null;
  causa_conexa_texto: string | null;
  sujetos?: DbSujeto[];
};

const libertadMap: Record<DbSujeto["situacion_libertad"], EstadoLibertad> = {
  detenido: "Detenido",
  libre: "Excarcelado",
  rebelde: "Rebelde",
  probation: "SJP",
  // No hay variante "Condenado" en el tipo UI todavía; se trata como excarcelado.
  condenado: "Excarcelado",
};

function mapSujeto(s: DbSujeto): Imputado {
  return {
    nombre: s.nombre_completo,
    estadoLibertad: libertadMap[s.situacion_libertad] ?? "Excarcelado",
    lugarDetencion: s.situacion_libertad === "detenido" ? s.observaciones ?? undefined : undefined,
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
  const sujetos = row.sujetos ?? [];
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

  return {
    id: row.id,
    numero: row.expediente_nro,
    caratulaOverride: row.caratula ?? undefined,
    delito: firstNonNull(sujetos.map((s) => s.delito)) ?? "—",
    imputados,
    estadoCausa: "En trámite",
    fechaInicio: (row.created_at ?? new Date().toISOString()).slice(0, 10),
    fechaPrescripcion: firstNonNull(sujetos.map((s) => s.prescripcion_fecha)) ?? "",
    fechaVencimientoPP: firstNonNull(sujetos.map((s) => s.vencimiento_pp)),
    otrosIntervinientes: otros.length ? otros : undefined,
    causasConexas: row.causa_conexa_texto ? [row.causa_conexa_texto] : undefined,
    vocalia: 1,
  };
}
