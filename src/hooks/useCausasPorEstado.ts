import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbEstadoCausa } from "@/lib/causaMapper";

interface Options {
  /** Excluir causas que tengan al menos un sujeto con alguna de estas situaciones (valores DB). */
  excluirSituaciones?: string[];
}

const CAUSAS_SELECT = "id,expediente_nro,numero_interno,despachante,caratula,estado_causa,tipo_recurso,tipo_proceso,fecha_ingreso,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en)";

export function useCausasPorEstado(estado: DbEstadoCausa, vocaliaId: string | null, options: Options = {}) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const excluirKey = (options.excluirSituaciones ?? []).slice().sort().join(",");

  const fetchData = useCallback(async () => {
    if (!vocaliaId) { setCausas([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("causas")
      .select(CAUSAS_SELECT)
      .eq("estado_causa", estado)
      .eq("vocalia_id", vocaliaId)
      .is("borrado_en", null)
      .is("sujetos.borrado_en", null)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setCausas([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows = data as any[];
      const excl = excluirKey ? excluirKey.split(",") : [];
      if (excl.length > 0) {
        rows = rows.filter((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sujetos = ((r.sujetos as any[]) || []).filter((s) => s.borrado_en == null);
          if (sujetos.length === 0) return true;
          // Mantener la causa si al menos un sujeto NO está en una de las situaciones excluidas.
          return sujetos.some((s) => !excl.includes(s.situacion_libertad));
        });
      }
      setCausas(rows.map(dbCausaToUI));
    }
    setLoading(false);
  }, [estado, vocaliaId, excluirKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
