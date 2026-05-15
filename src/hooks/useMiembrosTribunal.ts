import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RolMiembro = "admin" | "miembro";

export interface MiembroRow {
  id: string; // miembros_tribunal.id
  usuario_id: string;
  nombre: string;
  email: string;
  rol: RolMiembro;
  created_at: string | null;
}

type Result = { ok: true } | { ok: false; error: string };

export function useMiembrosTribunal(tribunalId: string | null | undefined) {
  const [miembros, setMiembros] = useState<MiembroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!tribunalId) { setMiembros([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase
      .from("miembros_tribunal")
      .select("id, usuario_id, rol, created_at, perfiles:usuario_id(nombre_completo, email)")
      .eq("tribunal_id", tribunalId)
      .order("created_at", { ascending: true });
    if (e) { setError(e.message); setMiembros([]); setLoading(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: MiembroRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      usuario_id: r.usuario_id,
      rol: r.rol,
      created_at: r.created_at,
      nombre: r.perfiles?.nombre_completo ?? "—",
      email: r.perfiles?.email ?? "—",
    }));
    setMiembros(mapped);
    setLoading(false);
  }, [tribunalId]);

  useEffect(() => { refetch(); }, [refetch]);

  const adminCount = miembros.filter((m) => m.rol === "admin").length;

  const cambiarRol = useCallback(async (miembroId: string, nuevoRol: RolMiembro): Promise<Result> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("miembros_tribunal").update({ rol: nuevoRol }).eq("id", miembroId);
      if (error) return { ok: false, error: error.message };
      await refetch();
      return { ok: true };
    } finally { setSaving(false); }
  }, [refetch]);

  const quitarMiembro = useCallback(async (miembroId: string): Promise<Result> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("miembros_tribunal").delete().eq("id", miembroId);
      if (error) return { ok: false, error: error.message };
      await refetch();
      return { ok: true };
    } finally { setSaving(false); }
  }, [refetch]);

  return { miembros, loading, error, saving, refetch, cambiarRol, quitarMiembro, adminCount };
}
