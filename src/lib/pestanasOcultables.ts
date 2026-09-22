import { supabase } from "@/integrations/supabase/client";

/** Pestañas de causas desde las que una lista personalizada puede ocultar sus causas. */
export type PestanaOcultable =
  | "tramite"
  | "delegadas"
  | "recursos"
  | "detenidos"
  | "rebeldes"
  | "sjp"
  | "flagrancia"
  | "art196bis"
  | "terminadas";

export const PESTANAS_OCULTABLES: { value: PestanaOcultable; label: string }[] = [
  { value: "tramite", label: "Trámite" },
  { value: "delegadas", label: "Delegadas" },
  { value: "recursos", label: "Recursos" },
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
 * cuyo campo `oculta_de` incluye la pestaña indicada.
 */
export async function fetchCausasOcultasDe(
  vocaliaId: string,
  pestana: PestanaOcultable,
): Promise<Set<string>> {
  const { data: listas } = await supabase
    .from("listas_personalizadas")
    .select("id, oculta_de")
    .eq("vocalia_id", vocaliaId)
    .contains("oculta_de", [pestana]);
  const listaIds = (listas ?? []).map((l) => l.id);
  if (listaIds.length === 0) return new Set();
  const { data: filas } = await supabase
    .from("listas_personalizadas_causas")
    .select("causa_id")
    .in("lista_id", listaIds);
  return new Set((filas ?? []).map((f) => f.causa_id));
}
