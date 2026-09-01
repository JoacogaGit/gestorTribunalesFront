import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";

/** Mapa causaId -> timestamps (ms) de eventos futuros (hasta 1 año), para estadísticas por plazo. */
export function useEventosPorCausa(vocaliaId: string | null) {
  const [eventosPorCausa, setEventosPorCausa] = useState<Map<string, number[]>>(new Map());

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setEventosPorCausa(new Map()); return; }
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const hasta = new Date(hoy.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("eventos")
      .select("causa_id, fecha_hora, causas!inner(vocalia_id,borrado_en)")
      .eq("causas.vocalia_id", vocaliaId)
      .gte("fecha_hora", desde)
      .lte("fecha_hora", hasta)
      .is("borrado_en", null)
      .is("causas.borrado_en", null)
      .limit(5000);
    if (error || !data) return;
    const map = new Map<string, number[]>();
    (data as { causa_id: string; fecha_hora: string | null }[]).forEach((r) => {
      if (!r.fecha_hora) return;
      const t = new Date(r.fecha_hora).getTime();
      if (!Number.isFinite(t)) return;
      const arr = map.get(r.causa_id) ?? [];
      arr.push(t);
      map.set(r.causa_id, arr);
    });
    setEventosPorCausa(map);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEventosChanged(fetchAll);

  return { eventosPorCausa, refetch: fetchAll };
}
