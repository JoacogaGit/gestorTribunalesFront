// Aviso global de "cambiaron las causas": cualquier alta, edición, borrado,
// cambio de estado o movimiento de lista lo emite y todas las listas abiertas
// se refrescan solas, sin recargar la página.
import { useEffect, useRef } from "react";
import { diferirAviso, enLote } from "@/lib/loteAvisos";

const target = new EventTarget();
const EVENT_NAME = "causas:changed";
let timer: ReturnType<typeof setTimeout> | null = null;

function programar() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    target.dispatchEvent(new Event(EVENT_NAME));
  }, 60);
}

/** Agrupa avisos seguidos (p. ej. causa + imputados) en un solo refresco. */
export function emitCausasChanged() {
  if (enLote()) { diferirAviso(programar); return; }
  programar();
}

/** Suscripción simple; devuelve la función para desuscribirse. */
export function onCausasChanged(cb: () => void): () => void {
  const handler = () => cb();
  target.addEventListener(EVENT_NAME, handler);
  return () => target.removeEventListener(EVENT_NAME, handler);
}

export function useCausasChanged(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => onCausasChanged(() => ref.current()), []);
}
