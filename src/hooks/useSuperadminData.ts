import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TribunalGlobalRow {
  id: string;
  nombre: string;
  codigo_acceso: string | null;
  created_at: string | null;
  vocalias_count: number;
  miembros_count: number;
  causas_count: number;
}

/**
 * Lista global de tribunales con stats agregadas. Pensado para uso del superadmin
 * (depende del bypass es_superadmin() en RLS para ver todo).
 */
export function useTribunalesGlobal() {
  const [data, setData] = useState<TribunalGlobalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, vRes, mRes, cRes] = await Promise.all([
        supabase.from("tribunales").select("id, nombre, codigo_acceso, created_at").order("nombre"),
        supabase.from("vocalias").select("id, tribunal_id"),
        supabase.from("miembros_tribunal").select("tribunal_id"),
        supabase.from("causas").select("id, vocalia_id").is("borrado_en", null),
      ]);
      if (tRes.error) throw tRes.error;
      if (vRes.error) throw vRes.error;
      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;

      const vocaliasPorTribunal = new Map<string, number>();
      const vocaliaToTribunal = new Map<string, string>();
      (vRes.data ?? []).forEach((v) => {
        vocaliasPorTribunal.set(v.tribunal_id, (vocaliasPorTribunal.get(v.tribunal_id) ?? 0) + 1);
        vocaliaToTribunal.set(v.id, v.tribunal_id);
      });

      const miembrosPorTribunal = new Map<string, number>();
      (mRes.data ?? []).forEach((m) => {
        miembrosPorTribunal.set(m.tribunal_id, (miembrosPorTribunal.get(m.tribunal_id) ?? 0) + 1);
      });

      const causasPorTribunal = new Map<string, number>();
      (cRes.data ?? []).forEach((c) => {
        const tid = vocaliaToTribunal.get(c.vocalia_id);
        if (!tid) return;
        causasPorTribunal.set(tid, (causasPorTribunal.get(tid) ?? 0) + 1);
      });

      const rows: TribunalGlobalRow[] = (tRes.data ?? []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        codigo_acceso: t.codigo_acceso,
        created_at: t.created_at,
        vocalias_count: vocaliasPorTribunal.get(t.id) ?? 0,
        miembros_count: miembrosPorTribunal.get(t.id) ?? 0,
        causas_count: causasPorTribunal.get(t.id) ?? 0,
      }));
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export interface TribunalDetalle {
  tribunal: { id: string; nombre: string; codigo_acceso: string | null; created_at: string | null };
  vocalias: Array<{ id: string; nombre: string; causas_count: number; eventos_proximos: number }>;
  miembros: Array<{ id: string; usuario_id: string; rol: string; nombre: string | null; email: string | null }>;
}

export function useTribunalDetalleSuperadmin(tribunalId: string | undefined) {
  const [data, setData] = useState<TribunalDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!tribunalId) return;
    setLoading(true);
    setError(null);
    try {
      const ahora = new Date().toISOString();
      const en30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const [tRes, vRes, mRes] = await Promise.all([
        supabase.from("tribunales").select("id, nombre, codigo_acceso, created_at").eq("id", tribunalId).maybeSingle(),
        supabase.from("vocalias").select("id, nombre").eq("tribunal_id", tribunalId).order("nombre"),
        supabase.from("miembros_tribunal").select("id, usuario_id, rol").eq("tribunal_id", tribunalId),
      ]);
      if (tRes.error) throw tRes.error;
      if (vRes.error) throw vRes.error;
      if (mRes.error) throw mRes.error;
      if (!tRes.data) throw new Error("Tribunal no encontrado");

      const vocaliaIds = (vRes.data ?? []).map((v) => v.id);
      const [causasRes, eventosRes, perfilesRes] = await Promise.all([
        vocaliaIds.length
          ? supabase.from("causas").select("id, vocalia_id").in("vocalia_id", vocaliaIds).is("borrado_en", null)
          : Promise.resolve({ data: [], error: null } as const),
        vocaliaIds.length
          ? supabase
              .from("eventos")
              .select("id, causa_id, fecha_hora, causas!inner(vocalia_id)")
              .in("causas.vocalia_id", vocaliaIds)
              .gte("fecha_hora", ahora)
              .lte("fecha_hora", en30)
              .is("borrado_en", null)
          : Promise.resolve({ data: [], error: null } as const),
        (mRes.data ?? []).length
          ? supabase.from("perfiles").select("id, nombre_completo, email").in("id", (mRes.data ?? []).map((m) => m.usuario_id))
          : Promise.resolve({ data: [], error: null } as const),
      ]);
      if (causasRes.error) throw causasRes.error;
      if (eventosRes.error) throw eventosRes.error;
      if (perfilesRes.error) throw perfilesRes.error;

      const causasPorVocalia = new Map<string, number>();
      const causaToVocalia = new Map<string, string>();
      (causasRes.data ?? []).forEach((c) => {
        causasPorVocalia.set(c.vocalia_id, (causasPorVocalia.get(c.vocalia_id) ?? 0) + 1);
        causaToVocalia.set(c.id, c.vocalia_id);
      });

      const eventosPorVocalia = new Map<string, number>();
      (eventosRes.data ?? []).forEach((e: { causa_id: string }) => {
        const vId = causaToVocalia.get(e.causa_id);
        if (!vId) return;
        eventosPorVocalia.set(vId, (eventosPorVocalia.get(vId) ?? 0) + 1);
      });

      const perfilesMap = new Map<string, { nombre: string | null; email: string | null }>();
      (perfilesRes.data ?? []).forEach((p) => perfilesMap.set(p.id, { nombre: p.nombre_completo, email: p.email }));

      setData({
        tribunal: tRes.data,
        vocalias: (vRes.data ?? []).map((v) => ({
          id: v.id,
          nombre: v.nombre,
          causas_count: causasPorVocalia.get(v.id) ?? 0,
          eventos_proximos: eventosPorVocalia.get(v.id) ?? 0,
        })),
        miembros: (mRes.data ?? []).map((m) => ({
          id: m.id,
          usuario_id: m.usuario_id,
          rol: m.rol ?? "miembro",
          nombre: perfilesMap.get(m.usuario_id)?.nombre ?? null,
          email: perfilesMap.get(m.usuario_id)?.email ?? null,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [tribunalId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
