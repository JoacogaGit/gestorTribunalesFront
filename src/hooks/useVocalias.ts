import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModoTribunal = "lista_unica" | "vocalias_separadas";

export interface VocaliaRow {
  id: string;
  nombre: string;
  tribunal_id: string;
  tribunal_nombre: string;
  tribunal_modo: ModoTribunal;
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

    const [{ data: tribsData, error: tribsErr }, { data, error }] = await Promise.all([
      supabase
        .from("tribunales")
        .select("id, nombre, modo, eliminado_en")
        .in("id", tribunalIds)
        .is("eliminado_en", null),
      supabase
        .from("vocalias")
        .select("id, nombre, tribunal_id")
        .in("tribunal_id", tribunalIds)
        .order("nombre", { ascending: true }),
    ]);

    if (tribsErr || error) {
      setError((tribsErr || error)!.message);
      setVocalias([]);
      setLoading(false);
      return;
    }

    const tribsMap = new Map<string, { nombre: string; modo: ModoTribunal }>();
    (tribsData ?? []).forEach((t: any) => {
      tribsMap.set(t.id, { nombre: t.nombre, modo: (t.modo as ModoTribunal) ?? "vocalias_separadas" });
    });

    const enriched: VocaliaRow[] = (data ?? []).flatMap((v: any) => {
      const t = tribsMap.get(v.tribunal_id);
      if (!t) return []; // tribunal archivado / no accesible
      return [{
        id: v.id,
        nombre: v.nombre,
        tribunal_id: v.tribunal_id,
        tribunal_nombre: t.nombre,
        tribunal_modo: t.modo,
      }];
    });
    setVocalias(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renombrarVocalia = useCallback(async (id: string, nombre: string) => {
    const limpio = nombre.trim();
    if (!limpio) throw new Error("El nombre no puede estar vacío");
    setVocalias((prev) => prev.map((v) => (v.id === id ? { ...v, nombre: limpio } : v)));
    const { error } = await supabase.from("vocalias").update({ nombre: limpio }).eq("id", id);
    if (error) {
      await fetchData();
      throw new Error(error.message);
    }
  }, [fetchData]);

  return { vocalias, loading, error, refetch: fetchData, renombrarVocalia };
}
