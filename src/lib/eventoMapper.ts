// Helpers de calendario: mapping DB → eventos UI + semáforo cromático.

export type CalendarTipo = "evento" | "vencimiento_pp" | "vencimiento_pena" | "prescripcion";

export interface CalendarEvento {
  id: string;
  fecha: string; // ISO date or datetime
  hora?: string; // "HH:MM"
  titulo: string;
  descripcion?: string;
  tipo: CalendarTipo;
  tipoEventoRaw?: string | null;
  causaId: string;
  causaNumero: string;
  causaCaratula: string;
  sujetoId?: string;
}

export const CALENDAR_TIPO_LABEL: Record<CalendarTipo, string> = {
  evento: "Eventos manuales",
  vencimiento_pp: "Vencimientos de Prisión Preventiva",
  vencimiento_pena: "Vencimientos de Pena",
  prescripcion: "Prescripciones",
};

// ===== Semáforo cromático (usa tokens semánticos del design system) =====
export type SemaforoBucket = "vencido" | "muy_urgente" | "urgente" | "medio" | "lejano";

export function getSemaforoBucket(fecha: string): SemaforoBucket {
  const d = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (d <= 0) return "vencido";
  if (d <= 7) return "muy_urgente";
  if (d <= 30) return "urgente";
  if (d <= 60) return "medio";
  return "lejano";
}

export function getSemaforoBg(fecha: string): string {
  switch (getSemaforoBucket(fecha)) {
    case "vencido": return "bg-alert-urgent/25 border-l-alert-urgent";
    case "muy_urgente": return "bg-alert-warning/25 border-l-alert-warning";
    case "urgente": return "bg-alert-warning/10 border-l-alert-warning/70";
    case "medio": return "bg-gold/15 border-l-gold";
    case "lejano": return "bg-alert-ok/15 border-l-alert-ok";
  }
}

export function getSemaforoDot(fecha: string): string {
  switch (getSemaforoBucket(fecha)) {
    case "vencido": return "bg-alert-urgent";
    case "muy_urgente": return "bg-alert-warning";
    case "urgente": return "bg-alert-warning/70";
    case "medio": return "bg-gold";
    case "lejano": return "bg-alert-ok";
  }
}

export function getSemaforoText(fecha: string): string {
  switch (getSemaforoBucket(fecha)) {
    case "vencido": return "text-alert-urgent font-bold";
    case "muy_urgente": return "text-alert-warning font-semibold";
    case "urgente": return "text-alert-warning";
    case "medio": return "text-gold";
    case "lejano": return "text-alert-ok";
  }
}

// ===== Mappers =====
type DbCausaJoin = {
  id: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: string;
};

export type DbEventoRow = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  tipo_evento: string | null;
  causa_id: string;
  sujeto_id: string | null;
  causas: DbCausaJoin | DbCausaJoin[] | null;
};

export type DbSujetoFechaRow = {
  id: string;
  nombre_completo: string;
  causa_id: string;
  vencimiento_pp?: string | null;
  vencimiento_pena?: string | null;
  prescripcion_fecha?: string | null;
  causas: DbCausaJoin | DbCausaJoin[] | null;
};

function pickCausa(c: DbCausaJoin | DbCausaJoin[] | null): DbCausaJoin | null {
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function caratulaOf(c: DbCausaJoin | null): string {
  if (!c) return "—";
  return c.caratula || c.expediente_nro || "—";
}

export function mapDbEventoToCalendar(row: DbEventoRow): CalendarEvento | null {
  if (!row.fecha_hora) return null;
  const causa = pickCausa(row.causas);
  if (!causa) return null;
  const fecha = row.fecha_hora;
  const dt = new Date(fecha);
  const hora = isNaN(dt.getTime()) ? undefined : dt.toTimeString().slice(0, 5);
  return {
    id: `evento-${row.id}`,
    fecha,
    hora,
    titulo: row.titulo,
    descripcion: row.descripcion ?? undefined,
    tipo: "evento",
    tipoEventoRaw: row.tipo_evento,
    causaId: causa.id,
    causaNumero: causa.expediente_nro,
    causaCaratula: caratulaOf(causa),
    sujetoId: row.sujeto_id ?? undefined,
  };
}

export function mapSujetoFechaToCalendar(
  row: DbSujetoFechaRow,
  campo: "vencimiento_pp" | "vencimiento_pena" | "prescripcion_fecha",
  tipo: CalendarTipo,
  tituloPrefix: string,
): CalendarEvento | null {
  const fecha = row[campo];
  if (!fecha) return null;
  const causa = pickCausa(row.causas);
  if (!causa) return null;
  return {
    id: `${tipo}-${row.id}`,
    fecha,
    titulo: `${tituloPrefix} — ${row.nombre_completo}`,
    tipo,
    causaId: causa.id,
    causaNumero: causa.expediente_nro,
    causaCaratula: caratulaOf(causa),
    sujetoId: row.id,
  };
}
