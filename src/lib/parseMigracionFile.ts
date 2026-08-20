import * as XLSX from "xlsx";
import Papa from "papaparse";
import mammoth from "mammoth";

export type TipoArchivo = "excel" | "csv" | "docx" | "txt" | "lex100" | "pdf";

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
    let esLex100 = false;
    const pestanas: PestanaParseada[] = wb.SheetNames.map((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, defval: "" });
      const norm = rows.map((row) => (row ?? []).map((c) => String(c ?? "").trim()));
      const idxLex = detectarFilaEncabezadoLex100(norm);
      if (idxLex >= 0) {
        esLex100 = true;
        return { nombre: sheetName, contenido: construirTextoLex100(norm.slice(idxLex)) };
      }
      return { nombre: sheetName, contenido: norm };
    });
    return { tipo: esLex100 ? "lex100" : "excel", nombreArchivo: file.name, pestanas };
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


  if (lower.endsWith(".pdf")) {
    const texto = await extraerTextoPdf(await file.arrayBuffer());
    if (!texto.trim()) {
      throw new Error(
        "Este PDF parece ser una imagen escaneada y no se puede leer automáticamente. Probá exportando en Excel.",
      );
    }
    return { tipo: "pdf", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: texto }] };
  }

  if (lower.endsWith(".txt")) {
    const text = await file.text();
    return { tipo: "txt", nombreArchivo: file.name, pestanas: [{ nombre: file.name, contenido: text }] };
  }

  throw new Error("Formato no soportado. Usá .xlsx, .xls, .csv, .docx, .pdf o .txt.");
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

// ============================================================
// Detección de formato Lex100 (justicia argentina)
// El encabezado real no está en la primera fila: se busca la fila
// cuya primera columna sea exactamente "Clave Expediente" y que
// tenga ~94 columnas.
// ============================================================

/** Devuelve el índice de la fila de encabezados Lex100, o -1 si no es Lex100. */
export function detectarFilaEncabezadoLex100(filas: string[][]): number {
  const limite = Math.min(filas.length, 20);
  for (let i = 0; i < limite; i++) {
    const fila = filas[i] ?? [];
    const primera = String(fila[0] ?? "").trim().toLowerCase();
    if (primera === "clave expediente") return i;
  }
  return -1;
}

/** Columnas útiles de Lex100: etiqueta a mostrar -> posibles encabezados. */
const LEX100_COLUMNAS: { etiqueta: string; alias: string[] }[] = [
  { etiqueta: "Expediente", alias: ["clave expediente"] },
  { etiqueta: "Autos", alias: ["autos"] },
  { etiqueta: "En trámite", alias: ["en tramite", "en trámite"] },
  { etiqueta: "Cerrado", alias: ["cerrado"] },
  { etiqueta: "Con detenidos", alias: ["con detendidos", "con detenidos"] },
  { etiqueta: "Con menores", alias: ["con menores"] },
];

const normHeader = (s: string) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Convierte una planilla Lex100 (encabezado en la primera fila recibida) en
 * líneas de texto legibles con sólo las columnas útiles.
 */
export function construirTextoLex100(filas: string[][]): string {
  if (filas.length === 0) return "";
  const encabezado = (filas[0] ?? []).map(normHeader);
  const indices = LEX100_COLUMNAS.map(({ etiqueta, alias }) => ({
    etiqueta,
    idx: encabezado.findIndex((h) => alias.some((a) => h === normHeader(a))),
  }));

  const lineaEncabezado = indices.map(({ etiqueta }) => `${etiqueta}: <valor>`).join(" | ");

  const lineas = filas
    .slice(1)
    .map((fila) =>
      indices
        .map(({ etiqueta, idx }) => `${etiqueta}: ${idx >= 0 ? String(fila[idx] ?? "").trim() : ""}`)
        .join(" | "),
    )
    .filter((linea) => {
      const valores = linea.split(" | ").map((p) => p.split(": ").slice(1).join(": ").trim());
      return valores.some((v) => v !== "" && v !== "<valor>");
    });

  return [lineaEncabezado, ...lineas].join("\n");
}


// ============================================================
// Extracción de texto de PDF (pdfjs-dist), página por página,
// agrupando ítems por línea según su coordenada Y.
// ============================================================

async function extraerTextoPdf(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const paginas: string[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const lineas = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items as any[]) {
      const str = String(item.str ?? "");
      if (!str.trim()) continue;
      const x = item.transform?.[4] ?? 0;
      const y = Math.round((item.transform?.[5] ?? 0) / 3) * 3; // tolerancia vertical
      const arr = lineas.get(y) ?? [];
      arr.push({ x, str });
      lineas.set(y, arr);
    }

    const ordenadas = Array.from(lineas.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str.trim())
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    paginas.push(ordenadas.join("\n"));
  }

  return paginas.join("\n").trim();
}
