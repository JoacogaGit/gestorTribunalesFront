import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { EP_INSTRUCCION, EP_ELEVADAS, EP_RECURRIDAS } from "@/lib/estadosProcesales";
import { anotacionesPorCausa, columnasDetenido, HEADERS_DETENIDOS_EXTRA, type EventoExport } from "@/lib/exportDetenidos";
import type { VistaExportable } from "@/lib/vistaExportable";

interface SujetoRow {
  id: string;
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: string;
  borrado_en: string | null;
  lugar_alojamiento: string | null;
  fecha_detencion: string | null;
  prescripcion_fecha: string | null;
  vencimiento_pena: string | null;
  vencimiento_pp: string | null;
}

interface CausaRow {
  id: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: string;
  tipo_recurso: string | null;
  subestados: string[] | null;
  flagrancia: boolean | null;
  delegada: boolean | null;
  art196bis: boolean | null;
  despachante: string | null;
  empleado_a_cargo: string | null;
  fuero: string | null;
  estado_procesal: string | null;
  sujetos: SujetoRow[];
}

const SELECT = "id,expediente_nro,caratula,estado_causa,tipo_recurso,subestados,flagrancia,delegada,art196bis,despachante,empleado_a_cargo,fuero,estado_procesal,borrado_en,sujetos(id,nombre_completo,delito,situacion_libertad,borrado_en,lugar_alojamiento,fecha_detencion,prescripcion_fecha,vencimiento_pena,vencimiento_pp)";

const HEADERS = ["N° Expediente", "Carátula", "Estado", "Subestados", "Flagrancia", "Delegada", "196bis/NN", "Imputado", "Fuero", "Delito", "Responsable"];
const HEADERS_DETENIDOS = [...HEADERS, ...HEADERS_DETENIDOS_EXTRA];
const COLS = [
  { wch: 18 }, { wch: 45 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  { wch: 35 }, { wch: 18 }, { wch: 30 }, { wch: 22 },
];
const COLS_DETENIDOS = [...COLS, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 60 }];

const LABEL_RECURSO: Record<string, string> = {
  casacion: "Casación",
  rex: "REX",
  queja_corte: "Queja en Corte",
  apelacion: "Apelación",
  tsj: "TSJ",
};

function estadoLabel(c: CausaRow): string {
  switch (c.estado_causa) {
    case "tramite": return "Trámite";
    case "recurso": return LABEL_RECURSO[c.tipo_recurso ?? ""] ?? "Recurso";
    case "terminada": return "Terminada";
    case "delegada": return "Delegada";
    case "para_sentencia": return "Para sacar sentencia";
    case "para_comunicar": return "Para comunicar";
    default: return c.estado_causa;
  }
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, "").trim().slice(0, 31) || "Hoja";
  let final = base;
  let i = 2;
  while (used.has(final.toLowerCase())) {
    const suffix = ` (${i++})`;
    final = (base.slice(0, 31 - suffix.length) + suffix);
  }
  used.add(final.toLowerCase());
  return final;
}

function limpiarSujetos(rows: CausaRow[]): CausaRow[] {
  return rows.map((c) => ({ ...c, sujetos: (c.sujetos ?? []).filter((s) => s.borrado_en == null) }));
}

/** Trae causas por id en tandas (evita URLs demasiado largas). */
async function fetchCausasPorIds(ids: string[]): Promise<CausaRow[]> {
  const out: CausaRow[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from("causas")
      .select(SELECT)
      .in("id", ids.slice(i, i + 150))
      .is("borrado_en", null);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as CausaRow[]));
  }
  return limpiarSujetos(out);
}

/** Anotaciones (eventos no borrados) de las causas indicadas, agrupadas por causa. */
async function fetchAnotaciones(causaIds: string[]): Promise<Map<string, string>> {
  const eventos: EventoExport[] = [];
  const unicos = [...new Set(causaIds)];
  for (let i = 0; i < unicos.length; i += 150) {
    const chunk = unicos.slice(i, i + 150);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("eventos")
        .select("causa_id,titulo,fecha_hora")
        .in("causa_id", chunk)
        .is("borrado_en", null)
        .order("fecha_hora", { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      eventos.push(...((data ?? []) as EventoExport[]));
      if (!data || data.length < 1000) break;
    }
  }
  return anotacionesPorCausa(eventos);
}

type Fila = (string | null)[];

function makeToRow(esEstudio: boolean) {
  return (c: CausaRow, sujetos: SujetoRow[] = c.sujetos): Fila => [
    c.expediente_nro,
    c.caratula ?? "",
    estadoLabel(c),
    (c.subestados ?? []).join(", "),
    c.flagrancia ? "Sí" : "No",
    (c.delegada || c.estado_causa === "delegada") ? "Sí" : "No",
    c.art196bis ? "Sí" : "No",
    sujetos.map((s) => s.nombre_completo).join("; "),
    c.fuero ?? "",
    Array.from(new Set(sujetos.map((s) => (s.delito ?? "").trim()).filter(Boolean))).join("; "),
    ((esEstudio ? c.empleado_a_cargo : c.despachante) ?? "").trim(),
  ];
}

function makeDetenidoRow(esEstudio: boolean, anotaciones: Map<string, string>) {
  const toRow = makeToRow(esEstudio);
  return (c: CausaRow, s: SujetoRow): Fila => [...toRow(c, [s]), ...columnasDetenido(s, anotaciones.get(c.id))];
}

interface Hoja { name: string; rows: Fila[]; detenidos?: boolean }

function descargar(hojas: Hoja[], nombreOficina: string, sufijo: string) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  for (const { name, rows, detenidos } of hojas) {
    const ws = XLSX.utils.aoa_to_sheet([detenidos ? HEADERS_DETENIDOS : HEADERS, ...rows]);
    ws["!cols"] = detenidos ? COLS_DETENIDOS : COLS;
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name, usedNames));
  }
  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const limpiar = (t: string) => (t || "")
    .replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ -]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const safeOficina = limpiar(nombreOficina) || "oficina";
  const safeSufijo = limpiar(sufijo);
  XLSX.writeFile(wb, `IusTrack_${safeSufijo ? `${safeSufijo}_` : "causas_"}${safeOficina}_${fecha}.xlsx`);
}

export interface ExportOptions {
  vocaliaId: string;
  nombreOficina: string;
  esEstudio: boolean;
}

/** "Toda la oficina": genera y descarga un .xlsx con una hoja por lista de causas. */
export async function exportarCausasXlsx({ vocaliaId, nombreOficina, esEstudio }: ExportOptions): Promise<number> {
  const { data, error } = await supabase
    .from("causas")
    .select(SELECT)
    .eq("vocalia_id", vocaliaId)
    .is("borrado_en", null);
  if (error) throw error;

  const causas = limpiarSujetos((data ?? []) as unknown as CausaRow[]);
  const toRow = makeToRow(esEstudio);

  const tiene = (c: CausaRow, sit: string) => c.sujetos.some((s) => s.situacion_libertad === sit);
  const ep = (c: CausaRow) => (c.estado_procesal ?? "").trim();
  const esDelegada = (c: CausaRow) => !!c.delegada || c.estado_causa === "delegada";

  // Detenidos: una fila por imputado detenido, con sus datos y las anotaciones de su causa.
  const conDetenidos = causas.filter((c) => tiene(c, "detenido"));
  const anotaciones = conDetenidos.length ? await fetchAnotaciones(conDetenidos.map((c) => c.id)) : new Map<string, string>();
  const detenidoRow = makeDetenidoRow(esEstudio, anotaciones);
  const filasDetenidos = conDetenidos.flatMap((c) =>
    c.sujetos.filter((s) => s.situacion_libertad === "detenido").map((s) => detenidoRow(c, s)));
  const hojaDetenidos: Hoja = { name: "Detenidos", rows: filasDetenidos, detenidos: true };

  const sheets: Hoja[] = [];

  if (esEstudio) {
    const porFuero = new Map<string, CausaRow[]>();
    causas.forEach((c) => {
      const f = (c.fuero ?? "").trim() || "Sin fuero";
      if (!porFuero.has(f)) porFuero.set(f, []);
      porFuero.get(f)!.push(c);
    });
    [...porFuero.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .forEach(([f, list]) => sheets.push({ name: `Fuero ${f}`, rows: list.map((c) => toRow(c)) }));
    sheets.push({ name: "Delitos", rows: causas.map((c) => toRow(c)) });
    sheets.push({ name: "Instrucción", rows: causas.filter((c) => EP_INSTRUCCION.includes(ep(c))).map((c) => toRow(c)) });
    sheets.push({ name: "Elevadas a juicio", rows: causas.filter((c) => EP_ELEVADAS.includes(ep(c))).map((c) => toRow(c)) });
    sheets.push({ name: "Recurridas", rows: causas.filter((c) => EP_RECURRIDAS.includes(ep(c))).map((c) => toRow(c)) });
    sheets.push(hojaDetenidos);
    sheets.push({ name: "SJP", rows: causas.filter((c) => tiene(c, "probation")).map((c) => toRow(c)) });
  } else {
    sheets.push({ name: "Trámite", rows: causas.filter((c) => c.estado_causa === "tramite" && !esDelegada(c) && !c.art196bis && !tiene(c, "rebelde") && !tiene(c, "probation")).map((c) => toRow(c)) });
    sheets.push(hojaDetenidos);
    sheets.push({ name: "SJP", rows: causas.filter((c) => tiene(c, "probation")).map((c) => toRow(c)) });
    sheets.push({ name: "Rebeldes", rows: causas.filter((c) => tiene(c, "rebelde")).map((c) => toRow(c)) });
    sheets.push({ name: "Recursos", rows: causas.filter((c) => c.estado_causa === "recurso").map((c) => toRow(c)) });
    sheets.push({ name: "Delegadas", rows: causas.filter(esDelegada).map((c) => toRow(c)) });
    sheets.push({ name: "196bis/NN", rows: causas.filter((c) => c.art196bis).map((c) => toRow(c)) });
    sheets.push({ name: "Terminadas", rows: causas.filter((c) => c.estado_causa === "terminada").map((c) => toRow(c)) });
  }

  descargar(sheets, nombreOficina, "causas");
  return causas.length;
}

/** Separa "causaId::sujetoId" (filas de Detenidos). */
function partesRowKey(rowKey: string | undefined, causaId: string): { causaId: string; sujetoId: string | null } {
  if (rowKey && rowKey.includes("::")) {
    const [c, s] = rowKey.split("::");
    return { causaId: c || causaId, sujetoId: s || null };
  }
  return { causaId, sujetoId: null };
}

/**
 * "Solo esta lista": exporta exactamente las filas visibles (con filtros y orden aplicados),
 * una hoja por lista en pantalla. Devuelve la cantidad de filas exportadas.
 */
export async function exportarVistaActualXlsx(
  vistas: VistaExportable[],
  { nombreOficina, esEstudio }: { nombreOficina: string; esEstudio: boolean },
): Promise<number> {
  const ids = [...new Set(vistas.flatMap((v) => v.filas.map((f) => partesRowKey(f.rowKey, f.id).causaId)))];
  const causas = ids.length ? await fetchCausasPorIds(ids) : [];
  const porId = new Map(causas.map((c) => [c.id, c]));
  const toRow = makeToRow(esEstudio);

  const hayDetenidos = vistas.some((v) => v.listKey === "detenidos");
  const idsDetenidos = hayDetenidos
    ? vistas.filter((v) => v.listKey === "detenidos").flatMap((v) => v.filas.map((f) => partesRowKey(f.rowKey, f.id).causaId))
    : [];
  const anotaciones = idsDetenidos.length ? await fetchAnotaciones(idsDetenidos) : new Map<string, string>();
  const detenidoRow = makeDetenidoRow(esEstudio, anotaciones);

  let total = 0;
  const hojas: Hoja[] = vistas.map((v) => {
    const esDet = v.listKey === "detenidos";
    const rows: Fila[] = [];
    for (const f of v.filas) {
      const { causaId, sujetoId } = partesRowKey(f.rowKey, f.id);
      const c = porId.get(causaId);
      if (!c) continue;
      if (esDet) {
        const sujetos = sujetoId
          ? c.sujetos.filter((s) => s.id === sujetoId)
          : c.sujetos.filter((s) => s.situacion_libertad === "detenido");
        sujetos.forEach((s) => rows.push(detenidoRow(c, s)));
      } else {
        rows.push(toRow(c));
      }
    }
    total += rows.length;
    return { name: v.titulo || "Lista", rows, detenidos: esDet };
  });

  descargar(hojas, nombreOficina, vistas.length === 1 ? vistas[0].titulo : "lista");
  return total;
}
