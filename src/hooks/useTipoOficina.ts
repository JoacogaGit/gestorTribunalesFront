import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TipoOficina = "judicial" | "estudio";

/** Devuelve el tipo de oficina (tribunales.tipo_oficina) del tribunal dado. */
export function useTipoOficina(tribunalId: string | null | undefined) {
  const [tipoOficina, setTipoOficina] = useState<TipoOficina | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!tribunalId) { setTipoOficina(null); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("tribunales")
        .select("tipo_oficina")
        .eq("id", tribunalId)
        .maybeSingle();
      if (cancelled) return;
      setTipoOficina(((data?.tipo_oficina as TipoOficina) ?? null));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tribunalId]);

  return { tipoOficina, esEstudio: tipoOficina === "estudio", loading };
}
