import type { Causa } from "@/data/mockCausas";

/** Orden en que se ofrecen los estados de la causa en el filtro. */
const ORDEN_ESTADOS = [
  "En trámite", "En juicio", "Para sacar sentencia", "Para comunicar", "Delegada",
  "Casación", "REX", "Queja en Corte", "Apelación", "TSJ", "Terminada",
];

function ordenEstado(e: string) {
  const i = ORDEN_ESTADOS.indexOf(e);
  return i === -1 ? ORDEN_ESTADOS.length : i;
}

/** Estados presentes en la lista, en orden fijo. */
export function opcionesEstadoFiltro(causas: Pick<Causa, "estadoCausa">[]): string[] {
  const set = new Set<string>();
  for (const c of causas) if (c.estadoCausa) set.add(c.estadoCausa);
  return [...set].sort((a, b) => ordenEstado(a) - ordenEstado(b) || a.localeCompare(b, "es"));
}

/** Subestados del espacio más cualquier otro que ya tengan las causas de la lista. */
export function opcionesSubestadoFiltro(catalogo: string[], causas: Pick<Causa, "subestados">[]): string[] {
  const out = [...catalogo];
  const vistos = new Set(catalogo);
  for (const c of causas) {
    for (const s of c.subestados ?? []) {
      if (s && !vistos.has(s)) { vistos.add(s); out.push(s); }
    }
  }
  return out;
}

/** true si la causa pasa los filtros de estado y subestado (vacío = sin filtro). */
export function cumpleFiltroEstadoSubestado(
  c: Pick<Causa, "estadoCausa" | "subestados">,
  estados: string[],
  subestados: string[],
): boolean {
  if (estados.length > 0 && !estados.includes(c.estadoCausa)) return false;
  if (subestados.length > 0 && !(c.subestados ?? []).some((s) => subestados.includes(s))) return false;
  return true;
}
