/** Cálculos del relevamiento (en el navegador, hora Argentina). */

export type TipoCausa = "comun" | "art196" | "flagrancia";
export type ModoBloque = "auto" | "manual";
export type BloqueId = "causas" | "resoluciones" | "habeas" | "audiencias" | "violencia";
export type Valores = Record<string, number>;

export interface CausaRel {
  id: string;
  estado_causa: string;
  flagrancia: boolean | null;
  delegada: boolean | null;
  art196bis: boolean | null;
  fecha_ingreso: string | null;
  created_at: string | null;
  fecha_terminacion: string | null;
  modo_terminacion: string | null;
  violencia_genero: boolean | null;
  tipo_violencia_genero: string | null;
  sujetos: { situacion_libertad: string; borrado_en: string | null }[] | null;
}

export interface BloqueDef {
  id: BloqueId;
  titulo: string;
  subtitulo?: string;
  modoDefault: ModoBloque;
  filas: { id: string; label: string }[];
  columnas: { id: string; label: string }[];
  /** Agrega columna "Total" sumando las columnas. */
  totalColumna?: boolean;
  /** Agrega fila "Total" sumando las filas (se puede excluir filas). */
  totalFila?: boolean;
  excluirDeTotal?: string[];
}

export const TIPOS: { id: TipoCausa; label: string }[] = [
  { id: "comun", label: "Común" },
  { id: "art196", label: "Art. 196" },
  { id: "flagrancia", label: "Flagrancia" },
];

export const MODOS_RESOLUCION = [
  { id: "elevacion", label: "Elevación a juicio", match: ["elevación a juicio"] },
  { id: "desestimacion", label: "Desestimación", match: ["desestimación"] },
  { id: "sobre_presc", label: "Sobreseimiento por prescripción", match: ["sobreseimiento por prescripción"] },
  { id: "sobre_otras", label: "Sobreseimiento otras causales", match: ["sobreseimiento otras causales"] },
  { id: "incompetencia", label: "Incompetencia", match: ["incompetencia"] },
  { id: "susp_juicio", label: "Susp. juicio a prueba", match: ["suspensión de juicio a prueba", "susp. juicio"] },
  { id: "abreviado", label: "Juicio abreviado", match: ["juicio abreviado"] },
  { id: "archivo", label: "Archivo", match: ["archivo"] },
  { id: "otras", label: "Otras", match: [] as string[] },
];

export const TIPOS_VG = [
  "Femicidio", "Transfemicidio", "Femicidio vinculado", "Lesiones", "Amenazas/coacción", "Abuso sexual", "Otras",
];

const DET = [{ id: "con", label: "Con detenido" }, { id: "sin", label: "Sin detenido" }];

export const BLOQUES: BloqueDef[] = [
  {
    id: "causas", titulo: "Causas", subtitulo: "Por tipo de causa y situación de detención", modoDefault: "auto",
    filas: TIPOS.flatMap((t) => DET.map((d) => ({ id: `${t.id}_${d.id}`, label: `${t.label} · ${d.label.toLowerCase()}` }))),
    columnas: [
      { id: "inicio", label: "Existentes al inicio" },
      { id: "ingresadas", label: "Ingresadas en el período" },
      { id: "total", label: "Total en trámite" },
      { id: "cierre", label: "En trámite al cierre" },
    ],
    totalFila: true,
  },
  {
    id: "resoluciones", titulo: "Resoluciones adoptadas", subtitulo: "Causas terminadas dentro del período, por modo de terminación", modoDefault: "auto",
    filas: MODOS_RESOLUCION.map((m) => ({ id: m.id, label: m.label })),
    columnas: DET, totalColumna: true, totalFila: true,
  },
  {
    id: "habeas", titulo: "Hábeas corpus", modoDefault: "manual",
    filas: [
      { id: "ingresados", label: "Ingresados" },
      { id: "rechazados", label: "Rechazados" },
      { id: "incompetencias", label: "Incompetencias" },
      { id: "desistidos", label: "Desistidos" },
      { id: "proc_sin_aud", label: "Procedentes sin audiencia (art. 14)" },
      { id: "proc_con_aud", label: "Procedentes con audiencia (art. 14)" },
    ],
    columnas: [{ id: "cant", label: "Cantidad" }], totalFila: true, excluirDeTotal: ["ingresados"],
  },
  {
    id: "audiencias", titulo: "Flagrancia", subtitulo: "Audiencias virtuales y presenciales", modoDefault: "manual",
    filas: [{ id: "virtuales", label: "Virtuales" }, { id: "presenciales", label: "Presenciales" }],
    columnas: [{ id: "cant", label: "Cantidad" }], totalFila: true,
  },
  {
    id: "violencia", titulo: "Violencia de género", subtitulo: "Ley 26.485 · Causas en trámite durante el período", modoDefault: "auto",
    filas: TIPOS_VG.map((t) => ({ id: t, label: t })),
    columnas: [{ id: "cant", label: "Causas" }], totalFila: true,
  },
];

export function tipoDeCausa(c: CausaRel): TipoCausa {
  if (c.flagrancia) return "flagrancia";
  if (c.delegada || c.art196bis) return "art196";
  return "comun";
}

export function conDetenido(c: CausaRel): boolean {
  return (c.sujetos ?? []).some((s) => !s.borrado_en && s.situacion_libertad === "detenido");
}

const fechaIngreso = (c: CausaRel) => (c.fecha_ingreso || (c.created_at ? c.created_at.slice(0, 10) : null));

/** Fecha en que dejó de estar en trámite (null = sigue). Terminada sin fecha: se considera muy antigua. */
const fechaFin = (c: CausaRel) =>
  c.estado_causa === "terminada" ? (c.fecha_terminacion || "0000-01-01") : (c.fecha_terminacion || null);

function modoResolucion(modo: string | null): string {
  const m = (modo || "").trim().toLowerCase();
  return MODOS_RESOLUCION.find((r) => r.match.includes(m))?.id ?? "otras";
}

export function calcularAuto(causas: CausaRel[], inicio: string, fin: string): Record<BloqueId, Valores> {
  const causasV: Valores = {};
  const res: Valores = {};
  const vg: Valores = {};
  const add = (o: Valores, k: string) => { o[k] = (o[k] ?? 0) + 1; };

  for (const c of causas) {
    const fila = `${tipoDeCausa(c)}_${conDetenido(c) ? "con" : "sin"}`;
    const ing = fechaIngreso(c);
    const ff = fechaFin(c);
    const existente = !!ing && ing < inicio && (ff === null || ff >= inicio);
    const ingresada = !!ing && ing >= inicio && ing <= fin;
    const alCierre = !!ing && ing <= fin && (ff === null || ff > fin);
    if (existente) { add(causasV, `${fila}|inicio`); add(causasV, `${fila}|total`); }
    if (ingresada) { add(causasV, `${fila}|ingresadas`); add(causasV, `${fila}|total`); }
    if (alCierre) add(causasV, `${fila}|cierre`);

    if (c.estado_causa === "terminada" && c.fecha_terminacion && c.fecha_terminacion >= inicio && c.fecha_terminacion <= fin) {
      add(res, `${modoResolucion(c.modo_terminacion)}|${conDetenido(c) ? "con" : "sin"}`);
    }

    if (c.violencia_genero && (existente || ingresada)) {
      const t = TIPOS_VG.includes(c.tipo_violencia_genero || "") ? c.tipo_violencia_genero! : "Otras";
      add(vg, `${t}|cant`);
    }
  }
  return { causas: causasV, resoluciones: res, violencia: vg, habeas: {}, audiencias: {} };
}

/** Resoluciones separadas por tipo de causa (claves `${tipo}_${modo}|con|sin`), para la planilla oficial. */
export function resolucionesPorTipo(causas: CausaRel[], inicio: string, fin: string): Valores {
  const out: Valores = {};
  for (const c of causas) {
    if (c.estado_causa === "terminada" && c.fecha_terminacion && c.fecha_terminacion >= inicio && c.fecha_terminacion <= fin) {
      const k = `${tipoDeCausa(c)}_${modoResolucion(c.modo_terminacion)}|${conDetenido(c) ? "con" : "sin"}`;
      out[k] = (out[k] ?? 0) + 1;
    }
  }
  return out;
}
