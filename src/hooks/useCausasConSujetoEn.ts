import { supabase } from "@/integrations/supabase/client";
import { dbCausaToUI, DbSituacionLibertad } from "@/lib/causaMapper";
import { fetchCausasOcultasDe } from "@/lib/pestanasOcultables";
import { apareceEnListaPorSituacion } from "@/lib/reglasListas";
import { useRemoteCausas } from "@/hooks/useRemoteCausas";

const CAUSAS_SELECT = "id,expediente_nro,numero_interno,despachante,flagrancia,secreta,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),delegada,art196bis,subestados,tipo_recurso,tipo_proceso,fecha_ingreso,firmante,modo_inicio,fiscalia_interviniente,ultimo_movimiento,modo_terminacion,fecha_terminacion,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,vencimiento_pena_nota,violencia_genero,tipo_violencia_genero,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en)";

/**
 * Causas con al menos un sujeto en la situación dada (Rebeldes / SJP),
 * cualquiera sea el estado de la causa salvo "terminada".
 */
export function useCausasConSujetoEn(situacion: DbSituacionLibertad, vocaliaId: string | null) {
  return useRemoteCausas(vocaliaId ? `sujeto|${situacion}|${vocaliaId}` : null, async () => {
    // Paso 1: ids de causas (de esta vocalía) con al menos un sujeto en esa situación.
    const { data: matches, error: e1 } = await supabase
      .from("sujetos")
      .select("causa_id, causas!inner(vocalia_id,borrado_en,estado_causa)")
      .eq("situacion_libertad", situacion)
      .eq("causas.vocalia_id", vocaliaId!)
      .neq("causas.estado_causa", "terminada")
      .is("borrado_en", null)
      .is("causas.borrado_en", null);
    if (e1) throw new Error(e1.message);
    const ids = Array.from(new Set((matches ?? []).map((r) => r.causa_id).filter(Boolean)));
    if (ids.length === 0) return [];

    // Paso 2: causas completas con sus sujetos.
    const { data, error: e2 } = await supabase
      .from("causas")
      .select(CAUSAS_SELECT)
      .in("id", ids)
      .eq("vocalia_id", vocaliaId!)
      .neq("estado_causa", "terminada")
      .is("borrado_en", null)
      .order("created_at", { ascending: false });
    if (e2) throw new Error(e2.message);

    const ocultas = await fetchCausasOcultasDe(vocaliaId!, situacion === "rebelde" ? "rebeldes" : "sjp");
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return ((data ?? []) as any[])
      .filter((r) => !ocultas.has(r.id) && apareceEnListaPorSituacion(r.estado_causa, r.sujetos, situacion))
      // Conservar SOLO los sujetos en la situación pedida, para destacarlos.
      .map((r) => ({
        ...r,
        sujetos: ((r.sujetos as any[]) || []).filter(
          (s) => s.borrado_en == null && s.situacion_libertad === situacion,
        ),
      }))
      .map(dbCausaToUI);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
}
