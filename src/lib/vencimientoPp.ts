// Lógica de cálculo automático de Vencimiento de Prisión Preventiva.
// REGLA:
// - Si hay vencimiento_pp cargado → ese es el efectivo (manual).
// - Si NO hay vencimiento_pp y NO hay vencimiento_pena pero hay fecha_detencion → calculado = fecha_detencion + 2 años.
// - Si hay vencimiento_pena cargado → no se muestra PP (prevalece la pena).

export interface PpInput {
  vencimiento_pp: string | null | undefined;
  vencimiento_pena: string | null | undefined;
  fecha_detencion: string | null | undefined;
}

export interface PpEfectivo {
  /** ISO YYYY-MM-DD o null si no aplica mostrar PP. */
  fecha: string | null;
  /** true si la fecha fue derivada de fecha_detencion + 2 años. */
  calculado: boolean;
}

/** Suma `years` años a una fecha ISO (YYYY-MM-DD o ISO completo). Devuelve YYYY-MM-DD. */
export function addYearsISO(iso: string, years: number): string {
  const base = iso.length === 10 ? iso + "T12:00:00" : iso;
  const d = new Date(base);
  if (isNaN(d.getTime())) return iso;
  d.setFullYear(d.getFullYear() + years);
  // YYYY-MM-DD en horario local
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcularPpEfectivo(s: PpInput): PpEfectivo {
  const pp = s.vencimiento_pp || null;
  const pena = s.vencimiento_pena || null;
  const det = s.fecha_detencion || null;
  if (pp) return { fecha: pp.slice(0, 10), calculado: false };
  if (pena) return { fecha: null, calculado: false };
  if (det) return { fecha: addYearsISO(det.slice(0, 10), 2), calculado: true };
  return { fecha: null, calculado: false };
}
