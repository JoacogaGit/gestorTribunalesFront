import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";

export interface EventoCausa {
  id: string;
  causa_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  tipo_evento: string | null;
  completado: boolean | null;
  created_at: string | null;
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
      .select("id, causa_id, titulo, descripcion, fecha_hora, tipo_evento, completado, created_at")
      .eq("causa_id", causaId);
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

  const conFecha = eventos
    .filter((e) => !!e.fecha_hora)
    .sort((a, b) => new Date(a.fecha_hora!).getTime() - new Date(b.fecha_hora!).getTime());
  const sinFecha = eventos
    .filter((e) => !e.fecha_hora)
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  return { eventos, conFecha, sinFecha, loading, error, refetch: fetchAll };
}
