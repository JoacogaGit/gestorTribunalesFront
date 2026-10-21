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
  situacion: string,
): boolean {
  if (estadoCausa === "terminada") return false;
  return (sujetos ?? []).some((s) => s.borrado_en == null && s.situacion_libertad === situacion);
}

/** Traduce el estado elegido en el menú de la lista a los campos que se guardan. */
export function patchEstadoDesdeMenu(estado: string): Record<string, unknown> | null {
  switch (estado) {
    case "En trámite":
    case "En juicio":
      return { estado_causa: "tramite", tipo_recurso: null };
    case "Delegada":
      return { delegada: true };
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
