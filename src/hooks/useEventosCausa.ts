import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";
import { parseLocalTime } from "@/lib/parseDate";

export interface EventoCausa {
  id: string;
  causa_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  tipo_evento: string | null;
  completado: boolean | null;
  created_at: string | null;
  categoria_personalizada_id: string | null;
}

/** Anotaciones con fecha de una causa, la más reciente arriba. */
export function ordenarAnotacionesConFecha<T extends { fecha_hora: string | null }>(eventos: T[]): T[] {
  return eventos
    .filter((e) => !!e.fecha_hora && parseLocalTime(e.fecha_hora) !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => parseLocalTime(b.fecha_hora) - parseLocalTime(a.fecha_hora));
}

export function useEventosCausa(causaId: string | null | undefined) {
  const [eventos, setEventos] = useState<EventoCausa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!causaId) { setEventos([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase
      .from("eventos")
      .select("id, causa_id, titulo, descripcion, fecha_hora, tipo_evento, completado, created_at, categoria_personalizada_id")
      .eq("causa_id", causaId)
      .is("borrado_en", null);
    if (e) {
      setError(e.message);
      setEventos([]);
    } else {
      setEventos((data ?? []) as EventoCausa[]);
    }
    setLoading(false);
  }, [causaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEventosChanged(fetchAll);

  const conFecha = ordenarAnotacionesConFecha(eventos);
  // Sin fecha (o con fecha ilegible) van al final.
  const sinFecha = eventos
    .filter((e) => !e.fecha_hora || parseLocalTime(e.fecha_hora) === Number.MAX_SAFE_INTEGER)
    .sort((a, b) => (new Date(b.created_at ?? 0).getTime() || 0) - (new Date(a.created_at ?? 0).getTime() || 0));

  return { eventos, conFecha, sinFecha, loading, error, refetch: fetchAll };
}
