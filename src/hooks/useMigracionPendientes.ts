import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MigracionPendiente {
  id: string;
  vocalia_id: string;
  datos_crudos: string;
  razon: string | null;
  archivo_origen: string | null;
  created_at: string;
}

export function useMigracionPendientes(vocaliaId: string | null) {
  const [items, setItems] = useState<MigracionPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setItems([]); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("migracion_pendientes")
      .select("id, vocalia_id, datos_crudos, razon, archivo_origen, created_at")
      .eq("vocalia_id", vocaliaId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems((data ?? []) as MigracionPendiente[]);
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eliminar = useCallback(async (id: string) => {
    const { error } = await supabase.from("migracion_pendientes").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    setItems((arr) => arr.filter((x) => x.id !== id));
    return { ok: true as const };
  }, []);

  return { items, loading, error, refetch: fetchAll, eliminar };
}
