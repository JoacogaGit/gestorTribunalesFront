import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { Causa, EstadoCausa, EstadoLibertad } from "@/data/mockCausas";
import { parseLocalTime } from "@/lib/parseDate";

// ============================================================
// Parser de archivos judiciales (Excel / Word / PDF)
// Reconoce patrones reales: números de causa NNNNN/AAAA, fechas
// dd/mm/aaaa, tipos de detención (CPF, Alcaidía), recursos
// (Queja, REX, Casación), defensa (DPO/Particular).
// ============================================================

const RE_NUMERO_CAUSA = /\b(\d{2,6}\/\d{4})\b/g;
const RE_FECHA = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g;
const RE_DPO = /(DPO|Defensor[ií]a Oficial|Defensor Oficial)/i;
const RE_PARTICULAR = /(particular|Dr\.?|Dra\.?)/i;
const RE_DETENIDO = /(CPF\s*[IVX0-9]*|Alcaid[ií]a|Comisar[ií]a|U\.?\s*\d+|Unidad\s*\d+|detenido|alojado)/i;
const RE_REBELDE = /(rebeld[ií]a|paradero|prófugo|profugo|captura)/i;
const RE_REX = /(REX|recurso\s+extraordinario)/i;
const RE_QUEJA = /(queja\s+en\s+corte|queja)/i;
const RE_CASACION = /(casaci[óo]n)/i;
const RE_PROBATION = /(SJP|probation|suspensi[óo]n\s+del\s+juicio)/i;
const RE_TERMINADA = /(terminada|sentencia\s+firme|archivad[ao])/i;
const RE_JUICIO = /(en\s+juicio|debate\s+oral|audiencia\s+de\s+juicio)/i;

// Delitos comunes en CABA / federal
const DELITOS_COMUNES = [
  "Robo agravado", "Robo simple", "Hurto", "Lesiones", "Homicidio",
  "Estafa", "Amenazas", "Tenencia de estupefacientes", "Comercio de estupefacientes",
  "Tenencia de arma", "Encubrimiento", "Daños", "Abuso sexual", "Violación",
  "Defraudación", "Falsificación", "Resistencia a la autoridad", "Usurpación",
];

function normalizarFecha(raw: string): string {
  // dd/mm/aaaa -> aaaa-mm-dd
  const [d, m, a] = raw.split("/");
  if (!d || !m || !a) return new Date().toISOString().slice(0, 10);
  return `${a.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function detectarEstado(texto: string): EstadoCausa {
  if (RE_TERMINADA.test(texto)) return "Terminada";
  if (RE_QUEJA.test(texto)) return "Queja en Corte";
  if (RE_REX.test(texto)) return "REX";
  if (RE_CASACION.test(texto)) return "Casación";
  if (RE_JUICIO.test(texto)) return "En juicio";
  return "En trámite";
}

function detectarEstadoLibertad(texto: string): { estado: EstadoLibertad; lugar?: string } {
  if (RE_REBELDE.test(texto)) return { estado: "Rebelde" };
  if (RE_PROBATION.test(texto)) return { estado: "SJP" };
  const m = texto.match(RE_DETENIDO);
  if (m) return { estado: "Detenido", lugar: m[0] };
  return { estado: "Excarcelado" };
}

function detectarDelito(texto: string): string {
  for (const d of DELITOS_COMUNES) {
    if (texto.toLowerCase().includes(d.toLowerCase())) return d;
  }
  // Fallback: buscar después de "delito:" o "carátula:"
  const m = texto.match(/(?:delito|car[áa]tula)[:\s]+([^\n.]{3,80})/i);
  if (m) return m[1].trim();
  return "A determinar";
}

function detectarImputado(texto: string, contexto: string): string {
  // Patrones tipo "APELLIDO, Nombre" muy frecuente en juzgados
  const m = contexto.match(/\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ'-]+,\s*[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]+?)\b(?=\s|$|—|-|\(|;)/);
  if (m) return m[1].trim();
  // Fallback sobre todo el texto
  const m2 = texto.match(/\b([A-ZÁÉÍÓÚÑ]{2,}[A-Záéíóúñ\s]*,\s*[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]+)/);
  if (m2) return m2[1].trim().split(/\s{2,}/)[0];
  return "Imputado s/d";
}

function detectarDefensor(texto: string): { nombre: string; tipo: "DPO" | "Particular"; contacto: string } {
  if (RE_DPO.test(texto)) return { nombre: "Defensoría Oficial", tipo: "DPO", contacto: "" };
  const m = texto.match(/(?:Dr\.?|Dra\.?)\s+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]{2,40})/);
  if (m) return { nombre: m[1].trim(), tipo: "Particular", contacto: "" };
  return { nombre: "—", tipo: "DPO", contacto: "" };
}

function calcularPrescripcion(fechas: string[], inicio: string): { principal: string; extras: { fecha: string; label?: string }[] } {
  if (fechas.length === 0) {
    // 5 años desde inicio por default
    const d = new Date(`${inicio}T12:00:00`);
    d.setFullYear(d.getFullYear() + 5);
    return { principal: d.toISOString().slice(0, 10), extras: [] };
  }
  // Tomar la más lejana como prescripción principal
  const ordenadas = [...fechas].sort();
  const principal = ordenadas[ordenadas.length - 1];
  const extras = ordenadas.slice(0, -1).map((f) => ({ fecha: f, label: "Prescripción adicional" }));
  return { principal, extras };
}

interface CausaCruda {
  texto: string;
  contexto: string;
}

function construirCausa(numero: string, cruda: CausaCruda, vocalia: number, idx: number): Causa {
  const { texto, contexto } = cruda;
  const fechasRaw = Array.from(texto.matchAll(RE_FECHA)).map((m) => normalizarFecha(m[1]));
  const fechaInicio = fechasRaw[0] || new Date().toISOString().slice(0, 10);
  // Las fechas “lejanas” (>2 años en futuro) son candidatas a prescripción
  const ahora = Date.now();
  const fechasFuturas = fechasRaw.filter((f) => parseLocalTime(f) > ahora + 365 * 24 * 60 * 60 * 1000);
  const { principal, extras } = calcularPrescripcion(fechasFuturas, fechaInicio);

  const { estado: estadoLib, lugar } = detectarEstadoLibertad(texto);
  const defensor = detectarDefensor(texto);
  const nombreImp = detectarImputado(texto, contexto);

  return {
    id: `import-${Date.now()}-${idx}`,
    numero,
    delito: detectarDelito(texto),
    imputados: [
      {
        nombre: nombreImp,
        estadoLibertad: estadoLib,
        lugarDetencion: lugar,
        defensor,
      },
    ],
    estadoCausa: detectarEstado(texto),
    fechaInicio,
    fechaPrescripcion: principal,
    fechasPrescripcionExtra: extras.length ? extras : undefined,
    vocalia,
    anotaciones: `Importado automáticamente desde archivo. Verificar datos.\n\nFragmento original:\n${contexto.slice(0, 300)}`,
  };
}

// ============================================================
// Lectores de archivo
// ============================================================

async function leerXLSX(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const partes: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    // Convertir a array de filas: cada fila se separa con salto de línea,
    // celdas separadas por " | " para preservar contexto.
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    for (const row of json) {
      partes.push((row as unknown[]).map((c) => String(c ?? "")).join(" | "));
    }
  }
  return partes.join("\n");
}

async function leerDOCX(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

async function leerPDF(file: File): Promise<string> {
  // Carga perezosa del worker
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    partes.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return partes.join("\n");
}

export async function leerArchivo(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return leerXLSX(file);
  if (ext === "docx") return leerDOCX(file);
  if (ext === "pdf") return leerPDF(file);
  // Fallback: texto plano
  return file.text();
}

// ============================================================
// Extractor principal
// ============================================================

export async function extraerCausas(files: File[], vocalia: number): Promise<Causa[]> {
  const todas: Causa[] = [];
  let idx = 0;

  for (const file of files) {
    let texto = "";
    try {
      texto = await leerArchivo(file);
    } catch (e) {
      console.error(`Error leyendo ${file.name}`, e);
      continue;
    }

    // Encontrar todos los números de causa con su contexto (ventana de 400 chars)
    const matches = Array.from(texto.matchAll(RE_NUMERO_CAUSA));
    const vistos = new Set<string>();

    for (const m of matches) {
      const numero = m[1];
      if (vistos.has(numero)) continue;
      vistos.add(numero);

      const start = Math.max(0, (m.index ?? 0) - 200);
      const end = Math.min(texto.length, (m.index ?? 0) + 400);
      const contexto = texto.slice(start, end);

      todas.push(construirCausa(numero, { texto: contexto, contexto }, vocalia, idx++));
    }
  }

  return todas;
}
