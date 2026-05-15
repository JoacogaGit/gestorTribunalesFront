import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useMembresias() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) { setCount(0); setLoading(false); return; }
    setLoading(true);
    const { count: c, error } = await supabase
      .from("miembros_tribunal")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", user.id);
    if (error) setError(error.message);
    setCount(c ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  return { count, loading, error, refetch };
}
