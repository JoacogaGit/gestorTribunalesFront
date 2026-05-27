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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      setError(userErr?.message ?? "No autenticado");
      setVocalias([]);
      setLoading(false);
      return;
    }
    const userId = userData.user.id;

    // Filtro explícito por membresía: el selector personal solo muestra
    // vocalías de tribunales donde el usuario es miembro, incluso si es superadmin.
    const { data: membresias, error: memErr } = await supabase
      .from("miembros_tribunal")
      .select("tribunal_id")
      .eq("usuario_id", userId);
    if (memErr) {
      setError(memErr.message);
      setVocalias([]);
      setLoading(false);
      return;
    }
    const tribunalIds = (membresias ?? []).map((m) => m.tribunal_id);
    if (tribunalIds.length === 0) {
      setVocalias([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocalias")
      .select("id, nombre, tribunal_id")
      .in("tribunal_id", tribunalIds)
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
