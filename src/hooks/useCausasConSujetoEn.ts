import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbSituacionLibertad } from "@/lib/causaMapper";

/**
 * Trae todas las causas que tienen al menos un sujeto en la situación dada,
 * pero embebe TODOS los sujetos de cada causa (no sólo los que matchean).
 */
export function useCausasConSujetoEn(situacion: DbSituacionLibertad) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Paso 1: ids de causas con al menos un sujeto en esa situación.
    const { data: matches, error: e1 } = await supabase
      .from("sujetos")
      .select("causa_id")
      .eq("situacion_libertad", situacion);

    if (e1) {
      setError(e1.message); setCausas([]); setLoading(false); return;
    }
    const ids = Array.from(new Set((matches ?? []).map((r) => r.causa_id).filter(Boolean)));
    if (ids.length === 0) {
      setCausas([]); setLoading(false); return;
    }

    // Paso 2: causas completas con todos sus sujetos.
    const { data, error: e2 } = await supabase
      .from("causas")
      .select("*, sujetos(*)")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (e2) {
      setError(e2.message); setCausas([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCausas((data as any[]).map(dbCausaToUI));
    }
    setLoading(false);
  }, [situacion]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
