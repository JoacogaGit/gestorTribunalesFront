import { supabase } from "@/integrations/supabase/client";
import { dbCausaToUI } from "@/lib/causaMapper";
import { esFaltaDeMerito } from "@/lib/reglasListas";
import { useRemoteCausas } from "@/hooks/useRemoteCausas";

const CAUSAS_SELECT = "id,expediente_nro,numero_interno,despachante,flagrancia,secreta,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),delegada,art196bis,subestados,tipo_recurso,tipo_proceso,fecha_ingreso,firmante,modo_inicio,fiscalia_interviniente,ultimo_movimiento,modo_terminacion,fecha_terminacion,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,fuero,estado_procesal,rol_estudio,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,vencimiento_pena_nota,violencia_genero,tipo_violencia_genero,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en)";

/** Causas con estado procesal "Falta de mérito" (cualquier estado salvo terminada). */
export function useCausasFaltaMerito(vocaliaId: string | null, enabled = true) {
  return useRemoteCausas(vocaliaId ? `falta_merito|${vocaliaId}` : null, async () => {
    const { data, error } = await supabase
      .from("causas")
      .select(CAUSAS_SELECT)
      .eq("vocalia_id", vocaliaId!)
      .ilike("estado_procesal", "%falta de m%rito%")
      .neq("estado_causa", "terminada")
      .is("borrado_en", null)
      .is("sujetos.borrado_en", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).filter((r) => esFaltaDeMerito(r.estado_procesal)).map(dbCausaToUI);
  }, enabled);
}
