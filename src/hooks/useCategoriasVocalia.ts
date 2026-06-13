import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEventosChanged } from "@/lib/eventosBus";

export interface CategoriaVocalia {
  id: string;
  vocalia_id: string;
  nombre_categoria: string;
  creado_por: string | null;
  created_at: string | null;
}

export function useCategoriasVocalia(vocaliaId: string | null | undefined) {
  const [categorias, setCategorias] = useState<CategoriaVocalia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setCategorias([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase
      .from("categorias_personalizadas")
      .select("id, vocalia_id, nombre_categoria, creado_por, created_at")
      .eq("vocalia_id", vocaliaId)
      .order("created_at", { ascending: true });
    if (e) { setError(e.message); setCategorias([]); }
    else setCategorias((data ?? []) as CategoriaVocalia[]);
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const crear = useCallback(async (nombre: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    if (!vocaliaId) return { ok: false, error: "Sin vocalía" };
    const { data, error: e } = await supabase.rpc("crear_categoria_con_eventos", {
      p_vocalia_id: vocaliaId,
      p_nombre: nombre,
    });
    if (e) return { ok: false, error: e.message };
    await fetchAll();
    emitEventosChanged();
    return { ok: true, id: data as string };
  }, [vocaliaId, fetchAll]);

  const borrar = useCallback(async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { error: e } = await supabase.from("categorias_personalizadas").delete().eq("id", id);
    if (e) return { ok: false, error: e.message };
    await fetchAll();
    emitEventosChanged();
    return { ok: true };
  }, [fetchAll]);

  const contarUso = useCallback(async (categoriaId: string): Promise<{ eventos: number; causas: number }> => {
    const { data } = await supabase
      .from("eventos")
      .select("causa_id")
      .eq("categoria_personalizada_id", categoriaId)
      .is("borrado_en", null);
    const rows = (data ?? []) as { causa_id: string }[];
    return { eventos: rows.length, causas: new Set(rows.map((r) => r.causa_id)).size };
  }, []);

  return { categorias, loading, error, refetch: fetchAll, crear, borrar, contarUso };
}

/** Devuelve el Set de causa_ids que tienen al menos una entrada en la categoría dada. */
export function useCausasConCategoria(categoriaId: string | null) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!categoriaId) { setIds(new Set()); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("eventos")
        .select("causa_id")
        .eq("categoria_personalizada_id", categoriaId)
        .is("borrado_en", null);
      if (cancelled) return;
      setIds(new Set(((data ?? []) as { causa_id: string }[]).map((r) => r.causa_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [categoriaId]);

  return { ids, loading };
}
