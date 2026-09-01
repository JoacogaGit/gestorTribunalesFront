import * as XLSX from "xlsx";

/**
 * Detección de color de fondo de filas en archivos de origen (Excel / Word)
 * y mapeo al color más cercano de la paleta de filas de IusTrack.
 */

/** Misma paleta que usa el selector de color de fila en la tabla de causas. */
export const PALETA_FILA_HEX = [
  "#FCA5A5", // Rojo
  "#FDBA74", // Naranja
  "#FCD34D", // Amarillo
  "#86EFAC", // Verde
  "#7DD3FC", // Celeste
  "#93C5FD", // Azul
  "#C4B5FD", // Violeta
  "#F9A8D4", // Rosa
];

export interface FilaColoreada {
  /** Texto completo de la fila de origen (para poder emparejarla con la causa). */
  texto: string;
  /** Color de la paleta de IusTrack. */
  color: string;
}

function hexARgb(hex: string): [number, number, number] | null {
  const h = hex.replace(/^#/, "").trim();
  const s = h.length === 8 ? h.slice(2) : h; // ARGB de Excel
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

/** Ignora blancos, casi blancos, negros y grises muy oscuros (no son "resaltados"). */
function esColorIgnorable([r, g, b]: [number, number, number]): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max >= 245 && min >= 235) return true; // blanco / casi blanco
  if (max <= 40) return true; // negro
  if (max - min <= 8 && max >= 200) return true; // gris muy claro
  return false;
}

/** Devuelve el hex de la paleta más cercano por distancia euclídea en RGB, o null. */
export function mapearAPaleta(hexOrigen: string | null | undefined): string | null {
  if (!hexOrigen) return null;
  const rgb = hexARgb(hexOrigen);
  if (!rgb || esColorIgnorable(rgb)) return null;
  let mejor = PALETA_FILA_HEX[0];
  let mejorDist = Number.POSITIVE_INFINITY;
  for (const p of PALETA_FILA_HEX) {
    const c = hexARgb(p);
    if (!c) continue;
    const d = (rgb[0] - c[0]) ** 2 + (rgb[1] - c[1]) ** 2 + (rgb[2] - c[2]) ** 2;
    if (d < mejorDist) { mejorDist = d; mejor = p; }
  }
  return mejor;
}

/** Tokens "identificatorios" de una fila: números largos (expedientes, años/nros). */
function tokensDeTexto(texto: string): string[] {
  const out = new Set<string>();
  const matches = texto.match(/\d[\d.\-/]{3,}\d|\d{4,}/g) ?? [];
  for (const m of matches) {
    const limpio = m.replace(/\D/g, "");
    if (limpio.length >= 4) out.add(limpio);
  }
  return [...out];
}

/**
 * Empareja causas con filas coloreadas del archivo original (por número de
 * expediente / número interno presente en la fila) y devuelve el color.
 */
export function colorParaCausa(
  causa: { expediente_nro?: string | null; numero_interno?: string | null; caratula?: string | null },
  filas: FilaColoreada[] | undefined,
): string | null {
  if (!filas || filas.length === 0) return null;
  const claves = [causa.expediente_nro, causa.numero_interno]
    .map((v) => String(v ?? "").replace(/\D/g, ""))
    .filter((v) => v.length >= 4);
  if (claves.length > 0) {
    for (const f of filas) {
      const toks = tokensDeTexto(f.texto);
      if (claves.some((k) => toks.includes(k))) return f.color;
    }
  }
  const car = String(causa.caratula ?? "").trim().toLowerCase();
  if (car.length >= 8) {
    const hit = filas.find((f) => f.texto.toLowerCase().includes(car));
    if (hit) return hit.color;
  }
  return null;
}

/** Extrae el color de fondo de cada fila de una hoja de Excel (requiere cellStyles). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extraerColoresFilasExcel(ws: any): FilaColoreada[] {
  try {
    const ref = ws?.["!ref"];
    if (!ref) return [];
    const range = XLSX.utils.decode_range(ref);
    const salida: FilaColoreada[] = [];
    for (let R = range.s.r; R <= range.e.r; R++) {
      let color: string | null = null;
      const textos: string[] = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        const v = cell.w ?? cell.v;
        if (v != null && String(v).trim() !== "") textos.push(String(v).trim());
        if (!color) {
          const fill = cell.s?.fgColor?.rgb ?? cell.s?.bgColor?.rgb ?? cell.s?.fill?.fgColor?.rgb;
          color = mapearAPaleta(typeof fill === "string" ? fill : null);
        }
      }
      if (color && textos.length > 0) salida.push({ texto: textos.join(" | "), color });
    }
    return salida;
  } catch {
    return [];
  }
}

/** Extrae el sombreado (w:shd) de las filas de tablas de un .docx. */
export async function extraerColoresFilasDocx(buf: ArrayBuffer): Promise<FilaColoreada[]> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) return [];
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const filas = Array.from(doc.getElementsByTagName("w:tr"));
    const salida: FilaColoreada[] = [];
    for (const tr of filas) {
      let color: string | null = null;
      const shds = Array.from(tr.getElementsByTagName("w:shd"));
      for (const shd of shds) {
        const fill = shd.getAttribute("w:fill");
        if (fill && fill.toLowerCase() !== "auto") {
          color = mapearAPaleta(fill);
          if (color) break;
        }
      }
      if (!color) continue;
      const texto = (tr.textContent ?? "").replace(/\s+/g, " ").trim();
      if (texto) salida.push({ texto, color });
    }
    return salida;
  } catch {
    return [];
  }
}
