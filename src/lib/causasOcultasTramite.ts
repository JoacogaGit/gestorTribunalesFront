import { supabase } from "@/integrations/supabase/client";

export const LISTAS_OCULTAS_TRAMITE = ["Conexidades", "Azules"];

/**
 * Devuelve los ids de causas que pertenecen a las listas personalizadas
 * "Conexidades" o "Azules" de la vocalía. Esas causas se ocultan de
 * "Causas en trámite" y del dashboard.
 */
export async function fetchCausasOcultasDeTramite(vocaliaId: string): Promise<Set<string>> {
  const { data: listas } = await supabase
    .from("listas_personalizadas")
    .select("id")
    .eq("vocalia_id", vocaliaId)
    .in("nombre", LISTAS_OCULTAS_TRAMITE);
  const listaIds = (listas ?? []).map((l) => l.id);
  if (listaIds.length === 0) return new Set();
  const { data: filas } = await supabase
    .from("listas_personalizadas_causas")
    .select("causa_id")
    .in("lista_id", listaIds);
  return new Set((filas ?? []).map((f) => f.causa_id));
}
