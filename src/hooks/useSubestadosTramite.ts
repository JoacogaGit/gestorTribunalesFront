import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubestadoTramite {
  id: string;
  vocalia_id: string;
  nombre: string;
  orden: number;
  /** Estado principal al que pertenece el subestado (por defecto, trámite). */
  estado_causa: string;
}

export function useSubestadosTramite(vocaliaId: string | null | undefined) {
  const [subestados, setSubestados] = useState<SubestadoTramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!vocaliaId) { setSubestados([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("subestados_tramite")
      .select("id, vocalia_id, nombre, orden, estado_causa")
      .eq("vocalia_id", vocaliaId)
      .order("orden", { ascending: true });
    if (error) { setError(error.message); setSubestados([]); }
    else setSubestados(((data ?? []) as SubestadoTramite[]).map((s) => ({ ...s, estado_causa: s.estado_causa || "tramite" })));
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { refetch(); }, [refetch]);

  const crear = useCallback(async (nombre: string, estadoCausa: string = "tramite") => {
    if (!vocaliaId || !nombre.trim()) return;
    const { error } = await supabase
      .from("subestados_tramite")
      .insert({ vocalia_id: vocaliaId, nombre: nombre.trim(), orden: subestados.length, estado_causa: estadoCausa } as never);
    if (error) { setError(error.message); return; }
    await refetch();
  }, [vocaliaId, subestados.length, refetch]);

  const renombrar = useCallback(async (id: string, nombre: string) => {
    if (!nombre.trim()) return;
    const { error } = await supabase.from("subestados_tramite").update({ nombre: nombre.trim() }).eq("id", id);
    if (error) { setError(error.message); return; }
    await refetch();
  }, [refetch]);

  const borrar = useCallback(async (id: string) => {
    const { error } = await supabase.from("subestados_tramite").delete().eq("id", id);
    if (error) { setError(error.message); return; }
    await refetch();
  }, [refetch]);

  return { subestados, loading, error, refetch, crear, renombrar, borrar };
}
