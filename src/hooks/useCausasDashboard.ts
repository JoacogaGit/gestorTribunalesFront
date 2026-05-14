import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI } from "@/lib/causaMapper";

const ACTIVOS = ["tramite", "recurso"] as const;

export function useCausasDashboard(vocaliaId: string | null) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vocaliaId) {
      setCausas([]); setLoading(false); return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("causas")
      .select("*, sujetos(*)")
      .eq("vocalia_id", vocaliaId)
      .in("estado_causa", ACTIVOS)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setCausas([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCausas((data as any[]).map(dbCausaToUI));
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
