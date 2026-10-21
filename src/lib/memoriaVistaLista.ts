/**
 * Recuerda, mientras la pestaña del navegador sigue abierta, la búsqueda,
 * filtros, orden, página y posición de scroll de cada lista de causas.
 * Así, al volver de otra sección, la lista queda exactamente como estaba.
 */
export interface MemoriaVistaLista {
  search: string;
  sortBy: { key: string; dir: "asc" | "desc" } | null;
  categoriaFiltroId: string | null;
  subestadosFiltro: string[];
  page: number;
  scrollTop: number;
}

const memoria = new Map<string, Partial<MemoriaVistaLista>>();

export function leerMemoriaVista(clave: string | null): Partial<MemoriaVistaLista> {
  if (!clave) return {};
  return memoria.get(clave) ?? {};
}

export function guardarMemoriaVista(clave: string | null, patch: Partial<MemoriaVistaLista>) {
  if (!clave) return;
  memoria.set(clave, { ...(memoria.get(clave) ?? {}), ...patch });
}
