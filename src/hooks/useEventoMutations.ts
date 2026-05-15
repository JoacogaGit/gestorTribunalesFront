import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEventosChanged } from "@/lib/eventosBus";

export interface EventoInput {
  titulo: string;
  descripcion: string | null;
  tipo_evento: string | null;
  /** "YYYY-MM-DD" o null */
  fecha: string | null;
}

function toTimestamp(fecha: string | null): string | null {
  if (!fecha) return null;
  // Interpretado como hora local 00:00 → ISO en UTC.
  const d = new Date(`${fecha}T00:00:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type Result = { ok: true } | { ok: false; error: string };

export function useEventoMutations() {
  const [saving, setSaving] = useState(false);

  const crearEvento = useCallback(async (causaId: string, input: EventoInput): Promise<Result> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("eventos").insert({
        causa_id: causaId,
        sujeto_id: null,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipo_evento: input.tipo_evento?.trim() || null,
        fecha_hora: toTimestamp(input.fecha),
      });
      if (error) return { ok: false, error: error.message };
      emitEventosChanged();
      return { ok: true };
    } finally { setSaving(false); }
  }, []);

  const actualizarEvento = useCallback(async (id: string, input: EventoInput): Promise<Result> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("eventos").update({
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipo_evento: input.tipo_evento?.trim() || null,
        fecha_hora: toTimestamp(input.fecha),
      }).eq("id", id);
      if (error) return { ok: false, error: error.message };
      emitEventosChanged();
      return { ok: true };
    } finally { setSaving(false); }
  }, []);

  const borrarEvento = useCallback(async (id: string): Promise<Result> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
      emitEventosChanged();
      return { ok: true };
    } finally { setSaving(false); }
  }, []);

  return { saving, crearEvento, actualizarEvento, borrarEvento };
}
