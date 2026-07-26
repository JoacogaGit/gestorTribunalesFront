// Helpers de fechas con zona horaria FIJA de Argentina (America/Argentina/Buenos_Aires, UTC-3).
// La app debe verse igual sin importar dónde esté el usuario físicamente.

export const AR_TZ = "America/Argentina/Buenos_Aires";
/** Offset fijo de Argentina (no tiene DST). */
export const AR_OFFSET = "-03:00";

/** Devuelve un Date a partir de un string DATE o timestamp ISO. Para YYYY-MM-DD lo ancla a mediodía AR. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00${AR_OFFSET}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const allDay = value.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?(?:Z|\+00:?00)$/);
  if (allDay) {
    const d = new Date(`${allDay[1]}T12:00:00${AR_OFFSET}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function parseLocalTime(value: string | null | undefined): number {
  const d = parseLocalDate(value);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

/** Formatea con opciones arbitrarias forzando siempre timezone Argentina. */
export function formatAR(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = value instanceof Date ? value : parseLocalDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: AR_TZ, ...opts }).format(d);
}

/** dd/mm/aaaa en horario Argentina. */
export function formatLocalDate(value: string | null | undefined): string {
  return formatAR(value, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** dd/mm/aaaa hh:mm en horario Argentina. */
export function formatLocalDateTime(value: string | Date | null | undefined): string {
  return formatAR(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Devuelve partes calendáricas en zona AR. */
export function getARParts(value: string | Date | null | undefined): { y: string; m: string; d: string; h: string; min: string } | null {
  const d = value instanceof Date ? value : parseLocalDate(value);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const p: Record<string, string> = {};
  for (const x of parts) if (x.type !== "literal") p[x.type] = x.value;
  const h = p.hour === "24" ? "00" : p.hour;
  return { y: p.year, m: p.month, d: p.day, h, min: p.minute };
}

/** YYYY-MM-DD en zona AR. */
export function toARDateString(value: string | Date | null | undefined): string {
  const p = getARParts(value);
  return p ? `${p.y}-${p.m}-${p.d}` : "";
}

/** HH:MM en zona AR. */
export function toARTimeString(value: string | Date | null | undefined): string {
  const p = getARParts(value);
  return p ? `${p.h}:${p.min}` : "";
}

/** Convierte fecha (YYYY-MM-DD) + hora (HH:MM) de zona AR a ISO UTC. */
export function combineARToISO(fecha: string, hora: string | null | undefined): string | null {
  if (!fecha) return null;
  const h = hora && /^\d{2}:\d{2}$/.test(hora) ? hora : null;
  if (!h) return null;
  const d = new Date(`${fecha}T${h}:00${AR_OFFSET}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
