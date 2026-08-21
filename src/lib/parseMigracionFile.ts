import * as XLSX from "xlsx";
import Papa from "papaparse";
import mammoth from "mammoth";

export type TipoArchivo = "excel" | "csv" | "docx" | "txt" | "lex100" | "pdf" | "lex100pdf";

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
    const lineas = await extraerLineasPdf(await file.arrayBuffer());
    const texto = lineasATexto(lineas);
    if (!texto.trim()) {
      throw new Error(
        "Este PDF parece ser una imagen escaneada y no se puede leer automáticamente. Probá exportando en Excel.",
      );
    }
    if (esLex100Pdf(texto)) {
      return {
        tipo: "lex100pdf",
        nombreArchivo: file.name,
        pestanas: [{ nombre: file.name, contenido: construirLineasLex100Pdf(lineas) }],
      };
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
// agrupando ítems por línea según su coordenada Y y en celdas
// según los saltos horizontales.
// ============================================================

interface CeldaPdf {
  x: number;
  texto: string;
}

interface LineaPdf {
  celdas: CeldaPdf[];
}

const GAP_CELDA = 6;

async function extraerLineasPdf(buf: ArrayBuffer): Promise<LineaPdf[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const salida: LineaPdf[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const lineas = new Map<number, { x: number; ancho: number; str: string }[]>();

    for (const item of content.items as any[]) {
      const str = String(item.str ?? "");
      if (!str.trim()) continue;
      const x = item.transform?.[4] ?? 0;
      const y = Math.round((item.transform?.[5] ?? 0) / 3) * 3; // tolerancia vertical
      const arr = lineas.get(y) ?? [];
      arr.push({ x, ancho: item.width ?? 0, str });
      lineas.set(y, arr);
    }

    Array.from(lineas.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const ordenados = items.sort((a, b) => a.x - b.x);
        const celdas: CeldaPdf[] = [];
        let actual: CeldaPdf | null = null;
        let finPrev = -Infinity;
        for (const it of ordenados) {
          if (!actual || it.x - finPrev > GAP_CELDA) {
            actual = { x: it.x, texto: it.str.trim() };
            celdas.push(actual);
          } else {
            actual.texto = `${actual.texto} ${it.str.trim()}`.replace(/\s+/g, " ").trim();
          }
          finPrev = it.x + it.ancho;
        }
        const limpias = celdas.filter((c) => c.texto !== "");
        if (limpias.length > 0) salida.push({ celdas: limpias });
      });
  }

  return salida;
}

function lineasATexto(lineas: LineaPdf[]): string {
  return lineas
    .map((l) => l.celdas.map((c) => c.texto).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

// ============================================================
// Lex100 PDF ("Gestión Integral de Expedientes Judiciales")
// ============================================================

const LEX100_PDF_COLUMNAS = ["Expte", "Actor", "Demandado", "Abogado", "Ingreso"] as const;

const ALIAS_COL_PDF: Record<string, string[]> = {
  Expte: ["nº expte", "n° expte", "no expte", "nro expte", "expte"],
  Actor: ["actor"],
  Demandado: ["demandado"],
  Abogado: ["abogado", "abogados"],
  Ingreso: ["ingreso", "fecha ingreso"],
  Objeto: ["objeto"],
  Juzg: ["juzg", "juzgado"],
  Sala: ["sala"],
};

function etiquetaColumna(texto: string): string | null {
  const t = normHeader(texto).replace(/[:.]/g, "").trim();
  for (const [etiqueta, alias] of Object.entries(ALIAS_COL_PDF)) {
    if (alias.some((a) => t === normHeader(a))) return etiqueta;
  }
  return null;
}

/** Detecta si el texto de un PDF corresponde a un listado Lex100. */
export function esLex100Pdf(texto: string): boolean {
  const t = normHeader(texto);
  return (
    t.includes("gestion integral de expedientes judiciales") ||
    t.includes("listado de causas seleccionadas")
  );
}

/**
 * Arma una línea por causa a partir de las líneas del PDF Lex100,
 * usando las posiciones X de los encabezados para asignar columnas.
 */
export function construirLineasLex100Pdf(lineas: LineaPdf[]): string {
  const salida: string[] = [];
  let columnas: { etiqueta: string; x: number }[] = [];
  let pendiente: Record<string, string> | null = null;

  const vaciar = () => {
    if (!pendiente) return;
    const linea = LEX100_PDF_COLUMNAS.map((c) => `${c}: ${(pendiente?.[c] ?? "").trim()}`).join(" || ");
    if ((pendiente.Expte ?? "").trim() !== "") salida.push(linea);
    pendiente = null;
  };

  for (const linea of lineas) {
    const etiquetas = linea.celdas
      .map((c) => ({ etiqueta: etiquetaColumna(c.texto), x: c.x }))
      .filter((e): e is { etiqueta: string; x: number } => e.etiqueta !== null);

    // Fila de encabezados: al menos 3 columnas reconocidas
    if (etiquetas.length >= 3) {
      vaciar();
      columnas = etiquetas.sort((a, b) => a.x - b.x);
      continue;
    }

    if (columnas.length === 0) continue;

    // Asigna cada celda a la columna cuyo X esté más cerca
    const asignar = (x: number): string => {
      let mejor = columnas[0];
      let dist = Math.abs(x - columnas[0].x);
      for (const col of columnas) {
        const d = Math.abs(x - col.x);
        if (d < dist) {
          dist = d;
          mejor = col;
        }
      }
      return mejor.etiqueta;
    };

    const fila: Record<string, string> = {};
    for (const celda of linea.celdas) {
      const col = asignar(celda.x);
      fila[col] = fila[col] ? `${fila[col]} ${celda.texto}` : celda.texto;
    }

    const exp = (fila.Expte ?? "").trim();
    const esNuevaCausa = /\d/.test(exp) && exp !== "";

    if (esNuevaCausa) {
      vaciar();
      pendiente = fila;
    } else if (pendiente) {
      // Continuación de la fila anterior (nombres partidos en varias líneas)
      for (const [k, v] of Object.entries(fila)) {
        if (k === "Expte") continue;
        pendiente[k] = pendiente[k] ? `${pendiente[k]} ${v}` : v;
      }
    }
  }
  vaciar();

  const encabezado = LEX100_PDF_COLUMNAS.map((c) => `${c}: <valor>`).join(" || ");
  return [encabezado, ...salida].join("\n");
}


export { extraerLineasPdf, lineasATexto };

