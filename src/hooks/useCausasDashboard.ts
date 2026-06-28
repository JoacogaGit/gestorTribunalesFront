import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI } from "@/lib/causaMapper";

const ACTIVOS = ["tramite", "recurso"] as const;
const CAUSAS_SELECT = "id,expediente_nro,numero_interno,despachante,caratula,estado_causa,tipo_recurso,tipo_proceso,fecha_ingreso,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en)";

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
      .select(CAUSAS_SELECT)
      .eq("vocalia_id", vocaliaId)
      .in("estado_causa", ACTIVOS)
      .is("borrado_en", null)
      .is("sujetos.borrado_en", null)
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
