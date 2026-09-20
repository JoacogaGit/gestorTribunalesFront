import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useEsSuperadmin } from "@/hooks/useEsSuperadmin";

export type RolTribunal = "admin" | "miembro" | "lector" | null;

export function useRolTribunal(tribunalId: string | null | undefined) {
  const { user } = useAuth();
  const { esSuperadmin, loading: superLoading } = useEsSuperadmin();
  const [rol, setRol] = useState<RolTribunal>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user || !tribunalId) { setRol(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("miembros_tribunal")
      .select("rol")
      .eq("tribunal_id", tribunalId)
      .eq("usuario_id", user.id)
      .maybeSingle();
    // El superadmin accede a la gestión de cualquier oficina sin figurar como miembro.
    const rolMembresia = (data?.rol as RolTribunal) ?? null;
    setRol(rolMembresia ?? (esSuperadmin ? "admin" : null));
    setLoading(false);
  }, [user, tribunalId, esSuperadmin]);

  useEffect(() => { if (!superLoading) refetch(); }, [refetch, superLoading]);

  return { rol, esAdmin: rol === "admin", soloLectura: rol === "lector", loading, refetch };
}
