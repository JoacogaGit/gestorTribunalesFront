import { supabase } from "@/integrations/supabase/client";

/**
 * Resuelve el nombre visible de un usuario a partir de su id.
 *
 * Fuente: tabla perfiles (nombre_completo, con email como respaldo).
 * Los resultados se cachean en localStorage para no repetir consultas
 * cada vez que se abre una ficha.
 */

const CACHE_KEY = "iustrack_nombres_perfiles_v1";
const pedidos = new Map<string, Promise<string | null>>();

type Cache = Record<string, string>;

function leerCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Cache) : {};
  } catch {
    return {};
  }
}

function guardarEnCache(id: string, nombre: string) {
  try {
    const cache = leerCache();
    cache[id] = nombre;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* sin cache disponible: seguimos sin nombre */
  }
}

function limpiar(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * Devuelve el nombre (o el email) del usuario, o null si no se puede resolver.
 * Nunca devuelve un id: quien llama decide cómo mostrar el caso sin nombre.
 */
export function resolverNombreUsuario(id: string | null | undefined): Promise<string | null> {
  if (!id) return Promise.resolve(null);

  const cacheado = leerCache()[id];
  if (cacheado) return Promise.resolve(cacheado);

  const enCurso = pedidos.get(id);
  if (enCurso) return enCurso;

  const consulta = (async () => {
    try {
      const { data } = await supabase
        .from("perfiles")
        .select("nombre_completo,email")
        .eq("id", id)
        .maybeSingle();
      const nombre = limpiar(data?.nombre_completo) ?? limpiar(data?.email);
      if (nombre) guardarEnCache(id, nombre);
      return nombre;
    } catch {
      return null;
    } finally {
      pedidos.delete(id);
    }
  })();

  pedidos.set(id, consulta);
  return consulta;
}
