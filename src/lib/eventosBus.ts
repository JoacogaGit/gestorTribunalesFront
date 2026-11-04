// Bus simple para notificar cambios en la tabla `eventos` y disparar
// refetch en hooks que muestran datos derivados (calendario, KPIs).
import { useEffect, useRef } from "react";
import { diferirAviso, enLote } from "@/lib/loteAvisos";

const target = new EventTarget();
const EVENT_NAME = "eventos:changed";
let timer: ReturnType<typeof setTimeout> | null = null;

function programar() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    target.dispatchEvent(new Event(EVENT_NAME));
  }, 60);
}

/** Varios avisos seguidos se agrupan en un solo refresco. */
export function emitEventosChanged() {
  if (enLote()) { diferirAviso(programar); return; }
  programar();
}

export function useEventosChanged(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const handler = () => ref.current();
    target.addEventListener(EVENT_NAME, handler);
    return () => target.removeEventListener(EVENT_NAME, handler);
  }, []);
}
