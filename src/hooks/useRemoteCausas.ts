import { useCallback, useEffect, useRef, useState } from "react";
import { Causa } from "@/data/mockCausas";
import { useCausasChanged } from "@/lib/causasBus";
import { supabase } from "@/integrations/supabase/client";

/**
 * Memoria compartida de la última respuesta de cada lista (por clave).
 * Al volver a una pestaña ya visitada se muestra al instante lo último que se
 * vio y se actualiza en silencio, sin esqueleto de carga.
 */
const memoria = new Map<string, Causa[]>();
const prefetchHechos = new Set<string>();

// Al cerrar sesión no debe quedar nada de otra cuenta en memoria.
supabase.auth.onAuthStateChange((evento) => {
  if (evento === "SIGNED_OUT") {
    memoria.clear();
    prefetchHechos.clear();
  }
});

type Idle = (cb: () => void, opts?: { timeout: number }) => number;
function cuandoEsteLibre(cb: () => void, demoraMs: number) {
  const t = setTimeout(() => {
    const ric = (window as unknown as { requestIdleCallback?: Idle }).requestIdleCallback;
    if (ric) ric(cb, { timeout: 3000 });
    else cb();
  }, demoraMs);
  return () => clearTimeout(t);
}

/**
 * Carga una lista de causas y la mantiene al día:
 * - solo consulta mientras la lista está visible (`enabled`); las pestañas
 *   ocultas no se refrescan con cada guardado, se ponen al día al abrirlas;
 * - los refrescos son silenciosos (la lista visible no se vacía ni parpadea);
 * - una respuesta vieja nunca pisa a una más nueva.
 * `key` identifica la consulta (espacio + parámetros); null = sin datos.
 */
export function useRemoteCausas(key: string | null, fetcher: () => Promise<Causa[]>, enabled = true) {
  const [causas, setCausas] = useState<Causa[]>(() => (key ? memoria.get(key) ?? [] : []));
  const [loading, setLoading] = useState(() => !(key && memoria.has(key)));
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const loadedKey = useRef<string | null>(key && memoria.has(key) ? key : null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const fetchData = useCallback(async () => {
    const my = ++seq.current;
    if (!key) {
      loadedKey.current = null;
      setCausas([]); setError(null); setLoading(false);
      return;
    }
    let silent = loadedKey.current === key;
    if (silent) {
      // Si otra instancia o la precarga trajo algo más nuevo, mostrarlo ya.
      const enMemoria = memoria.get(key);
      if (enMemoria) setCausas(enMemoria);
    } else {
      const enMemoria = memoria.get(key);
      if (enMemoria) {
        // Mostrar lo último conocido ya mismo y actualizar por detrás.
        loadedKey.current = key;
        setCausas(enMemoria);
        setLoading(false);
        silent = true;
      } else {
        setLoading(true);
        setCausas([]);
      }
    }
    setError(null);
    try {
      const rows = await fetcherRef.current();
      memoria.set(key, rows);
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

  // Visible: cargar (o ponerse al día) al abrir la pestaña o cambiar de espacio.
  useEffect(() => {
    if (enabled) void fetchData();
  }, [fetchData, enabled]);

  // Oculta y nunca cargada: precargar una sola vez en un momento libre, para
  // que la primera visita también sea instantánea.
  useEffect(() => {
    if (enabled || !key || memoria.has(key) || prefetchHechos.has(key)) return;
    return cuandoEsteLibre(() => {
      if (enabledRef.current || memoria.has(key) || prefetchHechos.has(key)) return;
      prefetchHechos.add(key);
      fetcherRef.current()
        .then((rows) => { memoria.set(key, rows); })
        .catch(() => { prefetchHechos.delete(key); });
    }, 1500);
  }, [key, enabled]);

  // Oculta: no consulta; se pone al día cuando se abre.
  useCausasChanged(() => {
    if (enabledRef.current) void fetchData();
  });

  return { causas, loading, error, refetch: fetchData };
}
