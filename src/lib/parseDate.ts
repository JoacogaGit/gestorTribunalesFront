// Helper para parsear fechas DATE/timestamp respetando zona horaria local.
// Las fechas DATE de Postgres (YYYY-MM-DD) NO deben interpretarse como UTC
// porque al renderizar en Argentina (UTC-3) aparecerían UN DÍA ANTES.
// Usamos T12:00:00 (mediodía local) para evitar cualquier corrimiento por timezone
// o DST sin importar la zona horaria del usuario.

/** Devuelve un Date local a partir de un string de fecha o timestamp ISO. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // YYYY-MM-DD puro → interpretar como mediodía local (anti-timezone shift).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // ISO "all-day" guardado como UTC medianoche (T00:00:00Z): extraer la fecha
  // y reparsear a mediodía local para que no se renderice un día antes.
  const allDay = value.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?(?:Z|\+00:?00)$/);
  if (allDay) {
    const d = new Date(`${allDay[1]}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Timestamp ISO con hora real → parseo nativo.
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** ms epoch (o NaN-safe Number.MAX_SAFE_INTEGER para fechas inválidas). */
export function parseLocalTime(value: string | null | undefined): number {
  const d = parseLocalDate(value);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

/** Formatea como dd/mm/aaaa argentino respetando zona local. */
export function formatLocalDate(value: string | null | undefined): string {
  const d = parseLocalDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("es-AR");
}
