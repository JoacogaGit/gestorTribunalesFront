import { Causa } from "@/data/mockCausas";

export interface CampoEstadistica {
  id: string;
  label: string;
  /** Valor(es) de la causa para este campo. */
  valores: (c: Causa) => string[];
  /** Columna de la tabla que sube al 3er lugar al filtrar. */
  columna?: string;
}

const libertadValores = (c: Causa) => c.imputados.map((i) => i.estadoLibertad).filter(Boolean) as string[];

export const CAMPOS_ESTUDIO: CampoEstadistica[] = [
  { id: "fuero", label: "Fuero", valores: (c) => [(c.fuero || "").trim()].filter(Boolean) },
  { id: "rol_estudio", label: "Rol del estudio", valores: (c) => [(c.rolEstudio || "").trim()].filter(Boolean) },
  { id: "estado_procesal", label: "Estado procesal", valores: (c) => [(c.estadoProcesal || "").trim()].filter(Boolean), columna: "estado" },
  { id: "situacion_libertad", label: "Situación de libertad", valores: libertadValores, columna: "libertad" },
];

export const CAMPOS_JUDICIAL: CampoEstadistica[] = [
  { id: "estado_causa", label: "Estado de la causa", valores: (c) => [c.estadoCausa].filter(Boolean) as string[], columna: "estado" },
  { id: "subestado", label: "Subestado de trámite", valores: (c) => [(c.subestadoTramite || "").trim()].filter(Boolean), columna: "subestado" },
  { id: "situacion_libertad", label: "Situación de libertad", valores: libertadValores, columna: "libertad" },
];

export function camposDisponibles(esEstudio: boolean) {
  return esEstudio ? CAMPOS_ESTUDIO : CAMPOS_JUDICIAL;
}

export function buscarCampo(esEstudio: boolean, campoId: string) {
  return camposDisponibles(esEstudio).find((c) => c.id === campoId) ?? null;
}

/** Valores distintos presentes en las causas para un campo dado. */
export function valoresPosibles(causas: Causa[], campo: CampoEstadistica): string[] {
  const set = new Set<string>();
  causas.forEach((c) => campo.valores(c).forEach((v) => v && set.add(v)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

/** true si la causa cumple campo = valor. */
export function cumpleEstadistica(c: Causa, campo: CampoEstadistica | null, valor: string): boolean {
  if (!campo) return false;
  return campo.valores(c).some((v) => v.toLowerCase() === valor.toLowerCase());
}
