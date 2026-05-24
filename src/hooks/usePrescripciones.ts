import { supabase } from "@/integrations/supabase/client";

export interface PrescripcionRow {
  id: string;
  sujeto_id: string;
  fecha: string;
  descripcion: string | null;
}

export interface PrescripcionDraft {
  /** Cuando existe es update; cuando no, insert. */
  id?: string;
  fecha: string;
  descripcion: string | null;
}

/** Trae todas las prescripciones para un set de sujeto_ids. */
export async function fetchPrescripcionesDeSujetos(sujetoIds: string[]): Promise<PrescripcionRow[]> {
  if (sujetoIds.length === 0) return [];
  const { data, error } = await supabase
    .from("prescripciones")
    .select("id, sujeto_id, fecha, descripcion")
    .in("sujeto_id", sujetoIds)
    .order("fecha", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PrescripcionRow[];
}

/** Sincroniza las prescripciones de un sujeto: borra las que ya no están y crea las nuevas. */
export async function syncPrescripcionesSujeto(
  sujetoId: string,
  drafts: PrescripcionDraft[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Estrategia simple: borrar las que no estén en drafts (por id) e insertar/actualizar.
  const ids = drafts.map((d) => d.id).filter((x): x is string => !!x);
  if (ids.length === 0) {
    const { error: delErr } = await supabase.from("prescripciones").delete().eq("sujeto_id", sujetoId);
    if (delErr) return { ok: false, error: delErr.message };
  } else {
    const { error: delErr } = await supabase.from("prescripciones").delete().eq("sujeto_id", sujetoId).not("id", "in", `(${ids.join(",")})`);
    if (delErr) return { ok: false, error: delErr.message };
  }
  for (const d of drafts) {
    if (!d.fecha) continue;
    if (d.id) {
      const { error } = await supabase.from("prescripciones").update({ fecha: d.fecha, descripcion: d.descripcion }).eq("id", d.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("prescripciones").insert({ sujeto_id: sujetoId, fecha: d.fecha, descripcion: d.descripcion });
      if (error) return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}
