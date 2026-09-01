import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EstadisticaCustom {
  id: string;
  vocalia_id: string;
  nombre: string;
  campo: string;
  valor: string;
  color: string | null;
}

/** Estadísticas personalizadas del espacio (compartidas por todos los miembros). */
export function useEstadisticasCustom(vocaliaId: string | null) {
  const [estadisticas, setEstadisticas] = useState<EstadisticaCustom[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setEstadisticas([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("estadisticas_custom")
      .select("id,vocalia_id,nombre,campo,valor,color")
      .eq("vocalia_id", vocaliaId)
      .order("created_at", { ascending: true });
    if (!error && data) setEstadisticas(data as EstadisticaCustom[]);
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const crear = useCallback(async (input: { nombre: string; campo: string; valor: string; color: string | null }) => {
    if (!vocaliaId) return { error: "Sin espacio activo" };
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("estadisticas_custom").insert({
      vocalia_id: vocaliaId,
      nombre: input.nombre,
      campo: input.campo,
      valor: input.valor,
      color: input.color,
      creado_por: userRes.user?.id ?? null,
    });
    if (error) return { error: error.message };
    await fetchAll();
    return {};
  }, [vocaliaId, fetchAll]);

  const eliminar = useCallback(async (id: string) => {
    const { error } = await supabase.from("estadisticas_custom").delete().eq("id", id);
    if (error) return { error: error.message };
    setEstadisticas((prev) => prev.filter((e) => e.id !== id));
    return {};
  }, []);

  return { estadisticas, loading, refetch: fetchAll, crear, eliminar };
}
