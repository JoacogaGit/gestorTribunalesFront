// Registro de las listas de causas que están en pantalla, con sus filtros y orden
// ya aplicados, para que "Excel → Solo esta lista" exporte exactamente lo visible.
import type { Causa } from "@/data/mockCausas";

export interface VistaExportable {
  titulo: string;
  listKey?: string;
  filas: Causa[];
}

const vistas = new Map<symbol, VistaExportable>();

export function publicarVista(owner: symbol, vista: VistaExportable): void {
  vistas.set(owner, vista);
}

export function retirarVista(owner: symbol): void {
  vistas.delete(owner);
}

/** Listas visibles ahora mismo (puede haber varias, p. ej. vistas agrupadas). */
export function obtenerVistasActuales(): VistaExportable[] {
  return [...vistas.values()];
}
