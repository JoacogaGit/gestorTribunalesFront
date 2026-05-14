import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVocaliaActual } from "@/context/VocaliaContext";
import {
  DbEstadoCausa, DbSituacionLibertad, DbTipoRecurso,
} from "@/lib/causaMapper";

export interface CausaInput {
  expediente_nro: string;
  caratula: string | null;
  estado_causa: DbEstadoCausa;
  tipo_recurso: DbTipoRecurso;
  querella: string | null;
  actor_civil: string | null;
  otros_intervinientes: string | null;
  causa_conexa_texto: string | null;
}

export interface SujetoInput {
  /** Si existe, es update; si no, insert. */
  id?: string;
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: DbSituacionLibertad;
  defensor: string | null;
  fecha_detencion: string | null;
  lugar_alojamiento: string | null;
  prescripcion_fecha: string | null;
  vencimiento_pp: string | null;
  vencimiento_pena: string | null;
  observaciones: string | null;
}

export function useCausaMutations() {
  const { vocalia } = useVocaliaActual();
  const [saving, setSaving] = useState(false);

  const crearCausa = useCallback(async (
    causa: CausaInput,
    sujetos: SujetoInput[],
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    if (!vocalia) return { ok: false, error: "No hay vocalía seleccionada." };
    setSaving(true);
    try {
      const { data: causaData, error: causaErr } = await supabase
        .from("causas")
        .insert({ ...causa, vocalia_id: vocalia.id })
        .select("id")
        .single();
      if (causaErr || !causaData) {
        return { ok: false, error: causaErr?.message || "No se pudo crear la causa." };
      }
      const causaId = causaData.id;
      if (sujetos.length > 0) {
        const payload = sujetos.map(({ id: _omit, ...s }) => ({ ...s, causa_id: causaId }));
        const { error: sujErr } = await supabase.from("sujetos").insert(payload);
        if (sujErr) {
          // Rollback manual
          await supabase.from("causas").delete().eq("id", causaId);
          return { ok: false, error: `Error al guardar imputados: ${sujErr.message}` };
        }
      }
      return { ok: true, id: causaId };
    } finally {
      setSaving(false);
    }
  }, [vocalia]);

  const actualizarCausa = useCallback(async (
    id: string,
    causa: CausaInput,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("causas").update(causa).eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } finally {
      setSaving(false);
    }
  }, []);

  const borrarCausa = useCallback(async (
    id: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    setSaving(true);
    try {
      const { error: evErr } = await supabase.from("eventos").delete().eq("causa_id", id);
      if (evErr) return { ok: false, error: `Eventos: ${evErr.message}` };
      const { error: suErr } = await supabase.from("sujetos").delete().eq("causa_id", id);
      if (suErr) return { ok: false, error: `Imputados: ${suErr.message}` };
      const { error: caErr } = await supabase.from("causas").delete().eq("id", id);
      if (caErr) return { ok: false, error: caErr.message };
      return { ok: true };
    } finally {
      setSaving(false);
    }
  }, []);

  const crearSujeto = useCallback(async (causaId: string, sujeto: SujetoInput) => {
    const { id: _o, ...rest } = sujeto;
    const { error } = await supabase.from("sujetos").insert({ ...rest, causa_id: causaId });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  }, []);

  const actualizarSujeto = useCallback(async (id: string, sujeto: SujetoInput) => {
    const { id: _o, ...rest } = sujeto;
    const { error } = await supabase.from("sujetos").update(rest).eq("id", id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  }, []);

  const borrarSujeto = useCallback(async (id: string) => {
    const { error } = await supabase.from("sujetos").delete().eq("id", id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  }, []);

  return {
    saving,
    crearCausa, actualizarCausa, borrarCausa,
    crearSujeto, actualizarSujeto, borrarSujeto,
  };
}
