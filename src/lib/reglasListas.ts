/**
 * Listas que dependen de la situación del imputado (Detenidos, Rebeldes, SJP):
 * una causa aparece si tiene al menos un imputado vigente en esa situación,
 * sin importar su estado (trámite, recurso, para sacar sentencia, para comunicar…).
 * Solo las causas terminadas quedan afuera.
 */
export interface SujetoSituacion {
  situacion_libertad: string;
  borrado_en?: string | null;
}

export function apareceEnListaPorSituacion(
  estadoCausa: string,
  sujetos: SujetoSituacion[] | null | undefined,
  situacion: string | readonly string[],
): boolean {
  if (estadoCausa === "terminada") return false;
  const buscadas = typeof situacion === "string" ? [situacion] : situacion;
  return (sujetos ?? []).some((s) => s.borrado_en == null && buscadas.includes(s.situacion_libertad));
}

/** La lista Delegadas muestra solo las causas cuyo estado actual es "delegada". */
export function apareceEnDelegadas(estadoCausa: string): boolean {
  return estadoCausa === "delegada";
}

/** Causa que fue delegada y luego terminó: conserva la marca y sale de Delegadas. */
export function esDelegadaQueTermino(c: { estado_causa: string; delegada?: boolean | null }): boolean {
  return c.estado_causa === "terminada" && !!c.delegada;
}

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export const ESTADO_PROCESAL_FALTA_MERITO = "Falta de mérito";

/** true si el estado procesal es "Falta de mérito" (sin importar mayúsculas ni acentos). */
export function esFaltaDeMerito(estadoProcesal: string | null | undefined): boolean {
  return sinAcentos(estadoProcesal ?? "") === "falta de merito";
}

/** Traduce el estado elegido en el menú de la lista a los campos que se guardan. */
export function patchEstadoDesdeMenu(estado: string): Record<string, unknown> | null {
  switch (estado) {
    case "En trámite":
    case "En juicio":
      return { estado_causa: "tramite", tipo_recurso: null };
    case "Delegada":
      // El estado manda la lista; la marca queda para siempre (aunque después termine).
      return { estado_causa: "delegada", delegada: true, tipo_recurso: null };
    case "Terminada":
      return { estado_causa: "terminada", tipo_recurso: null };
    case "Para sacar sentencia":
      return { estado_causa: "para_sentencia", tipo_recurso: null };
    case "Para comunicar":
      return { estado_causa: "para_comunicar", tipo_recurso: null };
    case "Casación": return { estado_causa: "recurso", tipo_recurso: "casacion" };
    case "REX": return { estado_causa: "recurso", tipo_recurso: "rex" };
    case "Queja en Corte": return { estado_causa: "recurso", tipo_recurso: "queja_corte" };
    case "Apelación": return { estado_causa: "recurso", tipo_recurso: "apelacion" };
    case "TSJ": return { estado_causa: "recurso", tipo_recurso: "tsj" };
    default: return null;
  }
}
