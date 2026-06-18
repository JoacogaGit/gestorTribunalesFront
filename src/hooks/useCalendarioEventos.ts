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
import { calcularPpEfectivo } from "@/lib/vencimientoPp";
import { useEventosChanged } from "@/lib/eventosBus";
import { parseLocalTime } from "@/lib/parseDate";

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
      const [evtRes, ppRes, penaRes, prescRes, prescMultiRes] = await Promise.all([
        supabase
          .from("eventos")
          .select(`id,titulo,descripcion,fecha_hora,tipo_evento,causa_id,sujeto_id, causas!inner(${CAUSA_COLS},borrado_en)`)
          .not("fecha_hora", "is", null)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId)
          .is("borrado_en", null)
          .is("causas.borrado_en", null),
        // PP: traemos los 3 campos para poder calcular el efectivo (manual o calculado).
        supabase
          .from("sujetos")
          .select(`id,nombre_completo,causa_id,vencimiento_pp,vencimiento_pena,fecha_detencion, causas!inner(${CAUSA_COLS},borrado_en)`)
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
        supabase
          .from("prescripciones")
          .select(`id,fecha,descripcion,sujeto_id, sujetos!inner(id,nombre_completo,causa_id, causas!inner(${CAUSA_COLS},borrado_en))`)
          .in("sujetos.causas.estado_causa", ACTIVOS)
          .eq("sujetos.causas.vocalia_id", vocaliaId)
          .is("sujetos.borrado_en", null)
          .is("sujetos.causas.borrado_en", null),
      ]);

      const firstErr = [evtRes, ppRes, penaRes, prescRes, prescMultiRes].find((r) => r.error)?.error;
      if (firstErr) throw new Error(firstErr.message);

      // Para cada sujeto, calcular el PP efectivo y armar la row de calendario manualmente.
      type PpRow = {
        id: string;
        nombre_completo: string;
        causa_id: string;
        vencimiento_pp: string | null;
        vencimiento_pena: string | null;
        fecha_detencion: string | null;
        causas: DbSujetoFechaRow["causas"];
      };
      const ppEventos: CalendarEvento[] = [];
      for (const row of (ppRes.data ?? []) as unknown as PpRow[]) {
        const ef = calcularPpEfectivo(row);
        if (!ef.fecha) continue;
        const mapped = mapSujetoFechaToCalendar(
          { id: row.id, nombre_completo: row.nombre_completo, causa_id: row.causa_id, vencimiento_pp: ef.fecha, causas: row.causas },
          "vencimiento_pp",
          "vencimiento_pp",
          ef.calculado ? "Vence PP (calc.)" : "Vence PP",
        );
        if (mapped) ppEventos.push(mapped);
      }

      const merged: CalendarEvento[] = [
        ...((evtRes.data ?? []) as unknown as DbEventoRow[]).map(mapDbEventoToCalendar),
        ...ppEventos,
        ...((penaRes.data ?? []) as unknown as DbSujetoFechaRow[]).map((r) =>
          mapSujetoFechaToCalendar(r, "vencimiento_pena", "vencimiento_pena", "Vence Pena")),
        ...((prescRes.data ?? []) as unknown as DbSujetoFechaRow[]).map((r) =>
          mapSujetoFechaToCalendar(r, "prescripcion_fecha", "prescripcion", "Prescripción")),
        ...((prescMultiRes.data ?? []) as unknown as DbPrescripcionRow[]).map(mapPrescripcionToCalendar),
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

