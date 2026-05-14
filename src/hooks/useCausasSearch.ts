import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CausaSearchResult {
  id: string;
  expediente_nro: string;
  caratula: string | null;
  vocalia: { id: string; nombre: string };
}

/**
 * Busca causas por expediente_nro (ilike) en TODAS las vocalías del tribunal dado.
 * Debounce 250ms.
 */
export function useCausasSearch(
  query: string,
  tribunalId: string | null,
  excludeCausaId?: string | null,
) {
  const [results, setResults] = useState<CausaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q || !tribunalId) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      let qb = supabase
        .from("causas")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("id, expediente_nro, caratula, vocalias!inner(id, nombre, tribunal_id)" as any)
        .eq("vocalias.tribunal_id", tribunalId)
        .ilike("expediente_nro", `%${q}%`)
        .limit(5);
      if (excludeCausaId) qb = qb.neq("id", excludeCausaId);
      const { data, error } = await qb;
      if (cancelled) return;
      if (error || !data) {
        setResults([]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResults((data as any[]).map((r) => ({
          id: r.id,
          expediente_nro: r.expediente_nro,
          caratula: r.caratula ?? null,
          vocalia: { id: r.vocalias?.id ?? "", nombre: r.vocalias?.nombre ?? "—" },
        })));
      }
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, tribunalId, excludeCausaId]);

  return { results, loading };
}
