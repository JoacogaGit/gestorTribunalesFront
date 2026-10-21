import { useCallback, useEffect, useRef, useState } from "react";
import { Causa } from "@/data/mockCausas";
import { useCausasChanged } from "@/lib/causasBus";

/**
 * Carga una lista de causas y la mantiene al día:
 * - se refresca sola cuando alguien avisa que cambiaron las causas;
 * - los refrescos son silenciosos (la lista visible no se vacía ni parpadea);
 * - una respuesta vieja nunca pisa a una más nueva.
 * `key` identifica la consulta (espacio + parámetros); null = sin datos.
 */
export function useRemoteCausas(key: string | null, fetcher: () => Promise<Causa[]>) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const loadedKey = useRef<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    const my = ++seq.current;
    if (!key) {
      loadedKey.current = null;
      setCausas([]); setError(null); setLoading(false);
      return;
    }
    const silent = loadedKey.current === key;
    if (!silent) {
      setLoading(true);
      setCausas([]);
    }
    setError(null);
    try {
      const rows = await fetcherRef.current();
      if (my !== seq.current) return;
      loadedKey.current = key;
      setCausas(rows);
    } catch (e) {
      if (my !== seq.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (silent) {
        // Un refresco en segundo plano que falla no borra lo que ya se ve.
        console.warn("Refresco de causas falló:", msg);
      } else {
        setError(msg);
        setCausas([]);
      }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useCausasChanged(fetchData);

  return { causas, loading, error, refetch: fetchData };
}
