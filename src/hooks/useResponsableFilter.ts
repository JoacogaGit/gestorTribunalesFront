import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ResponsableFilter {
  /** Campo de la causa usado como "responsable" según el tipo de oficina. */
  campo: "despachante" | "empleado_a_cargo";
  label: string;
  /** Valores distintos existentes en las causas del espacio. */
  opciones: string[];
  seleccionados: string[];
  activo: boolean;
  toggle: (valor: string) => void;
  limpiar: () => void;
  /** IDs de causas que cumplen el filtro (null = sin filtro activo). */
  causaIdsPermitidos: Set<string> | null;
  filtrar: <T extends { id: string }>(items: T[]) => T[];
  refetch: () => void;
}

interface Row {
  id: string;
  despachante: string | null;
  empleado_a_cargo: string | null;
}

/**
 * Filtro global por responsable de la causa.
 * Judicial => campo "despachante". Estudio => campo "empleado_a_cargo".
 */
export function useResponsableFilter(vocaliaId: string | null, esEstudio: boolean): ResponsableFilter {
  const campo: "despachante" | "empleado_a_cargo" = esEstudio ? "empleado_a_cargo" : "despachante";
  const label = esEstudio ? "Empleado a cargo" : "Despachante";
  const [rows, setRows] = useState<Row[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const fetchRows = useCallback(async () => {
    if (!vocaliaId) { setRows([]); return; }
    const { data } = await supabase
      .from("causas")
      .select("id,despachante,empleado_a_cargo")
      .eq("vocalia_id", vocaliaId)
      .is("borrado_en", null);
    setRows(((data ?? []) as unknown as Row[]));
  }, [vocaliaId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  // Al cambiar de espacio o de tipo de oficina, limpiamos la selección.
  useEffect(() => { setSeleccionados([]); }, [vocaliaId, campo]);

  const valorDe = useCallback(
    (r: Row) => ((campo === "despachante" ? r.despachante : r.empleado_a_cargo) ?? "").trim(),
    [campo],
  );

  const opciones = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { const v = valorDe(r); if (v) set.add(v); });
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [rows, valorDe]);

  const causaIdsPermitidos = useMemo(() => {
    if (seleccionados.length === 0) return null;
    const sel = new Set(seleccionados.map((s) => s.toLowerCase()));
    const ids = new Set<string>();
    rows.forEach((r) => { if (sel.has(valorDe(r).toLowerCase())) ids.add(r.id); });
    return ids;
  }, [rows, seleccionados, valorDe]);

  const toggle = useCallback((valor: string) => {
    setSeleccionados((prev) => prev.includes(valor) ? prev.filter((v) => v !== valor) : [...prev, valor]);
  }, []);

  const limpiar = useCallback(() => setSeleccionados([]), []);

  const filtrar = useCallback(
    <T extends { id: string }>(items: T[]) =>
      causaIdsPermitidos ? items.filter((i) => causaIdsPermitidos.has(i.id)) : items,
    [causaIdsPermitidos],
  );

  return {
    campo, label, opciones, seleccionados,
    activo: seleccionados.length > 0,
    toggle, limpiar, causaIdsPermitidos, filtrar,
    refetch: fetchRows,
  };
}
