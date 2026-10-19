import { supabase } from "@/integrations/supabase/client";

/** Pestañas de causas desde las que una lista personalizada puede ocultar sus causas. */
export type PestanaOcultable =
  | "tramite"
  | "delegadas"
  | "recursos"
  | "para_sentencia"
  | "para_comunicar"
  | "detenidos"
  | "rebeldes"
  | "sjp"
  | "flagrancia"
  | "art196bis"
  | "terminadas";

/** Clave guardada en `oculta_de` para ocultar causas de otra lista personalizada. */
export type ClaveListaOcultable = `lista:${string}`;
export type DestinoOcultable = PestanaOcultable | ClaveListaOcultable;

export const PREFIJO_LISTA = "lista:";

export function claveLista(listaId: string): ClaveListaOcultable {
  return `${PREFIJO_LISTA}${listaId}`;
}

export function esClaveLista(value: string): value is ClaveListaOcultable {
  return value.startsWith(PREFIJO_LISTA) && value.length > PREFIJO_LISTA.length;
}

export const PESTANAS_OCULTABLES: { value: PestanaOcultable; label: string }[] = [
  { value: "tramite", label: "Trámite" },
  { value: "delegadas", label: "Delegadas" },
  { value: "recursos", label: "Recursos" },
  { value: "para_sentencia", label: "Para sacar sentencia" },
  { value: "para_comunicar", label: "Para comunicar" },
  { value: "detenidos", label: "Detenidos" },
  { value: "rebeldes", label: "Rebeldes" },
  { value: "sjp", label: "SJP" },
  { value: "flagrancia", label: "Flagrancia" },
  { value: "art196bis", label: "196bis/NN" },
  { value: "terminadas", label: "Terminadas" },
];

export function etiquetaPestana(value: string): string {
  return PESTANAS_OCULTABLES.find((p) => p.value === value)?.label ?? value;
}

/**
 * Ids de causas que pertenecen a alguna lista personalizada de la vocalía
 * cuyo campo `oculta_de` incluye la pestaña (o lista) indicada.
 * `excluirListaId` evita que una lista se oculte sus propias causas.
 */
export async function fetchCausasOcultasDe(
  vocaliaId: string,
  destino: DestinoOcultable,
  excluirListaId?: string,
): Promise<Set<string>> {
  const vacio = new Set<string>();
  if (!vocaliaId) return vacio;
  try {
    const { data: listas, error } = await supabase
      .from("listas_personalizadas")
      .select("id, oculta_de")
      .eq("vocalia_id", vocaliaId)
      .contains("oculta_de", [destino]);
    if (error) return vacio;
    const listaIds = (listas ?? [])
      .filter((l) => Array.isArray(l?.oculta_de) && l.oculta_de.includes(destino))
      .map((l) => l.id)
      .filter((id) => Boolean(id) && id !== excluirListaId);
    if (listaIds.length === 0) return vacio;
    const { data: filas, error: e2 } = await supabase
      .from("listas_personalizadas_causas")
      .select("causa_id")
      .in("lista_id", listaIds);
    if (e2) return vacio;
    return new Set((filas ?? []).map((f) => f.causa_id).filter(Boolean) as string[]);
  } catch {
    // Nunca romper la carga de causas por la configuración de listas.
    return vacio;
  }
}
