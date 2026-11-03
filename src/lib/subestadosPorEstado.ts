import type { EstadoCausa } from "@/data/mockCausas";

/** Estados principales que admiten subestados (la terminada no). */
export const ESTADOS_CON_SUBESTADOS: { value: string; label: string }[] = [
  { value: "tramite", label: "En trámite" },
  { value: "recurso", label: "Recurso" },
  { value: "para_sentencia", label: "Para sacar sentencia" },
  { value: "para_comunicar", label: "Para comunicar" },
  { value: "delegada", label: "Delegada" },
];

/** Subestados propios del estado Recurso: el tipo de recurso. */
export const TIPOS_RECURSO_MENU: { value: string; label: EstadoCausa }[] = [
  { value: "casacion", label: "Casación" },
  { value: "rex", label: "REX" },
  { value: "queja_corte", label: "Queja en Corte" },
  { value: "apelacion", label: "Apelación" },
  { value: "tsj", label: "TSJ" },
];

const RECURSOS: string[] = ["Casación", "REX", "Queja en Corte", "Apelación", "TSJ"];

/** Estado principal (valor guardado) de una causa a partir de su estado visible. */
export function estadoPrincipalDb(estadoVisible: string): string {
  if (estadoVisible === "En trámite" || estadoVisible === "En juicio") return "tramite";
  if (RECURSOS.includes(estadoVisible)) return "recurso";
  if (estadoVisible === "Para sacar sentencia") return "para_sentencia";
  if (estadoVisible === "Para comunicar") return "para_comunicar";
  if (estadoVisible === "Delegada") return "delegada";
  if (estadoVisible === "Terminada") return "terminada";
  return "tramite";
}

interface SubestadoCatalogo { nombre: string; estado_causa: string }

/**
 * Cambios a guardar al elegir un subestado desde el click derecho.
 * - Si la causa ya está en ese estado: agrega o quita el subestado (se pueden tener varios).
 * - Si está en otro estado: pasa a ese estado y queda solo con los subestados que le corresponden.
 */
export function patchSubestado(
  causa: { estadoCausa: string; subestados?: string[] | null },
  estadoDestino: string,
  subestado: string,
  catalogo: SubestadoCatalogo[],
): { estado_causa?: string; subestados: string[]; delegada?: boolean; tipo_recurso?: null } {
  const actuales = causa.subestados ?? [];
  const mismoEstado = estadoPrincipalDb(causa.estadoCausa) === estadoDestino;
  if (mismoEstado) {
    const subestados = actuales.includes(subestado) ? actuales.filter((s) => s !== subestado) : [...actuales, subestado];
    return { subestados };
  }
  const delDestino = new Set(catalogo.filter((s) => s.estado_causa === estadoDestino).map((s) => s.nombre));
  const conservados = actuales.filter((s) => delDestino.has(s) && s !== subestado);
  return {
    estado_causa: estadoDestino,
    subestados: [...conservados, subestado],
    ...(estadoDestino === "delegada" ? { delegada: true } : {}),
    ...(estadoDestino !== "recurso" ? { tipo_recurso: null } : {}),
  };
}
