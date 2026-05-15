import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";

export interface AnotacionResumen {
  proxima: { id: string; titulo: string; fecha_hora: string };
  total: number;
}

export function useProximasAnotacionesPorCausa(causaIds: string[]) {
  const [map, setMap] = useState<Map<string, AnotacionResumen>>(new Map());
  const [loading, setLoading] = useState(false);

  // Stable key para no re-fetchear en cada render.
  const idsKey = useMemo(() => [...new Set(causaIds)].sort().join(","), [causaIds]);

  const fetchAll = useCallback(async () => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) { setMap(new Map()); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("eventos")
      .select("id, causa_id, titulo, fecha_hora")
      .in("causa_id", ids)
      .not("fecha_hora", "is", null);
    if (error || !data) { setLoading(false); return; }

    const now = Date.now();
    const grouped = new Map<string, { id: string; titulo: string; fecha_hora: string }[]>();
    for (const r of data) {
      if (!r.fecha_hora) continue;
      const arr = grouped.get(r.causa_id) ?? [];
      arr.push({ id: r.id, titulo: r.titulo, fecha_hora: r.fecha_hora });
      grouped.set(r.causa_id, arr);
    }

    const out = new Map<string, AnotacionResumen>();
    grouped.forEach((arr, causaId) => {
      const futuras = arr
        .filter((e) => new Date(e.fecha_hora).getTime() >= now)
        .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
      const pasadas = arr
        .filter((e) => new Date(e.fecha_hora).getTime() < now)
        .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());
      const proxima = futuras[0] ?? pasadas[0];
      if (proxima) out.set(causaId, { proxima, total: arr.length });
    });
    setMap(out);
    setLoading(false);
  }, [idsKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEventosChanged(fetchAll);

  return { map, loading, refetch: fetchAll };
}
