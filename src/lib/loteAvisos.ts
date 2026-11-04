// Agrupa los avisos de "cambiaron las causas/anotaciones" mientras dura un
// guardado de varios pasos (causa + imputados + anotaciones). Sin esto, cada
// paso dispara un refresco completo de las listas a mitad del guardado.
let profundidad = 0;
const pendientes = new Set<() => void>();

export function enLote(): boolean {
  return profundidad > 0;
}

/** Deja un aviso pendiente para cuando termine el lote actual. */
export function diferirAviso(flush: () => void) {
  pendientes.add(flush);
}

/** Ejecuta `fn` agrupando todos los avisos en uno solo al final. */
export async function conAvisosAgrupados<T>(fn: () => Promise<T>): Promise<T> {
  profundidad++;
  try {
    return await fn();
  } finally {
    profundidad--;
    if (profundidad === 0 && pendientes.size > 0) {
      const lista = Array.from(pendientes);
      pendientes.clear();
      lista.forEach((f) => f());
    }
  }
}
