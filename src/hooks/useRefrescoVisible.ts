import { useEffect, useRef } from "react";
import { useCausasChanged } from "@/lib/causasBus";
import { useEventosChanged } from "@/lib/eventosBus";

/**
 * Carga `fetchAll` al montarse / al cambiar sus dependencias y la repite ante
 * cambios de causas o anotaciones, pero solo mientras la pantalla que la usa
 * está visible. Si cambió algo estando oculta, se pone al día al volver.
 */
export function useRefrescoVisible(fetchAll: () => unknown, enabled = true) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const pendiente = useRef(true);
  const ultimoFetch = useRef(fetchAll);

  useEffect(() => {
    const cambioFetch = ultimoFetch.current !== fetchAll;
    ultimoFetch.current = fetchAll;
    if (cambioFetch) pendiente.current = true;
    if (enabled && pendiente.current) {
      pendiente.current = false;
      void fetchAll();
    }
  }, [fetchAll, enabled]);

  const alCambiar = () => {
    if (enabledRef.current) void ultimoFetch.current();
    else pendiente.current = true;
  };
  useCausasChanged(alCambiar);
  useEventosChanged(alCambiar);
}
