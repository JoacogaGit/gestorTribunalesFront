import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEventosChanged } from "@/lib/eventosBus";

export interface DashboardKpis {
  detenidos: number;
  juiciosEsteMes: number;
  ppProximas: number;
  rebeldes: number;
  eventos30d: number;
  totalCausas: number;
}

const ACTIVOS = ["tramite", "recurso"] as const;

function rangoMesActual() {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

function rango30Dias() {
  const hoy = new Date();
  const fin = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { hoyISO: hoy.toISOString(), finISO: fin.toISOString(), hoyDate: hoy.toISOString().slice(0, 10), finDate: fin.toISOString().slice(0, 10) };
}

async function countOrThrow(query: { count: number | null; error: { message: string } | null }) {
  if (query.error) throw new Error(query.error.message);
  return query.count ?? 0;
}

export function useDashboardKpis(vocaliaId: string | null) {
  const [kpis, setKpis] = useState<DashboardKpis>({
    detenidos: 0, juiciosEsteMes: 0, ppProximas: 0, rebeldes: 0, eventos30d: 0, totalCausas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) {
      setKpis({ detenidos: 0, juiciosEsteMes: 0, ppProximas: 0, rebeldes: 0, eventos30d: 0, totalCausas: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { inicio: mesIni, fin: mesFin } = rangoMesActual();
      const { hoyISO, finISO, hoyDate, finDate } = rango30Dias();

      const [detenidos, juicios, pp, rebeldes, evt30, total] = await Promise.all([
        supabase.from("sujetos")
          .select("id, causas!inner(estado_causa,vocalia_id)", { count: "exact", head: true })
          .eq("situacion_libertad", "detenido")
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId),
        supabase.from("eventos")
          .select("id, causas!inner(estado_causa,vocalia_id)", { count: "exact", head: true })
          .in("tipo_evento", ["audiencia", "juicio"])
          .gte("fecha_hora", mesIni)
          .lt("fecha_hora", mesFin)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId),
        supabase.from("sujetos")
          .select("id, causas!inner(estado_causa,vocalia_id)", { count: "exact", head: true })
          .gte("vencimiento_pp", hoyDate)
          .lte("vencimiento_pp", finDate)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId),
        supabase.from("sujetos")
          .select("id, causas!inner(estado_causa,vocalia_id)", { count: "exact", head: true })
          .eq("situacion_libertad", "rebelde")
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId),
        supabase.from("eventos")
          .select("id, causas!inner(estado_causa,vocalia_id)", { count: "exact", head: true })
          .gte("fecha_hora", hoyISO)
          .lte("fecha_hora", finISO)
          .in("causas.estado_causa", ACTIVOS)
          .eq("causas.vocalia_id", vocaliaId),
        supabase.from("causas")
          .select("id", { count: "exact", head: true })
          .in("estado_causa", ACTIVOS)
          .eq("vocalia_id", vocaliaId),
      ]);

      setKpis({
        detenidos: await countOrThrow(detenidos),
        juiciosEsteMes: await countOrThrow(juicios),
        ppProximas: await countOrThrow(pp),
        rebeldes: await countOrThrow(rebeldes),
        eventos30d: await countOrThrow(evt30),
        totalCausas: await countOrThrow(total),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar KPIs");
    } finally {
      setLoading(false);
    }
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { kpis, loading, error, refetch: fetchAll };
}
