import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BorradoBase {
  id: string;
  titulo: string;
  borrado_en: string;
  borrado_por_nombre: string | null;
}

interface RowBase {
  id: string;
  borrado_en: string | null;
  perfiles?: { nombre_completo: string | null; email: string | null } | null;
}

function mapPerfilNombre(r: RowBase): string | null {
  if (!r.perfiles) return null;
  return r.perfiles.nombre_completo || r.perfiles.email || null;
}

export function useCausasBorradas(vocaliaId: string | null) {
  const [items, setItems] = useState<BorradoBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("causas")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, expediente_nro, caratula, borrado_en, perfiles:borrado_por(nombre_completo,email)" as any)
      .eq("vocalia_id", vocaliaId)
      .not("borrado_en", "is", null)
      .order("borrado_en", { ascending: false });
    if (error) { setError(error.message); setItems([]); }
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems((data as any[]).map((r) => ({
        id: r.id,
        titulo: `${r.expediente_nro}${r.caratula ? ` — ${r.caratula}` : ""}`,
        borrado_en: r.borrado_en,
        borrado_por_nombre: mapPerfilNombre(r),
      })));
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { items, loading, error, refetch: fetchAll };
}

export function useSujetosBorrados(vocaliaId: string | null) {
  const [items, setItems] = useState<BorradoBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("sujetos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, nombre_completo, borrado_en, causas!inner(vocalia_id), perfiles:borrado_por(nombre_completo,email)" as any)
      .eq("causas.vocalia_id", vocaliaId)
      .not("borrado_en", "is", null)
      .order("borrado_en", { ascending: false });
    if (error) { setError(error.message); setItems([]); }
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems((data as any[]).map((r) => ({
        id: r.id,
        titulo: r.nombre_completo,
        borrado_en: r.borrado_en,
        borrado_por_nombre: mapPerfilNombre(r),
      })));
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { items, loading, error, refetch: fetchAll };
}

export function useEventosBorrados(vocaliaId: string | null) {
  const [items, setItems] = useState<BorradoBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!vocaliaId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("eventos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, titulo, borrado_en, causas!inner(vocalia_id), perfiles:borrado_por(nombre_completo,email)" as any)
      .eq("causas.vocalia_id", vocaliaId)
      .not("borrado_en", "is", null)
      .order("borrado_en", { ascending: false });
    if (error) { setError(error.message); setItems([]); }
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems((data as any[]).map((r) => ({
        id: r.id,
        titulo: r.titulo,
        borrado_en: r.borrado_en,
        borrado_por_nombre: mapPerfilNombre(r),
      })));
    }
    setLoading(false);
  }, [vocaliaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { items, loading, error, refetch: fetchAll };
}

export async function restaurar(
  tabla: "causas" | "sujetos" | "eventos",
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch = { borrado_en: null, borrado_por: null } as never;
  const { error } = await supabase.from(tabla).update(patch).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
