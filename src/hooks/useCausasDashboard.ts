import { supabase } from "@/integrations/supabase/client";
import { dbCausaToUI } from "@/lib/causaMapper";
import { fetchCausasOcultasDe } from "@/lib/pestanasOcultables";
import { useRemoteCausas } from "@/hooks/useRemoteCausas";

const ACTIVOS = ["tramite", "recurso", "para_sentencia", "para_comunicar"] as const;
const CAUSAS_SELECT = "id,expediente_nro,numero_interno,despachante,flagrancia,secreta,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),delegada,art196bis,subestados,tipo_recurso,tipo_proceso,fecha_ingreso,firmante,modo_inicio,fiscalia_interviniente,ultimo_movimiento,modo_terminacion,fecha_terminacion,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,fuero,estado_procesal,rol_estudio,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,vencimiento_pena_nota,violencia_genero,tipo_violencia_genero,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en)";

/** incluirTodos: si es true, trae causas en cualquier estado (incluidas las terminadas). */
export function useCausasDashboard(vocaliaId: string | null, incluirTodos = false, enabled = true) {
  return useRemoteCausas(vocaliaId ? `dashboard|${vocaliaId}|${incluirTodos ? 1 : 0}` : null, async () => {
    // Se trae por tandas: con todas las causas (incluidas terminadas) se puede superar el máximo por consulta.
    const TANDA = 1000;
    const ocultasP = fetchCausasOcultasDe(vocaliaId!, "tramite");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] = [];
    for (let desde = 0; ; desde += TANDA) {
      let q = supabase
        .from("causas")
        .select(CAUSAS_SELECT)
        .eq("vocalia_id", vocaliaId!);
      if (!incluirTodos) q = q.in("estado_causa", ACTIVOS);
      const { data, error } = await q
        .is("borrado_en", null)
        .is("sujetos.borrado_en", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(desde, desde + TANDA - 1);
      if (error) throw new Error(error.message);
      rows = rows.concat(data ?? []);
      if (!data || data.length < TANDA) break;
    }
    // Ocultar del dashboard las causas de listas personalizadas ocultas de Trámite.
    const ocultas = await ocultasP;
    if (ocultas.size > 0) rows = rows.filter((r) => !ocultas.has(r.id));
    return rows.map(dbCausaToUI);
  }, enabled);
}
