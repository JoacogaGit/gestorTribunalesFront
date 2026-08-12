import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI } from "@/lib/causaMapper";

const ACTIVOS = ["tramite", "recurso"] as const;
const CAUSAS_SELECT = "id,expediente_nro,numero_interno,despachante,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),tipo_recurso,tipo_proceso,fecha_ingreso,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en)";

/** incluirTodos: si es true, trae causas en cualquier estado (modo estudio). */
export function useCausasDashboard(vocaliaId: string | null, incluirTodos = false) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vocaliaId) {
      setCausas([]); setLoading(false); return;
    }
    setLoading(true);
    setError(null);
    let q = supabase
      .from("causas")
      .select(CAUSAS_SELECT)
      .eq("vocalia_id", vocaliaId);
    if (!incluirTodos) q = q.in("estado_causa", ACTIVOS);
    const { data, error } = await q
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
  }, [vocaliaId, incluirTodos]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
