/** Cálculo de vencimientos de plazos (fechas como "YYYY-MM-DD", sin zona horaria). */
export type TipoDias = "corridos" | "habiles";

function aDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function calcularVencimiento(inicio: string, dias: number, tipo: TipoDias, inhabiles: Set<string> = new Set()): string {
  const d = aDate(inicio);
  const n = Math.max(0, Math.floor(dias));
  if (tipo === "corridos") {
    d.setUTCDate(d.getUTCDate() + n);
    return aIso(d);
  }
  let contados = 0;
  while (contados < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6 || inhabiles.has(aIso(d))) continue;
    contados++;
  }
  return aIso(d);
}

/** Hoy en Argentina (UTC-3) como "YYYY-MM-DD". */
export function hoyArgentina(): string {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
}

interface ConCreacion { created_at?: string | null; fecha_hora?: string | null }
const ts = (v?: string | null) => { if (!v) return NaN; const t = new Date(v).getTime(); return t; };

/** Panel de anotaciones: lo cargado más reciente arriba; desempate por fecha del evento desc, sin fecha al final. */
export function ordenarPorCarga<T extends ConCreacion>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ca = ts(a.created_at), cb = ts(b.created_at);
    const va = isNaN(ca) ? -Infinity : ca, vb = isNaN(cb) ? -Infinity : cb;
    if (va !== vb) return vb - va;
    const fa = ts(a.fecha_hora), fb = ts(b.fecha_hora);
    const na = isNaN(fa), nb = isNaN(fb);
    if (na && nb) return 0;
    if (na) return 1;
    if (nb) return -1;
    return fb - fa;
  });
}
