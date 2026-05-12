import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarEvento,
  DbEventoRow,
  DbSujetoFechaRow,
  mapDbEventoToCalendar,
  mapSujetoFechaToCalendar,
} from "@/lib/eventoMapper";

const ACTIVOS = ["tramite", "recurso"];
const CAUSA_COLS = "id,expediente_nro,caratula,estado_causa";

export function useCalendarioEventos() {
  const [eventos, setEventos] = useState<CalendarEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evtRes, ppRes, penaRes, prescRes] = await Promise.all([
        supabase
          .from("eventos")
          .select(`id,titulo,descripcion,fecha_hora,tipo_evento,causa_id,sujeto_id, causas!inner(${CAUSA_COLS})`)
          .not("fecha_hora", "is", null)
          .in("causas.estado_causa", ACTIVOS),
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,vencimiento_pp, causas!inner(${CAUSA_COLS})`)
          .not("vencimiento_pp", "is", null)
          .in("causas.estado_causa", ACTIVOS),
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,vencimiento_pena, causas!inner(${CAUSA_COLS})`)
          .not("vencimiento_pena", "is", null)
          .in("causas.estado_causa", ACTIVOS),
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,prescripcion_fecha, causas!inner(${CAUSA_COLS})`)
          .not("prescripcion_fecha", "is", null)
          .in("causas.estado_causa", ACTIVOS),
      ]);

      const firstErr = [evtRes, ppRes, penaRes, prescRes].find((r) => r.error)?.error;
      if (firstErr) throw new Error(firstErr.message);

      const merged: CalendarEvento[] = [
        ...((evtRes.data ?? []) as unknown as DbEventoRow[]).map(mapDbEventoToCalendar),
        ...((ppRes.data ?? []) as unknown as DbSujetoFechaRow[]).map((r) =>
          mapSujetoFechaToCalendar(r, "vencimiento_pp", "vencimiento_pp", "Vence PP")),
        ...((penaRes.data ?? []) as unknown as DbSujetoFechaRow[]).map((r) =>
          mapSujetoFechaToCalendar(r, "vencimiento_pena", "vencimiento_pena", "Vence Pena")),
        ...((prescRes.data ?? []) as unknown as DbSujetoFechaRow[]).map((r) =>
          mapSujetoFechaToCalendar(r, "prescripcion_fecha", "prescripcion", "Prescripción")),
      ].filter((e): e is CalendarEvento => e !== null)
       .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      setEventos(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el calendario");
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { eventos, loading, error, refetch: fetchAll };
}
