// Columnas extra por imputado detenido para la exportación de listas a Excel.
import { formatAR, parseLocalTime } from "@/lib/parseDate";

export const HEADERS_DETENIDOS_EXTRA = [
  "Lugar de detención",
  "Fecha de detención",
  "Prescripción",
  "Vencimiento de pena",
  "Vencimiento de prisión preventiva",
  "Anotaciones de la causa",
];

export interface SujetoDetenidoExport {
  lugar_alojamiento?: string | null;
  fecha_detencion?: string | null;
  prescripcion_fecha?: string | null;
  vencimiento_pena?: string | null;
  vencimiento_pp?: string | null;
}

export interface EventoExport {
  causa_id: string;
  titulo: string | null;
  fecha_hora: string | null;
}

/** dd/mm/aaaa en hora Argentina; celda en blanco si no hay fecha. */
export function fechaCelda(value: string | null | undefined): string {
  if (!value) return "";
  const txt = formatAR(value, { day: "2-digit", month: "2-digit", year: "numeric" });
  return txt === "—" ? "" : txt;
}

/** Agrupa las anotaciones por causa como "Título (dd/mm/aaaa)", ordenadas por fecha (sin fecha al final). */
export function anotacionesPorCausa(eventos: EventoExport[]): Map<string, string> {
  const porCausa = new Map<string, EventoExport[]>();
  for (const e of eventos) {
    if (!e?.causa_id) continue;
    if (!porCausa.has(e.causa_id)) porCausa.set(e.causa_id, []);
    porCausa.get(e.causa_id)!.push(e);
  }
  const out = new Map<string, string>();
  for (const [causaId, lista] of porCausa) {
    const textos = [...lista]
      .sort((a, b) => parseLocalTime(a.fecha_hora) - parseLocalTime(b.fecha_hora))
      .map((e) => {
        const titulo = (e.titulo ?? "").trim();
        const fecha = fechaCelda(e.fecha_hora);
        if (!titulo && !fecha) return "";
        return fecha ? `${titulo || "Sin título"} (${fecha})` : titulo;
      })
      .filter(Boolean);
    if (textos.length) out.set(causaId, textos.join("; "));
  }
  return out;
}

/** Celdas extra de un detenido, en el orden de HEADERS_DETENIDOS_EXTRA. Vacío = celda en blanco. */
export function columnasDetenido(sujeto: SujetoDetenidoExport, anotaciones: string | undefined): string[] {
  return [
    (sujeto.lugar_alojamiento ?? "").trim(),
    fechaCelda(sujeto.fecha_detencion),
    fechaCelda(sujeto.prescripcion_fecha),
    fechaCelda(sujeto.vencimiento_pena),
    fechaCelda(sujeto.vencimiento_pp),
    anotaciones ?? "",
  ];
}
