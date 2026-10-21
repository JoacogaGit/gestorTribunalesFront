import { supabase } from "@/integrations/supabase/client";
import { Causa } from "@/data/mockCausas";
import { dbCausaToUI, DbCausa, DbSujeto } from "@/lib/causaMapper";
import { fetchCausasOcultasDe } from "@/lib/pestanasOcultables";
import { apareceEnListaPorSituacion } from "@/lib/reglasListas";
import { useRemoteCausas } from "@/hooks/useRemoteCausas";

const DETENIDOS_SELECT = "id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,vencimiento_pena_nota,violencia_genero,tipo_violencia_genero,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en,causas!inner(id,expediente_nro,numero_interno,despachante,flagrancia,secreta,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),delegada,art196bis,subestados,tipo_recurso,tipo_proceso,fecha_ingreso,firmante,modo_inicio,fiscalia_interviniente,ultimo_movimiento,modo_terminacion,fecha_terminacion,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,fuero,estado_procesal,rol_estudio)";

/**
 * Una fila por cada imputado detenido, con su causa embebida.
 * La causa aparece cualquiera sea su estado (trámite, recurso, para sacar
 * sentencia, para comunicar…), salvo que esté terminada.
 */
export function useDetenidos(vocaliaId: string | null) {
  return useRemoteCausas(vocaliaId ? `detenidos|${vocaliaId}` : null, async () => {
    const { data, error } = await supabase
      .from("sujetos")
      .select(DETENIDOS_SELECT)
      .eq("situacion_libertad", "detenido")
      .eq("causas.vocalia_id", vocaliaId!)
      .neq("causas.estado_causa", "terminada")
      .is("borrado_en", null)
      .is("causas.borrado_en", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data as any[]) ?? [];
    const ocultas = await fetchCausasOcultasDe(vocaliaId!, "detenidos");
    const filas: Causa[] = rows
      .filter((r) => r.causas && !ocultas.has(r.causas.id)
        && apareceEnListaPorSituacion(r.causas.estado_causa, [r], "detenido"))
      .map((r) => {
        const sujeto = r as DbSujeto;
        const causa = r.causas as DbCausa;
        const ui = dbCausaToUI({ ...causa, sujetos: [sujeto] });
        return { ...ui, rowKey: `${causa.id}::${sujeto.id}` };
      });
    return filas;
  });
}
