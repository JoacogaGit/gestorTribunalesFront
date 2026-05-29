import { useEffect, useRef } from "react";

/**
 * Persistencia local de borradores de formularios largos en sessionStorage.
 * - Guarda los valores con debounce de 500ms mientras `enabled` es true.
 * - `loadDraft(key)` devuelve lo guardado (o null) sin tocar nada.
 * - `clearDraft(key)` borra la entrada (llamar al guardar exitoso o cancelar).
 *
 * No se sincroniza con Supabase; es local del navegador.
 */
const PREFIX = "lov-draft-v1:";

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try { sessionStorage.removeItem(PREFIX + key); } catch { /* noop */ }
}

export function useFormDraft<T>(key: string, value: T, enabled: boolean, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* noop */ }
    }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [key, value, enabled, delay]);
}
