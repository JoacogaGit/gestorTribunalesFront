import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbSituacionLibertad } from "@/lib/causaMapper";

/**
 * Trae todas las causas que tienen al menos un sujeto en la situación dada,
 * pero embebe TODOS los sujetos de cada causa (no sólo los que matchean).
 */
export function useCausasConSujetoEn(situacion: DbSituacionLibertad, vocaliaId: string | null) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vocaliaId) { setCausas([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    // Paso 1: ids de causas (de esta vocalía) con al menos un sujeto en esa situación.
    const { data: matches, error: e1 } = await supabase
      .from("sujetos")
      .select("causa_id, causas!inner(vocalia_id,borrado_en)")
      .eq("situacion_libertad", situacion)
      .eq("causas.vocalia_id", vocaliaId)
      .is("borrado_en", null)
      .is("causas.borrado_en", null);

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
      .eq("vocalia_id", vocaliaId)
      .is("borrado_en", null)
      .order("created_at", { ascending: false });

    if (e2) {
      setError(e2.message); setCausas([]);
    } else {
      // Mostrar la causa pero conservando SOLO los sujetos que están en la situación pedida,
      // para destacarlos como protagonistas (mismo patrón que useDetenidos).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data as any[]).map((r) => ({
        ...r,
        sujetos: ((r.sujetos as any[]) || []).filter(
          (s) => s.borrado_en == null && s.situacion_libertad === situacion,
        ),
      }));
      setCausas(rows.map(dbCausaToUI));
    }
    setLoading(false);
  }, [situacion, vocaliaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
