import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";

/** IDs de causas con al menos un evento (tabla eventos) dentro de los próximos 30 días. */
export function useEventosProximos30d(vocaliaId: string | null) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setIds(new Set()); return; }
    setLoading(true);
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const hasta = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("eventos")
      .select("causa_id, fecha_hora, causas!inner(vocalia_id,borrado_en)")
      .eq("causas.vocalia_id", vocaliaId)
      .gte("fecha_hora", desde)
      .lte("fecha_hora", hasta)
      .is("borrado_en", null)
      .is("causas.borrado_en", null);
    if (!error && data) {
      setIds(new Set((data as { causa_id: string }[]).map((r) => r.causa_id)));
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEventosChanged(fetchAll);

  return { ids, loading, refetch: fetchAll };
}
