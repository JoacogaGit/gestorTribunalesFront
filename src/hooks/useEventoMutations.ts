import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEventosChanged } from "@/lib/eventosBus";

export interface EventoInput {
  titulo: string;
  descripcion: string | null;
  tipo_evento: string | null;
  /** ISO completo (con T y hora/zone) o "YYYY-MM-DD" o null. */
  fecha: string | null;
  /** ISO fin (opcional, solo cuando hay franja horaria). */
  fechaFin?: string | null;
  categoria_personalizada_id?: string | null;
}

function toTimestamp(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  // Si ya viene en formato ISO (con T y hora), pasarlo tal cual.
  if (/T\d{2}:\d{2}/.test(fecha)) {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // YYYY-MM-DD → UTC midnight (all-day).
  const d = new Date(`${fecha}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type Result = { ok: true } | { ok: false; error: string };

function fireSync(action: "create" | "update" | "delete", evento_id: string, causa_id: string) {
  // Fire-and-forget: no rompe la mutación principal si falla.
  supabase.functions
    .invoke("google-calendar-sync", { body: { action, evento_id, causa_id } })
    .catch((e) => console.warn("google-calendar-sync error", e));
}

export function useEventoMutations() {
  const [saving, setSaving] = useState(false);

  const crearEvento = useCallback(async (causaId: string, input: EventoInput): Promise<Result> => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("eventos").insert({
        causa_id: causaId,
        sujeto_id: null,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipo_evento: input.tipo_evento?.trim() || null,
        fecha_hora: toTimestamp(input.fecha),
        fecha_hora_fin: toTimestamp(input.fechaFin ?? null),
        categoria_personalizada_id: input.categoria_personalizada_id ?? null,
      } as never).select("id").maybeSingle();
      if (error) return { ok: false, error: error.message };
      emitEventosChanged();
      if (data?.id && input.fecha) fireSync("create", data.id, causaId);
      return { ok: true };
    } finally { setSaving(false); }
  }, []);

  const actualizarEvento = useCallback(async (id: string, input: EventoInput): Promise<Result> => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("eventos").update({
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipo_evento: input.tipo_evento?.trim() || null,
        fecha_hora: toTimestamp(input.fecha),
        fecha_hora_fin: toTimestamp(input.fechaFin ?? null),
      } as never).eq("id", id).select("causa_id").maybeSingle();
      if (error) return { ok: false, error: error.message };
      emitEventosChanged();
      if (data?.causa_id) fireSync("update", id, data.causa_id);
      return { ok: true };
    } finally { setSaving(false); }
  }, []);

  const borrarEvento = useCallback(async (id: string): Promise<Result> => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      // Necesitamos causa_id para sync; lo leemos antes del soft delete.
      const { data: prev } = await supabase.from("eventos").select("causa_id").eq("id", id).maybeSingle();
      const patch = { borrado_en: new Date().toISOString(), borrado_por: userRes.user?.id ?? null } as never;
      const { error } = await supabase.from("eventos").update(patch).eq("id", id);
      if (error) return { ok: false, error: error.message };
      emitEventosChanged();
      if (prev?.causa_id) fireSync("delete", id, prev.causa_id);
      return { ok: true };
    } finally { setSaving(false); }
  }, []);

  return { saving, crearEvento, actualizarEvento, borrarEvento };
}
