import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";
import { parseLocalTime } from "@/lib/parseDate";

export interface AnotacionResumen {
  proximaConFecha?: { id: string; titulo: string; fecha_hora: string };
  totalConFecha: number;
  proximaSinFecha?: { id: string; titulo: string; created_at: string };
  totalSinFecha: number;
}

export function useProximasAnotacionesPorCausa(causaIds: string[]) {
  const [map, setMap] = useState<Map<string, AnotacionResumen>>(new Map());
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(() => [...new Set(causaIds)].sort().join(","), [causaIds]);

  const fetchAll = useCallback(async () => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) { setMap(new Map()); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("eventos")
      .select("id, causa_id, titulo, fecha_hora, created_at")
      .in("causa_id", ids)
      .is("borrado_en", null);
    if (error || !data) { setLoading(false); return; }

    const now = Date.now();
    const conFecha = new Map<string, { id: string; titulo: string; fecha_hora: string }[]>();
    const sinFecha = new Map<string, { id: string; titulo: string; created_at: string }[]>();

    for (const r of data) {
      if (r.fecha_hora) {
        const arr = conFecha.get(r.causa_id) ?? [];
        arr.push({ id: r.id, titulo: r.titulo, fecha_hora: r.fecha_hora });
        conFecha.set(r.causa_id, arr);
      } else {
        const arr = sinFecha.get(r.causa_id) ?? [];
        arr.push({ id: r.id, titulo: r.titulo, created_at: r.created_at ?? new Date().toISOString() });
        sinFecha.set(r.causa_id, arr);
      }
    }

    const out = new Map<string, AnotacionResumen>();
    const allCausas = new Set<string>([...conFecha.keys(), ...sinFecha.keys()]);
    allCausas.forEach((causaId) => {
      const cf = conFecha.get(causaId) ?? [];
      const futuras = cf
        .filter((e) => parseLocalTime(e.fecha_hora) >= now)
        .sort((a, b) => parseLocalTime(a.fecha_hora) - parseLocalTime(b.fecha_hora));
      const pasadas = cf
        .filter((e) => parseLocalTime(e.fecha_hora) < now)
        .sort((a, b) => parseLocalTime(b.fecha_hora) - parseLocalTime(a.fecha_hora));
      const proximaConFecha = futuras[0] ?? pasadas[0];

      const sf = (sinFecha.get(causaId) ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const proximaSinFecha = sf[0];

      out.set(causaId, {
        proximaConFecha,
        totalConFecha: cf.length,
        proximaSinFecha,
        totalSinFecha: sf.length,
      });
    });
    setMap(out);
    setLoading(false);
  }, [idsKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEventosChanged(fetchAll);

  return { map, loading, refetch: fetchAll };
}
