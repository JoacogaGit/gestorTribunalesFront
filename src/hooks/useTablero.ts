import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitEventosChanged } from "@/lib/eventosBus";

export interface TableroColumna {
  id: string;
  tablero_id: string;
  lista_id: string;
  nombre: string;
  orden: number;
}

export interface TableroTarjeta {
  id: string;
  columna_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  fecha_hora_fin: string | null;
  causa_id: string | null;
  orden: number;
  google_event_id: string | null;
}

export interface TarjetaInput {
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  fecha_hora_fin?: string | null;
  causa_id: string | null;
}

/** Fire-and-forget: sólo para tableros personales. */
function fireTarjetaSync(action: "create" | "update" | "delete", tarjeta_id: string) {
  supabase.functions
    .invoke("google-calendar-sync", { body: { action, tipo: "tarjeta", tarjeta_id } })
    .catch((e) => console.warn("google-calendar-sync tarjeta error", e));
}

export function useTablero(listaId: string | null, tableroId: string | null, ambito: "personal" | "vocalia" = "personal") {
  const [columnas, setColumnas] = useState<TableroColumna[]>([]);
  const [tarjetas, setTarjetas] = useState<TableroTarjeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncEnabled = ambito === "personal";

  const fetchData = useCallback(async () => {
    if (!listaId) { setColumnas([]); setTarjetas([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data: cols, error: cErr } = await supabase
      .from("tablero_columnas")
      .select("id, tablero_id, lista_id, nombre, orden")
      .eq("lista_id", listaId)
      .order("orden", { ascending: true });
    if (cErr) { setError(cErr.message); setLoading(false); return; }
    const colIds = (cols ?? []).map((c) => c.id);
    let cards: TableroTarjeta[] = [];
    if (colIds.length) {
      const { data: tj, error: tErr } = await supabase
        .from("tablero_tarjetas")
        .select("id, columna_id, titulo, descripcion, fecha_hora, fecha_hora_fin, causa_id, orden, google_event_id")
        .in("columna_id", colIds)
        .order("orden", { ascending: true });
      if (tErr) { setError(tErr.message); setLoading(false); return; }
      cards = (tj ?? []) as TableroTarjeta[];
    }
    setColumnas((cols ?? []) as TableroColumna[]);
    setTarjetas(cards);
    setLoading(false);
  }, [listaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ===== Columnas =====
  const crearColumna = useCallback(async (nombre: string) => {
    if (!listaId || !tableroId) return;
    await supabase.from("tablero_columnas").insert({ tablero_id: tableroId, lista_id: listaId, nombre: nombre.trim(), orden: columnas.length });
    await fetchData();
  }, [listaId, tableroId, columnas.length, fetchData]);

  const renombrarColumna = useCallback(async (id: string, nombre: string) => {
    setColumnas((prev) => prev.map((c) => (c.id === id ? { ...c, nombre } : c)));
    await supabase.from("tablero_columnas").update({ nombre: nombre.trim() }).eq("id", id);
  }, []);

  const borrarColumna = useCallback(async (id: string) => {
    await supabase.from("tablero_columnas").delete().eq("id", id);
    await fetchData();
  }, [fetchData]);

  const reordenarColumnas = useCallback(async (ordenadas: TableroColumna[]) => {
    setColumnas(ordenadas.map((c, i) => ({ ...c, orden: i })));
    await Promise.all(
      ordenadas.map((c, i) => supabase.from("tablero_columnas").update({ orden: i }).eq("id", c.id)),
    );
  }, []);

  // ===== Tarjetas =====
  const crearTarjeta = useCallback(async (columnaId: string, input: TarjetaInput) => {
    const orden = tarjetas.filter((t) => t.columna_id === columnaId).length;
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tablero_tarjetas")
      .insert({
        columna_id: columnaId,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        fecha_hora: input.fecha_hora,
        fecha_hora_fin: input.fecha_hora_fin ?? null,
        causa_id: input.causa_id,
        orden,
        creado_por: userRes.user?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) { setError(error.message); return; }
    await fetchData();
    emitEventosChanged();
    if (syncEnabled && data?.id && input.fecha_hora) fireTarjetaSync("create", data.id);
  }, [tarjetas, fetchData, syncEnabled]);

  const actualizarTarjeta = useCallback(async (id: string, input: TarjetaInput) => {
    const { error } = await supabase.from("tablero_tarjetas").update({
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      fecha_hora: input.fecha_hora,
      fecha_hora_fin: input.fecha_hora_fin ?? null,
      causa_id: input.causa_id,
    }).eq("id", id);
    if (error) { setError(error.message); return; }
    await fetchData();
    emitEventosChanged();
    if (syncEnabled) fireTarjetaSync("update", id);
  }, [fetchData, syncEnabled]);

  const borrarTarjeta = useCallback(async (id: string) => {
    if (syncEnabled) fireTarjetaSync("delete", id);
    await supabase.from("tablero_tarjetas").delete().eq("id", id);
    await fetchData();
    emitEventosChanged();
  }, [fetchData, syncEnabled]);

  /** Aplica un nuevo estado de tarjetas (post drag & drop) y persiste columna_id + orden. */
  const aplicarMovimiento = useCallback(async (next: TableroTarjeta[]) => {
    setTarjetas(next);
    const cambios = next.filter((t) => {
      const prev = tarjetas.find((p) => p.id === t.id);
      return !prev || prev.columna_id !== t.columna_id || prev.orden !== t.orden;
    });
    await Promise.all(
      cambios.map((t) =>
        supabase.from("tablero_tarjetas").update({ columna_id: t.columna_id, orden: t.orden }).eq("id", t.id),
      ),
    );
  }, [tarjetas]);

  return {
    columnas, tarjetas, loading, error, refetch: fetchData,
    crearColumna, renombrarColumna, borrarColumna, reordenarColumnas,
    crearTarjeta, actualizarTarjeta, borrarTarjeta, aplicarMovimiento,
  };
}
