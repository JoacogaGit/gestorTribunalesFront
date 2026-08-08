import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AmbitoLista = "personal" | "vocalia";

export interface TableroLista {
  id: string;
  tablero_id: string;
  usuario_id: string;
  nombre: string;
  ambito: AmbitoLista;
  orden: number;
  color: string | null;
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
      .select("id, tablero_id, usuario_id, nombre, ambito, orden, color, created_at")
      .eq("tablero_id", tableroId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { setError(error.message); setListas([]); }
    else setListas((data ?? []) as TableroLista[]);
    setLoading(false);
  }, [tableroId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const crearLista = useCallback(async (nombre: string, ambito: AmbitoLista): Promise<string | null> => {
    if (!tableroId) { toast.error("No hay anotación activa."); return null; }
    // La sesión debe estar activa: RLS evalúa auth.uid() con el JWT del cliente.
    const { data: sessRes } = await supabase.auth.getSession();
    if (!sessRes.session?.user?.id) {
      toast.error("Sesión expirada: volvé a iniciar sesión.");
      return null;
    }
    // usuario_id lo setea la BD (DEFAULT auth.uid()) → no enviarlo.
    const payload = { tablero_id: tableroId, nombre: nombre.trim(), ambito, orden: listas.length };
    console.log("[anotaciones] insert tablero_listas payload", payload);
    const { data, error } = await supabase
      .from("tablero_listas")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("[anotaciones] crearLista falló", { payload, error });
      const msg = error?.message ?? "No se pudo crear la lista";
      setError(msg);
      toast.error(msg);
      return null;
    }
    const cols = [
      { tablero_id: tableroId, lista_id: data.id, nombre: "Pendiente", orden: 0 },
      { tablero_id: tableroId, lista_id: data.id, nombre: "En curso", orden: 1 },
      { tablero_id: tableroId, lista_id: data.id, nombre: "Listo", orden: 2 },
    ];
    const { error: colErr } = await supabase.from("tablero_columnas").insert(cols);
    if (colErr) { console.error("[anotaciones] columnas iniciales", { cols, error: colErr }); toast.error(colErr.message); }
    await fetchData();
    return data.id;
  }, [tableroId, listas.length, fetchData]);


  const renombrarLista = useCallback(async (id: string, nombre: string) => {
    await supabase.from("tablero_listas").update({ nombre: nombre.trim() }).eq("id", id);
    await fetchData();
  }, [fetchData]);

  const cambiarColorLista = useCallback(async (id: string, color: string | null) => {
    setListas((prev) => prev.map((l) => (l.id === id ? { ...l, color } : l)));
    const { error } = await supabase.from("tablero_listas").update({ color }).eq("id", id);
    if (error) { toast.error(error.message); await fetchData(); }
  }, [fetchData]);

  const borrarLista = useCallback(async (id: string) => {
    await supabase.from("tablero_listas").delete().eq("id", id);
    await fetchData();
  }, [fetchData]);

  return { listas, loading, error, refetch: fetchData, crearLista, renombrarLista, borrarLista, cambiarColorLista };
}
