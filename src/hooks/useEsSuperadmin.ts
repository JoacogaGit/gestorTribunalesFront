import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Devuelve si el usuario actual tiene rol_global = 'superadmin'.
 * Lee directamente la tabla perfiles (no se cachea en el cliente).
 */
export function useEsSuperadmin() {
  const { user, loading: authLoading } = useAuth();
  const [esSuperadmin, setEsSuperadmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;
    async function check() {
      if (authLoading) return;
      if (!user) {
        if (!cancelado) {
          setEsSuperadmin(false);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("perfiles")
        .select("rol_global")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelado) return;
      if (error) {
        setEsSuperadmin(false);
      } else {
        setEsSuperadmin(data?.rol_global === "superadmin");
      }
      setLoading(false);
    }
    check();
    return () => {
      cancelado = true;
    };
  }, [user, authLoading]);

  return { esSuperadmin, loading };
}
