import * as XLSX from "xlsx";
import Papa from "papaparse";
import mammoth from "mammoth";

export type TipoArchivo = "excel" | "csv" | "docx" | "txt";

export interface PestanaParseada {
  nombre: string;
  /** Matriz de celdas si proviene de tabla; string si es texto plano. */
  contenido: string[][] | string;
}

export interface ArchivoParseado {
  tipo: TipoArchivo;
  nombreArchivo: string;
  pestanas: PestanaParseada[];
}

const MAX_BYTES = 10 * 1024 * 1024;

export async function parseMigracionFile(file: File): Promise<ArchivoParseado> {
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el tamaño máximo de 10 MB.");
  }
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const pestanas: PestanaParseada[] = wb.SheetNames.map((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, defval: "" });
      const norm = rows.map((row) => (row ?? []).map((c) => String(c ?? "").trim()));
      return { nombre: sheetName, contenido: norm };
    });
    return { tipo: "excel", nombreArchivo: file.name, pestanas };
  }

  if (lower.endsWith(".csv")) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return {
      tipo: "csv",
      nombreArchivo: file.name,
      pestanas: [{ nombre: file.name, contenido: result.data.map((r) => r.map((c) => String(c ?? "").trim())) }],
    };
  }

  if (lower.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return { tipo: "docx", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: value }] };
  }

  if (lower.endsWith(".txt")) {
    const text = await file.text();
    return { tipo: "txt", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: text }] };
  }

  throw new Error("Formato no soportado. Usá .xlsx, .xls, .csv, .docx o .txt.");
}
