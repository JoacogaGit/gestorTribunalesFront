import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbCausa, DbSujeto, mapSujeto } from "@/lib/causaMapper";

const DETENIDOS_SELECT = "id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,observaciones,lugar_alojamiento,causa_id,created_at,causas!inner(id,expediente_nro,numero_interno,despachante,caratula,estado_causa,tipo_recurso,tipo_proceso,fecha_ingreso,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado)";

/**
 * Trae sujetos detenidos con su causa embebida.
 * Devuelve "causas sintéticas" con un único imputado (el detenido), de forma
 * que DetenidosList -que itera detenidos dentro de cada causa- muestre una
 * fila por sujeto detenido sin más cambios.
 */
export function useDetenidos(vocaliaId: string | null) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vocaliaId) { setCausas([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sujetos")
      .select(DETENIDOS_SELECT)
      .eq("situacion_libertad", "detenido")
      .eq("causas.vocalia_id", vocaliaId)
      .neq("causas.estado_causa", "terminada")
      .is("borrado_en", null)
      .is("causas.borrado_en", null)
      .order("created_at", { ascending: false });

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
          const ui = dbCausaToUI({ ...causa, sujetos: [sujeto] });
          ui.imputados = [mapSujeto(sujeto)];
          return ui;
        });
      setCausas(synthetic);
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
