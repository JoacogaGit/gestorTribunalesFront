import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Tablero {
  id: string;
  vocalia_id: string;
  usuario_id: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export function useTableros(vocaliaId: string | null) {
  const [tableros, setTableros] = useState<Tablero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vocaliaId) { setTableros([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tableros")
      .select("id, vocalia_id, usuario_id, nombre, orden, created_at")
      .eq("vocalia_id", vocaliaId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { setError(error.message); setTableros([]); }
    else setTableros((data ?? []) as Tablero[]);
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const crearTablero = useCallback(
    async (nombre: string): Promise<string | null> => {
      if (!vocaliaId) { toast.error("No hay espacio seleccionado."); return null; }
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Sesión expirada: volvé a iniciar sesión."); return null; }
      const { data, error } = await supabase
        .from("tableros")
        .insert({ vocalia_id: vocaliaId, usuario_id: uid, nombre: nombre.trim(), orden: tableros.length })
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error("[anotaciones] crearTablero falló", error);
        const msg = error?.message ?? "No se pudo crear la anotación";
        setError(msg);
        toast.error(msg);
        return null;
      }
      await fetchData();
      return data.id;
    },
    [vocaliaId, tableros.length, fetchData],
  );

  const renombrarTablero = useCallback(async (id: string, nombre: string) => {
    await supabase.from("tableros").update({ nombre: nombre.trim() }).eq("id", id);
    await fetchData();
  }, [fetchData]);

  const borrarTablero = useCallback(async (id: string) => {
    await supabase.from("tableros").delete().eq("id", id);
    await fetchData();
  }, [fetchData]);

  return { tableros, loading, error, refetch: fetchData, crearTablero, renombrarTablero, borrarTablero };
}
