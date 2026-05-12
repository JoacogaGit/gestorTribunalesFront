import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbCausa, DbSujeto, mapSujeto } from "@/lib/causaMapper";

/**
 * Trae sujetos detenidos con su causa embebida.
 * Devuelve "causas sintéticas" con un único imputado (el detenido), de forma
 * que DetenidosList -que itera detenidos dentro de cada causa- muestre una
 * fila por sujeto detenido sin más cambios.
 */
export function useDetenidos() {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sujetos")
      .select("*, causas(*)")
      .eq("situacion_libertad", "detenido");

    if (error) {
      setError(error.message);
      setCausas([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data as any[]) ?? [];
      const synthetic: Causa[] = rows
        .filter((r) => r.causas)
        .map((r) => {
          const sujeto = r as DbSujeto;
          const causa = r.causas as DbCausa;
          // Construir causa con un solo sujeto (el detenido actual).
          const ui = dbCausaToUI({ ...causa, sujetos: [sujeto] });
          // Asegurar que el imputado quede como Detenido y con lugar correcto.
          ui.imputados = [mapSujeto(sujeto)];
          return ui;
        });
      setCausas(synthetic);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
