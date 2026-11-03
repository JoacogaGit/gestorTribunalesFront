import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const EVENTO_TRIBUNAL_CAMBIADO = "iustrack:tribunal-cambiado";
export function avisarTribunalCambiado() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_TRIBUNAL_CAMBIADO));
}

export type ModoTribunal = "lista_unica" | "vocalias_separadas";

export interface TribunalRow {
  id: string;
  nombre: string;
  codigo_acceso: string | null;
  modo: ModoTribunal;
}

export function useTribunal(tribunalId: string | null | undefined) {
  const [tribunal, setTribunal] = useState<TribunalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tribunalId) { setTribunal(null); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase
      .from("tribunales")
      .select("id, nombre, codigo_acceso, modo")
      .eq("id", tribunalId)
      .maybeSingle();
    if (e) setError(e.message);
    setTribunal((data as TribunalRow) ?? null);
    setLoading(false);
  }, [tribunalId]);

  useEffect(() => { refetch(); }, [refetch]);
  // Si se renombra la oficina en otra pantalla, todas las vistas se actualizan.
  useEffect(() => {
    const h = () => { refetch(); };
    window.addEventListener(EVENTO_TRIBUNAL_CAMBIADO, h);
    return () => window.removeEventListener(EVENTO_TRIBUNAL_CAMBIADO, h);
  }, [refetch]);

  return { tribunal, loading, error, refetch };
}
