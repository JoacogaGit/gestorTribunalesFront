import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI } from "@/lib/causaMapper";

export function useCausasDeLista(listaId: string | null) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!listaId) { setCausas([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("listas_personalizadas_causas")
      .select("causa_id, causas!inner(*, sujetos(*))")
      .eq("lista_id", listaId);
    if (error) {
      setError(error.message);
      setCausas([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data as any[])
        .map((r) => r.causas)
        .filter((c) => c && c.borrado_en == null)
        .map((c) => ({
          ...c,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sujetos: ((c.sujetos as any[]) || []).filter((s) => s.borrado_en == null),
        }));
      setCausas(rows.map(dbCausaToUI));
    }
    setLoading(false);
  }, [listaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const agregarCausa = useCallback(async (causaId: string) => {
    if (!listaId) throw new Error("Sin lista");
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("listas_personalizadas_causas")
      .insert({ lista_id: listaId, causa_id: causaId, agregado_por: userData.user?.id ?? null });
    if (error) throw error;
    await fetchData();
  }, [listaId, fetchData]);

  const sacarCausa = useCallback(async (causaId: string) => {
    if (!listaId) throw new Error("Sin lista");
    const { error } = await supabase
      .from("listas_personalizadas_causas")
      .delete()
      .eq("lista_id", listaId)
      .eq("causa_id", causaId);
    if (error) throw error;
    await fetchData();
  }, [listaId, fetchData]);

  return { causas, loading, error, refetch: fetchData, agregarCausa, sacarCausa };
}
