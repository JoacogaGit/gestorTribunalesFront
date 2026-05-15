// Bus simple para notificar cambios en la tabla `eventos` y disparar
// refetch en hooks que muestran datos derivados (calendario, KPIs).
import { useEffect } from "react";

const target = new EventTarget();
const EVENT_NAME = "eventos:changed";

export function emitEventosChanged() {
  target.dispatchEvent(new Event(EVENT_NAME));
}

export function useEventosChanged(cb: () => void) {
  useEffect(() => {
    const handler = () => cb();
    target.addEventListener(EVENT_NAME, handler);
    return () => target.removeEventListener(EVENT_NAME, handler);
  }, [cb]);
}
