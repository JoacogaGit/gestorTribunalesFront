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
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
    const filas = extraerFilasDocx(html);
    if (filas.length > 0) {
      return { tipo: "docx", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: filas }] };
    }
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return { tipo: "docx", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: value }] };
  }


  if (lower.endsWith(".txt")) {
    const text = await file.text();
    return { tipo: "txt", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: text }] };
  }

  throw new Error("Formato no soportado. Usá .xlsx, .xls, .csv, .docx o .txt.");
}

// ============================================================
// Extracción estructurada de tablas de Word (.docx)
// Cada fila se convierte en una línea con columnas separadas por " | ".
// Las filas de título de sección (todas las celdas con el mismo texto
// en mayúsculas) se marcan como "### SECCIÓN: X".
// No se recorta contenido: se devuelven todas las filas.
// ============================================================

function esFilaSeccion(celdas: string[]): boolean {
  const noVacias = celdas.filter((c) => c !== "");
  if (noVacias.length === 0) return false;
  const primera = noVacias[0];
  const todasIguales = noVacias.every((c) => c === primera);
  const esMayus = primera === primera.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(primera);
  // Fila de una sola celda larga en mayúsculas o fila con todas las celdas repetidas
  return esMayus && (todasIguales || noVacias.length === 1) && primera.length > 3;
}

/** Convierte el HTML de mammoth en filas listas para el prompt de la IA. */
export function extraerFilasDocx(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tablas = Array.from(doc.querySelectorAll("table"));
  if (tablas.length === 0) return [];

  const filasSalida: string[][] = [];

  tablas.forEach((tabla, idxTabla) => {
    if (tablas.length > 1) filasSalida.push([`### TABLA ${idxTabla + 1}`]);
    let seccionActual = "";

    const filas = Array.from(tabla.querySelectorAll("tr"));
    for (const tr of filas) {
      const celdas = Array.from(tr.querySelectorAll("th, td")).map((td) =>
        (td.textContent ?? "").replace(/\s+/g, " ").trim(),
      );
      if (celdas.length === 0) continue;
      if (celdas.every((c) => c === "")) continue; // omitir filas vacías

      if (esFilaSeccion(celdas)) {
        // No se emite una fila propia: la sección se arrastra en cada fila de datos
        // para que no se pierda al dividir en lotes.
        seccionActual = celdas.find((c) => c !== "") ?? "";
        continue;
      }

      const linea = celdas.join(" | ");
      filasSalida.push([seccionActual ? `${linea} | SECCIÓN: ${seccionActual}` : linea]);
    }
  });

  return filasSalida;
}
