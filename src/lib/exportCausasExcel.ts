import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { EP_INSTRUCCION, EP_ELEVADAS, EP_RECURRIDAS } from "@/lib/estadosProcesales";

interface SujetoRow {
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: string;
  borrado_en: string | null;
}

interface CausaRow {
  id: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: string;
  tipo_recurso: string | null;
  despachante: string | null;
  empleado_a_cargo: string | null;
  fuero: string | null;
  estado_procesal: string | null;
  sujetos: SujetoRow[];
}

const SELECT = "id,expediente_nro,caratula,estado_causa,tipo_recurso,despachante,empleado_a_cargo,fuero,estado_procesal,borrado_en,sujetos(id,nombre_completo,delito,situacion_libertad,borrado_en)";

const HEADERS = ["N° Expediente", "Carátula", "Estado", "Imputado", "Fuero", "Delito", "Responsable"];

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
    default: return c.estado_causa;
  }
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[[\]:*?/\\]/g, "").trim().slice(0, 31) || "Hoja";
  let final = base;
  let i = 2;
  while (used.has(final.toLowerCase())) {
    const suffix = ` (${i++})`;
    final = (base.slice(0, 31 - suffix.length) + suffix);
  }
  used.add(final.toLowerCase());
  return final;
}

export interface ExportOptions {
  vocaliaId: string;
  nombreOficina: string;
  esEstudio: boolean;
}

/** Genera y descarga un .xlsx con una hoja por lista de causas de la oficina. */
export async function exportarCausasXlsx({ vocaliaId, nombreOficina, esEstudio }: ExportOptions): Promise<number> {
  const { data, error } = await supabase
    .from("causas")
    .select(SELECT)
    .eq("vocalia_id", vocaliaId)
    .is("borrado_en", null);
  if (error) throw error;

  const causas = ((data ?? []) as unknown as CausaRow[]).map((c) => ({
    ...c,
    sujetos: (c.sujetos ?? []).filter((s) => s.borrado_en == null),
  }));

  const toRow = (c: CausaRow): (string | null)[] => [
    c.expediente_nro,
    c.caratula ?? "",
    estadoLabel(c),
    c.sujetos.map((s) => s.nombre_completo).join("; "),
    c.fuero ?? "",
    Array.from(new Set(c.sujetos.map((s) => (s.delito ?? "").trim()).filter(Boolean))).join("; "),
    ((esEstudio ? c.empleado_a_cargo : c.despachante) ?? "").trim(),
  ];

  const tiene = (c: CausaRow, sit: string) => c.sujetos.some((s) => s.situacion_libertad === sit);
  const ep = (c: CausaRow) => (c.estado_procesal ?? "").trim();

  const sheets: { name: string; rows: (string | null)[][] }[] = [];

  if (esEstudio) {
    const porFuero = new Map<string, CausaRow[]>();
    causas.forEach((c) => {
      const f = (c.fuero ?? "").trim() || "Sin fuero";
      if (!porFuero.has(f)) porFuero.set(f, []);
      porFuero.get(f)!.push(c);
    });
    [...porFuero.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .forEach(([f, list]) => sheets.push({ name: `Fuero ${f}`, rows: list.map(toRow) }));
    sheets.push({ name: "Delitos", rows: causas.map(toRow) });
    sheets.push({ name: "Instrucción", rows: causas.filter((c) => EP_INSTRUCCION.includes(ep(c))).map(toRow) });
    sheets.push({ name: "Elevadas a juicio", rows: causas.filter((c) => EP_ELEVADAS.includes(ep(c))).map(toRow) });
    sheets.push({ name: "Recurridas", rows: causas.filter((c) => EP_RECURRIDAS.includes(ep(c))).map(toRow) });
    sheets.push({ name: "Detenidos", rows: causas.filter((c) => tiene(c, "detenido")).map(toRow) });
    sheets.push({ name: "SJP", rows: causas.filter((c) => tiene(c, "probation")).map(toRow) });
  } else {
    sheets.push({ name: "Trámite", rows: causas.filter((c) => c.estado_causa === "tramite" && !tiene(c, "rebelde") && !tiene(c, "probation")).map(toRow) });
    sheets.push({ name: "Detenidos", rows: causas.filter((c) => tiene(c, "detenido")).map(toRow) });
    sheets.push({ name: "SJP", rows: causas.filter((c) => tiene(c, "probation")).map(toRow) });
    sheets.push({ name: "Rebeldes", rows: causas.filter((c) => tiene(c, "rebelde")).map(toRow) });
    sheets.push({ name: "Recursos", rows: causas.filter((c) => c.estado_causa === "recurso").map(toRow) });
    sheets.push({ name: "Delegadas", rows: causas.filter((c) => c.estado_causa === "delegada").map(toRow) });
    sheets.push({ name: "Terminadas", rows: causas.filter((c) => c.estado_causa === "terminada").map(toRow) });
  }

  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    ws["!cols"] = [{ wch: 18 }, { wch: 45 }, { wch: 14 }, { wch: 35 }, { wch: 18 }, { wch: 30 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name, usedNames));
  }

  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const safeOficina = (nombreOficina || "oficina")
    .replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ -]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  XLSX.writeFile(wb, `IusTrack_causas_${safeOficina}_${fecha}.xlsx`);
  return causas.length;
}
