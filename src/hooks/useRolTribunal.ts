import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type RolTribunal = "admin" | "miembro" | null;

export function useRolTribunal(tribunalId: string | null | undefined) {
  const { user } = useAuth();
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
    setRol((data?.rol as RolTribunal) ?? null);
    setLoading(false);
  }, [user, tribunalId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { rol, esAdmin: rol === "admin", loading, refetch };
}
