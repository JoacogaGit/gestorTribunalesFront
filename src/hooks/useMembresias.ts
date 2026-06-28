import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useMembresias() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);   // true SOLO hasta la primera carga
  const [isFetching, setIsFetching] = useState(false); // true en cualquier carga
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!user) {
      setCount(0);
      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    const { count: c, error } = await supabase
      .from("miembros_tribunal")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id);
    if (error) setError(error.message);
    setCount(c ?? 0);
    hasLoadedRef.current = true;
    setIsLoading(false);
    setIsFetching(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  // `loading` se mantiene por compatibilidad pero refleja sólo la primera carga.
  return { count, loading: isLoading, isLoading, isFetching, error, refetch };
}
