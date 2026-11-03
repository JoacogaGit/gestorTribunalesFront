import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Nombre visible de una lista: el personalizado de la oficina o el original. */
export function nombreListaVisible(nombres: Record<string, string>, id: string, original: string): string {
  const propio = nombres[id]?.trim();
  return propio ? propio : original;
}

/** Normaliza el valor guardado en la oficina (descarta claves o valores inválidos). */
export function normalizarNombresListas(valor: unknown): Record<string, string> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

/** Nombres personalizados de las listas predeterminadas, guardados por oficina. */
export function useNombresListas(tribunalId: string | null | undefined) {
  const [nombres, setNombres] = useState<Record<string, string>>({});

  const refetch = useCallback(async () => {
    if (!tribunalId) { setNombres({}); return; }
    const { data } = await supabase
      .from("tribunales")
      .select("nombres_listas")
      .eq("id", tribunalId)
      .maybeSingle();
    setNombres(normalizarNombresListas((data as { nombres_listas?: unknown } | null)?.nombres_listas));
  }, [tribunalId]);

  useEffect(() => { refetch(); }, [refetch]);

  /** nombre vacío o null = volver al nombre original. */
  const renombrar = useCallback(async (id: string, nombre: string | null) => {
    if (!tribunalId) return { ok: false as const, error: "No hay oficina seleccionada" };
    const next = { ...nombres };
    const limpio = (nombre ?? "").trim();
    if (limpio) next[id] = limpio.slice(0, 60);
    else delete next[id];
    const { data, error } = await supabase
      .from("tribunales")
      .update({ nombres_listas: next } as never)
      .eq("id", tribunalId)
      .select("id");
    if (error) return { ok: false as const, error: error.message };
    if (!data || data.length === 0) return { ok: false as const, error: "Solo un administrador de la oficina puede cambiar el nombre de las listas." };
    setNombres(next);
    return { ok: true as const };
  }, [tribunalId, nombres]);

  return { nombres, renombrar, refetch };
}
