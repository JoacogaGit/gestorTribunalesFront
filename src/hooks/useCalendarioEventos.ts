import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarEvento,
  DbEventoRow,
  DbSujetoFechaRow,
  DbPrescripcionRow,
  mapDbEventoToCalendar,
  mapSujetoFechaToCalendar,
  mapPrescripcionToCalendar,
} from "@/lib/eventoMapper";
import { useEventosChanged } from "@/lib/eventosBus";

const ACTIVOS = ["tramite", "recurso"] as const;
const CAUSA_COLS = "id,expediente_nro,caratula,estado_causa,vocalia_id";

export function useCalendarioEventos(vocaliaId: string | null) {
  const [eventos, setEventos] = useState<CalendarEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setEventos([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [evtRes, ppRes, penaRes, prescRes] = await Promise.all([
        supabase
          .from("eventos")
          .select(`id,titulo,descripcion,fecha_hora,tipo_evento,causa_id,sujeto_id, causas!inner(${CAUSA_COLS},borrado_en)`)
          .not("fecha_hora", "is", null)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId)
          .is("borrado_en", null)
          .is("causas.borrado_en", null),
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,vencimiento_pp, causas!inner(${CAUSA_COLS},borrado_en)`)
          .not("vencimiento_pp", "is", null)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId)
          .is("borrado_en", null)
          .is("causas.borrado_en", null),
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,vencimiento_pena, causas!inner(${CAUSA_COLS},borrado_en)`)
          .not("vencimiento_pena", "is", null)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId)
          .is("borrado_en", null)
          .is("causas.borrado_en", null),
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,prescripcion_fecha, causas!inner(${CAUSA_COLS},borrado_en)`)
          .not("prescripcion_fecha", "is", null)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId)
          .is("borrado_en", null)
          .is("causas.borrado_en", null),
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
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEventosChanged(fetchAll);

  return { eventos, loading, error, refetch: fetchAll };
}
