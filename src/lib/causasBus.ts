// Aviso global de "cambiaron las causas": cualquier alta, edición, borrado,
// cambio de estado o movimiento de lista lo emite y todas las listas abiertas
// se refrescan solas, sin recargar la página.
import { useEffect, useRef } from "react";

const target = new EventTarget();
const EVENT_NAME = "causas:changed";
let timer: ReturnType<typeof setTimeout> | null = null;

/** Agrupa avisos seguidos (p. ej. causa + imputados) en un solo refresco. */
export function emitCausasChanged() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    target.dispatchEvent(new Event(EVENT_NAME));
  }, 60);
}

export function useCausasChanged(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const handler = () => ref.current();
    target.addEventListener(EVENT_NAME, handler);
    return () => target.removeEventListener(EVENT_NAME, handler);
  }, []);
}
