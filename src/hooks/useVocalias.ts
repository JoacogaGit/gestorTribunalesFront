import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VocaliaRow {
  id: string;
  nombre: string;
  tribunal_id: string;
}

export function useVocalias() {
  const [vocalias, setVocalias] = useState<VocaliaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("vocalias")
      .select("id, nombre, tribunal_id")
      .order("nombre", { ascending: true });
    if (error) {
      setError(error.message);
      setVocalias([]);
    } else {
      setVocalias((data ?? []) as VocaliaRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renombrarVocalia = useCallback(async (id: string, nombre: string) => {
    const limpio = nombre.trim();
    if (!limpio) throw new Error("El nombre no puede estar vacío");
    // Optimista
    setVocalias((prev) => prev.map((v) => (v.id === id ? { ...v, nombre: limpio } : v)));
    const { error } = await supabase.from("vocalias").update({ nombre: limpio }).eq("id", id);
    if (error) {
      await fetchData();
      throw new Error(error.message);
    }
  }, [fetchData]);

  return { vocalias, loading, error, refetch: fetchData, renombrarVocalia };
}
