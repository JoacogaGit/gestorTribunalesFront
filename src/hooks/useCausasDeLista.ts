import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dbCausaToUI } from "@/lib/causaMapper";
import { fireCausaResync } from "@/lib/gcalSync";
import { claveLista, fetchCausasOcultasDe } from "@/lib/pestanasOcultables";
import { emitCausasChanged } from "@/lib/causasBus";
import { useRemoteCausas } from "@/hooks/useRemoteCausas";

const CAUSAS_LISTA_SELECT = "causa_id, causas!inner(id,expediente_nro,numero_interno,despachante,flagrancia,secreta,caratula,estado_causa,subestado_tramite_id,subestados_tramite(nombre),delegada,art196bis,subestados,tipo_recurso,tipo_proceso,fecha_ingreso,firmante,modo_inicio,fiscalia_interviniente,ultimo_movimiento,modo_terminacion,fecha_terminacion,vocalia_id,created_at,querella,actor_civil,otros_intervinientes,causa_conexa_texto,causa_conexa_id,link_externo,color_destacado,borrado_en,sujetos(id,nombre_completo,delito,situacion_libertad,defensor,fecha_detencion,prescripcion_fecha,vencimiento_pp,vencimiento_pena,vencimiento_pena_nota,violencia_genero,tipo_violencia_genero,observaciones,lugar_alojamiento,causa_id,created_at,borrado_en))";

export function useCausasDeLista(listaId: string | null, vocaliaId?: string | null) {
  const remote = useRemoteCausas(listaId ? `lista|${listaId}|${vocaliaId ?? ""}` : null, async () => {
    const { data, error } = await supabase
      .from("listas_personalizadas_causas")
      .select(CAUSAS_LISTA_SELECT)
      .eq("lista_id", listaId!);
    if (error) throw new Error(error.message);
    // Ocultar causas que están en otras listas configuradas para desaparecer de esta.
    const ocultas = vocaliaId
      ? await fetchCausasOcultasDe(vocaliaId, claveLista(listaId!), listaId!)
      : new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[])
      .map((r) => r.causas)
      .filter((c) => c && c.borrado_en == null && !ocultas.has(c.id))
      .map((c) => ({
        ...c,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sujetos: ((c.sujetos as any[]) || []).filter((s) => s.borrado_en == null),
      }))
      .map(dbCausaToUI);
  });
  const { refetch } = remote;

  const agregarCausa = useCallback(async (causaId: string) => {
    if (!listaId) throw new Error("Sin lista");
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("listas_personalizadas_causas")
      .insert({ lista_id: listaId, causa_id: causaId, agregado_por: userData.user?.id ?? null });
    if (error) throw error;
    fireCausaResync(causaId);
    await refetch();
    // Otras pestañas pueden ocultar esta causa por la configuración de la lista.
    emitCausasChanged();
  }, [listaId, refetch]);

  const sacarCausa = useCallback(async (causaId: string) => {
    if (!listaId) throw new Error("Sin lista");
    const { error } = await supabase
      .from("listas_personalizadas_causas")
      .delete()
      .eq("lista_id", listaId)
      .eq("causa_id", causaId);
    if (error) throw error;
    fireCausaResync(causaId);
    await refetch();
    emitCausasChanged();
  }, [listaId, refetch]);

  return { ...remote, agregarCausa, sacarCausa };
}
