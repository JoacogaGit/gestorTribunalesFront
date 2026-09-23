import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ListaPersonalizada {
  id: string;
  vocalia_id: string;
  nombre: string;
  created_at: string;
  oculta_de: string[];
  count: number;
}

export function useListasPersonalizadas(vocaliaId: string | null) {
  const [listas, setListas] = useState<ListaPersonalizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vocaliaId) {
      setListas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("listas_personalizadas")
      .select("id, vocalia_id, nombre, created_at, oculta_de, listas_personalizadas_causas(causa_id)")
      .eq("vocalia_id", vocaliaId)
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      setListas([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setListas(((data ?? []) as any[]).map((r) => ({
        id: r.id,
        vocalia_id: r.vocalia_id,
        nombre: r.nombre,
        created_at: r.created_at,
        oculta_de: Array.isArray(r.oculta_de) ? (r.oculta_de as string[]) : [],
        count: (r.listas_personalizadas_causas ?? []).length,
      })));
    }

    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const crearLista = useCallback(async (nombre: string, ocultaDe: string[] = []) => {
    if (!vocaliaId) throw new Error("Sin espacio");
    const { data, error } = await supabase.rpc("crear_lista_personalizada", {
      p_vocalia_id: vocaliaId,
      p_nombre: nombre,
    });
    if (error) throw error;
    const nuevaId = data as string;
    if (ocultaDe.length > 0 && nuevaId) {
      const { error: e2 } = await supabase
        .from("listas_personalizadas")
        .update({ oculta_de: ocultaDe })
        .eq("id", nuevaId);
      if (e2) throw e2;
    }
    await fetchData();
    return nuevaId;
  }, [vocaliaId, fetchData]);

  const actualizarOcultaDe = useCallback(async (listaId: string, ocultaDe: string[]) => {
    const { error } = await supabase
      .from("listas_personalizadas")
      .update({ oculta_de: ocultaDe })
      .eq("id", listaId);
    if (error) throw error;
    await fetchData();
  }, [fetchData]);

  const borrarLista = useCallback(async (listaId: string) => {
    const { error } = await supabase.from("listas_personalizadas").delete().eq("id", listaId);
    if (error) throw error;
    await fetchData();
  }, [fetchData]);

  return { listas, loading, error, refetch: fetchData, crearLista, borrarLista, actualizarOcultaDe };
}
