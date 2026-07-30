import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AmbitoLista = "personal" | "vocalia";

export interface TableroLista {
  id: string;
  tablero_id: string;
  usuario_id: string;
  nombre: string;
  ambito: AmbitoLista;
  orden: number;
  created_at: string;
}

export function useTableroListas(tableroId: string | null) {
  const [listas, setListas] = useState<TableroLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tableroId) { setListas([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tablero_listas")
      .select("id, tablero_id, usuario_id, nombre, ambito, orden, created_at")
      .eq("tablero_id", tableroId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { setError(error.message); setListas([]); }
    else setListas((data ?? []) as TableroLista[]);
    setLoading(false);
  }, [tableroId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const crearLista = useCallback(async (nombre: string, ambito: AmbitoLista): Promise<string | null> => {
    if (!tableroId) return null;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from("tablero_listas")
      .insert({ tablero_id: tableroId, usuario_id: uid, nombre: nombre.trim(), ambito, orden: listas.length })
      .select("id")
      .maybeSingle();
    if (error || !data) { setError(error?.message ?? "No se pudo crear la lista"); return null; }
    await supabase.from("tablero_columnas").insert([
      { tablero_id: tableroId, lista_id: data.id, nombre: "Pendiente", orden: 0 },
      { tablero_id: tableroId, lista_id: data.id, nombre: "En curso", orden: 1 },
      { tablero_id: tableroId, lista_id: data.id, nombre: "Listo", orden: 2 },
    ]);
    await fetchData();
    return data.id;
  }, [tableroId, listas.length, fetchData]);

  const renombrarLista = useCallback(async (id: string, nombre: string) => {
    await supabase.from("tablero_listas").update({ nombre: nombre.trim() }).eq("id", id);
    await fetchData();
  }, [fetchData]);

  const borrarLista = useCallback(async (id: string) => {
    await supabase.from("tablero_listas").delete().eq("id", id);
    await fetchData();
  }, [fetchData]);

  return { listas, loading, error, refetch: fetchData, crearLista, renombrarLista, borrarLista };
}
