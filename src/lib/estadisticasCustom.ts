import { Causa } from "@/data/mockCausas";
import { parseLocalTime } from "@/lib/parseDate";

/** Contexto opcional para evaluar criterios que dependen de datos externos. */
export interface EstadisticaCtx {
  /** causaId -> timestamps (ms) de eventos futuros. */
  eventosPorCausa?: Map<string, number[]>;
}

/** Opciones disponibles para elegir el valor de un criterio. */
export interface OpcionesCtx {
  causas?: Causa[];
  subestados?: string[];
  estadosProcesales?: string[];
  fueros?: string[];
}

export type TipoValor = "opciones" | "dias";

export interface CriterioEstadistica {
  id: string;
  label: string;
  descripcion?: string;
  tipoValor: TipoValor;
  /** Columna de la tabla que sube al 3er lugar al filtrar. */
  columna?: string;
  /** Opciones fijas y/o dinámicas para el valor. */
  opciones?: (ctx: OpcionesCtx) => string[];
  /** Etiqueta para mostrar en la tarjeta: "Nombre · <valor>" */
  etiquetaValor?: (valor: string) => string;
  cumple: (c: Causa, valor: string, ctx: EstadisticaCtx) => boolean;
}

const norm = (s: string) => s.trim().toLowerCase();

const unicos = (vals: (string | null | undefined)[]) =>
  Array.from(new Set(vals.map((v) => (v || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));

/* ------------------------- fechas ------------------------- */

function inicioHoy(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function fechasVencimiento(c: Causa): string[] {
  return [
    c.fechaPrescripcion,
    c.fechaVencimientoPP,
    c.probation?.vencimiento,
    ...(c.fechasPrescripcionExtra || []).map((f) => f.fecha),
    ...c.imputados.map((i) => i.fechaVencimientoPena),
  ].filter(Boolean) as string[];
}

function dentroDeDias(fechas: string[], dias: number): boolean {
  const desde = inicioHoy();
  const hasta = desde + dias * 24 * 60 * 60 * 1000;
  return fechas.some((f) => {
    const t = parseLocalTime(f);
    return Number.isFinite(t) && t >= desde && t <= hasta;
  });
}

/* ------------------------- criterios ------------------------- */

const ESTADOS_CAUSA: Record<string, string[]> = {
  "Trámite": ["En trámite", "En juicio"],
  "Recurso": ["Casación", "Queja en Corte", "REX", "Apelación", "TSJ"],
  "Terminada": ["Terminada"],
  "Delegada": ["Delegada"],
};

const SITUACIONES_LIBERTAD = ["Detenido", "Excarcelado", "Rebelde", "SJP"];

const ROLES_ESTUDIO = ["Defensa", "Querella", "Denunciante"];

const criterioLibertad: CriterioEstadistica = {
  id: "situacion_libertad",
  label: "Por situación de libertad",
  tipoValor: "opciones",
  columna: "libertad",
  opciones: () => SITUACIONES_LIBERTAD,
  cumple: (c, valor) => c.imputados.some((i) => norm(i.estadoLibertad || "") === norm(valor)),
};

const criterioVencimientos: CriterioEstadistica = {
  id: "vencimientos_proximos",
  label: "Vencimientos próximos (días)",
  descripcion: "Causas con vencimiento de PP, pena, prescripción o SJP dentro del plazo.",
  tipoValor: "dias",
  columna: "vtoPena",
  etiquetaValor: (v) => `próx. ${v} días`,
  cumple: (c, valor) => {
    const dias = parseInt(valor, 10);
    if (!Number.isFinite(dias) || dias <= 0) return false;
    return dentroDeDias(fechasVencimiento(c), dias);
  },
};

const criterioEventos: CriterioEstadistica = {
  id: "eventos_proximos",
  label: "Eventos próximos (días)",
  descripcion: "Causas con eventos agendados dentro del plazo.",
  tipoValor: "dias",
  columna: "eventosConFecha",
  etiquetaValor: (v) => `próx. ${v} días`,
  cumple: (c, valor, ctx) => {
    const dias = parseInt(valor, 10);
    if (!Number.isFinite(dias) || dias <= 0) return false;
    const ts = ctx.eventosPorCausa?.get(c.id);
    if (!ts || ts.length === 0) return false;
    const desde = inicioHoy();
    const hasta = desde + dias * 24 * 60 * 60 * 1000;
    return ts.some((t) => t >= desde && t <= hasta);
  },
};

export const CRITERIOS_JUDICIAL: CriterioEstadistica[] = [
  {
    id: "estado_causa",
    label: "Por estado de causa",
    tipoValor: "opciones",
    columna: "estado",
    opciones: () => Object.keys(ESTADOS_CAUSA),
    cumple: (c, valor) => {
      const lista = ESTADOS_CAUSA[valor] ?? [valor];
      return lista.some((e) => norm(e) === norm(c.estadoCausa || ""));
    },
  },
  {
    id: "subestado",
    label: "Por subestado de trámite",
    tipoValor: "opciones",
    columna: "subestado",
    opciones: (ctx) => unicos([...(ctx.subestados || []), ...(ctx.causas || []).map((c) => c.subestadoTramite)]),
    cumple: (c, valor) => norm(c.subestadoTramite || "") === norm(valor),
  },
  criterioLibertad,
  criterioVencimientos,
  criterioEventos,
];

export const CRITERIOS_ESTUDIO: CriterioEstadistica[] = [
  {
    id: "fuero",
    label: "Por fuero",
    tipoValor: "opciones",
    opciones: (ctx) => unicos([...(ctx.fueros || []), ...(ctx.causas || []).map((c) => c.fuero)]),
    cumple: (c, valor) => norm(c.fuero || "") === norm(valor),
  },
  {
    id: "estado_procesal",
    label: "Por estado procesal",
    tipoValor: "opciones",
    columna: "estado",
    opciones: (ctx) =>
      unicos([...(ctx.estadosProcesales || []), ...(ctx.causas || []).map((c) => c.estadoProcesal)]),
    cumple: (c, valor) => norm(c.estadoProcesal || "") === norm(valor),
  },
  {
    id: "rol_estudio",
    label: "Por rol del estudio",
    tipoValor: "opciones",
    opciones: () => ROLES_ESTUDIO,
    cumple: (c, valor) => norm(c.rolEstudio || "") === norm(valor),
  },
  criterioLibertad,
  criterioVencimientos,
  criterioEventos,
];

export function criteriosDisponibles(esEstudio: boolean) {
  return esEstudio ? CRITERIOS_ESTUDIO : CRITERIOS_JUDICIAL;
}

export function buscarCriterio(esEstudio: boolean, criterioId: string) {
  return criteriosDisponibles(esEstudio).find((c) => c.id === criterioId) ?? null;
}

export function opcionesCriterio(criterio: CriterioEstadistica | null, ctx: OpcionesCtx): string[] {
  if (!criterio || criterio.tipoValor !== "opciones") return [];
  return criterio.opciones ? criterio.opciones(ctx) : [];
}

/** true si la causa cumple el criterio con el valor guardado. */
export function cumpleEstadistica(
  c: Causa,
  criterio: CriterioEstadistica | null,
  valor: string,
  ctx: EstadisticaCtx = {},
): boolean {
  if (!criterio || !valor) return false;
  return criterio.cumple(c, valor, ctx);
}

/** Texto corto del valor para la tarjeta. */
export function etiquetaValor(criterio: CriterioEstadistica | null, valor: string): string {
  if (!criterio) return valor;
  return criterio.etiquetaValor ? criterio.etiquetaValor(valor) : valor;
}
