import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Metrica {
  id: string;
  vocalia_id: string;
  nombre: string;
  unidad: string | null;
  origen: string;
  auto_fuente: string | null;
  color: string | null;
  orden: number | null;
  tipo_conteo: "conteo" | "suma";
}

export interface MetricaDato {
  id: string;
  metrica_id: string;
  vocalia_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  valor: number;
  causa_id: string | null;
  nota: string | null;
  causa?: { id: string; expediente_nro: string; caratula: string | null } | null;
}

export interface MetricaInput {
  nombre: string;
  unidad: string | null;
  color: string | null;
  tipo_conteo: "conteo" | "suma";
}

export interface DatoInput {
  metrica_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  valor: number;
  causa_id: string | null;
  nota: string | null;
}

export function useMetricas(vocaliaId: string | null) {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [datos, setDatos] = useState<MetricaDato[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setMetricas([]); setDatos([]); return; }
    setLoading(true);
    const [{ data: m }, { data: d }] = await Promise.all([
      supabase
        .from("metricas")
        .select("id,vocalia_id,nombre,unidad,origen,auto_fuente,color,orden,tipo_conteo")
        .eq("vocalia_id", vocaliaId)
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("metricas_datos")
        .select("id,metrica_id,vocalia_id,periodo_inicio,periodo_fin,valor,causa_id,nota, causa:causas(id,expediente_nro,caratula)")
        .eq("vocalia_id", vocaliaId)
        .order("periodo_inicio", { ascending: false }),
    ]);
    setMetricas((m ?? []) as Metrica[]);
    setDatos((d ?? []) as unknown as MetricaDato[]);
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const crearMetrica = useCallback(async (input: MetricaInput) => {
    if (!vocaliaId) return { error: "Sin espacio activo" };
    const { error } = await supabase.from("metricas").insert({
      vocalia_id: vocaliaId,
      nombre: input.nombre,
      unidad: input.unidad,
      color: input.color,
      tipo_conteo: input.tipo_conteo,
      origen: "manual",
      orden: metricas.length,
    });
    if (error) return { error: error.message };
    await fetchAll();
    return {};
  }, [vocaliaId, metricas.length, fetchAll]);

  const actualizarMetrica = useCallback(async (id: string, input: MetricaInput) => {
    const { error } = await supabase.from("metricas").update({
      nombre: input.nombre, unidad: input.tipo_conteo === "conteo" ? null : input.unidad,
      color: input.color, tipo_conteo: input.tipo_conteo,
    }).eq("id", id);
    if (error) return { error: error.message };
    await fetchAll();
    return {};
  }, [fetchAll]);

  const eliminarMetrica = useCallback(async (id: string) => {
    await supabase.from("metricas_datos").delete().eq("metrica_id", id);
    const { error } = await supabase.from("metricas").delete().eq("id", id);
    if (error) return { error: error.message };
    await fetchAll();
    return {};
  }, [fetchAll]);

  const crearDato = useCallback(async (input: DatoInput) => {
    if (!vocaliaId) return { error: "Sin espacio activo" };
    const { error } = await supabase.from("metricas_datos").insert({ ...input, vocalia_id: vocaliaId });
    if (error) return { error: error.message };
    await fetchAll();
    return {};
  }, [vocaliaId, fetchAll]);

  const actualizarDato = useCallback(async (id: string, input: DatoInput) => {
    const { error } = await supabase.from("metricas_datos").update(input).eq("id", id);
    if (error) return { error: error.message };
    await fetchAll();
    return {};
  }, [fetchAll]);

  const eliminarDato = useCallback(async (id: string) => {
    const { error } = await supabase.from("metricas_datos").delete().eq("id", id);
    if (error) return { error: error.message };
    setDatos((prev) => prev.filter((d) => d.id !== id));
    return {};
  }, []);

  /** Copia las métricas (sin datos) de otra vocalía a la actual. */
  const copiarDesdeVocalia = useCallback(async (origenVocaliaId: string) => {
    if (!vocaliaId) return { error: "Sin espacio activo" };
    const { data, error } = await supabase
      .from("metricas")
      .select("nombre,unidad,origen,auto_fuente,color,orden,tipo_conteo")
      .eq("vocalia_id", origenVocaliaId);
    if (error) return { error: error.message };
    const existentes = new Set(metricas.map((m) => m.nombre.trim().toLowerCase()));
    const nuevas = (data ?? []).filter((m) => !existentes.has((m.nombre ?? "").trim().toLowerCase()));
    if (nuevas.length === 0) return { error: "No hay métricas nuevas para copiar" };
    const { error: insErr } = await supabase.from("metricas").insert(
      nuevas.map((m, i) => ({ ...m, vocalia_id: vocaliaId, orden: metricas.length + i })),
    );
    if (insErr) return { error: insErr.message };
    await fetchAll();
    return { copiadas: nuevas.length };
  }, [vocaliaId, metricas, fetchAll]);

  return {
    metricas, datos, loading, refetch: fetchAll,
    crearMetrica, actualizarMetrica, eliminarMetrica,
    crearDato, actualizarDato, eliminarDato, copiarDesdeVocalia,
  };
}
