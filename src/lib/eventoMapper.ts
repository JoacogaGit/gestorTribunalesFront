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
export type SemaforoBucket = "vencido" | "muy_urgente" | "urgente" | "medio" | "lejano" | "lejano_ok";

export function getSemaforoBucket(fecha: string): SemaforoBucket {
  const d = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (d <= 4) return "vencido";       // incluye vencidos y 0-4d → rojo potente
  if (d <= 10) return "muy_urgente";  // 5-10d
  if (d <= 20) return "urgente";      // 11-20d → naranja fuerte
  if (d <= 30) return "medio";        // 21-30d → naranja claro
  if (d <= 60) return "lejano";       // 31-60d → amarillo
  return "lejano_ok";
}

export function getSemaforoBg(fecha: string): string {
  switch (getSemaforoBucket(fecha)) {
    case "vencido": return "bg-red-600/90 text-white border-l-red-700";
    case "muy_urgente": return "bg-red-400/80 text-white border-l-red-500";
    case "urgente": return "bg-orange-500/80 text-white border-l-orange-600";
    case "medio": return "bg-orange-300/70 text-orange-950 border-l-orange-400";
    case "lejano": return "bg-yellow-400/70 text-yellow-950 border-l-yellow-500";
    case "lejano_ok": return "bg-green-500/30 text-foreground border-l-green-600";
  }
}

export function getSemaforoDot(fecha: string): string {
  switch (getSemaforoBucket(fecha)) {
    case "vencido": return "bg-red-600";
    case "muy_urgente": return "bg-red-400";
    case "urgente": return "bg-orange-500";
    case "medio": return "bg-orange-300";
    case "lejano": return "bg-yellow-400";
    case "lejano_ok": return "bg-green-500";
  }
}

export function getSemaforoText(fecha: string): string {
  switch (getSemaforoBucket(fecha)) {
    case "vencido": return "text-red-600 font-bold";
    case "muy_urgente": return "text-red-500 font-semibold";
    case "urgente": return "text-orange-600 font-semibold";
    case "medio": return "text-orange-500";
    case "lejano": return "text-yellow-600";
    case "lejano_ok": return "text-green-600";
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
