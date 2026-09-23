import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbCausa, DbSujeto } from "@/lib/causaMapper";
import { fetchCausasOcultasDe } from "@/lib/pestanasOcultables";

const DETENIDOS_SELECT = "id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,vencimiento_pena_nota,observaciones,lugar_alojamiento,causa_id,created_at,causas!inner(id,expediente_nro,numero_interno,despachante,flagrancia,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),delegada,art196bis,subestados,tipo_recurso,tipo_proceso,fecha_ingreso,firmante,modo_inicio,fiscalia_interviniente,ultimo_movimiento,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,fuero,estado_procesal,rol_estudio)";

/**
 * Trae sujetos detenidos con su causa embebida.
 * Agrupa por causa y conserva únicamente sus sujetos detenidos. Así la vista
 * puede reutilizar la tabla completa sin duplicar claves cuando una causa
 * tiene más de una persona detenida.
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
      const ocultas = await fetchCausasOcultasDe(vocaliaId, "detenidos");
      // Una fila por cada detenido individual: cada sujeto genera su propia
      // entrada con la causa embebida y solo ese imputado.
      const filas: Causa[] = rows
        .filter((r) => r.causas && !ocultas.has(r.causas.id))
        .map((r) => {
          const sujeto = r as DbSujeto;
          const causa = r.causas as DbCausa;
          const ui = dbCausaToUI({ ...causa, sujetos: [sujeto] });
          return { ...ui, rowKey: `${causa.id}::${sujeto.id}` };
        });
      setCausas(filas);
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { causas, loading, error, refetch: fetchData };
}
