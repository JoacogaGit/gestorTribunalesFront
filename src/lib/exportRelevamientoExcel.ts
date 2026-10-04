import ExcelJS from "exceljs";
import { BloqueId, MODOS_RESOLUCION, TIPOS, TIPOS_VG, Valores } from "@/lib/relevamientos";

export interface EncabezadoRelevamiento {
  juzgado?: string;
  fiscalia?: string;
  defensoria?: string;
  distritos?: string;
}

interface ExportarRelevamientoOptions {
  nombre: string;
  encabezado: EncabezadoRelevamiento;
  finales: Partial<Record<BloqueId, Valores>>;
  bases: Partial<Record<BloqueId, Valores>>;
  resolPorTipo: Valores | null;
  periodo: { inicio: string; fin: string };
}

const PLANTILLA_URL = "/planilla_estadisticas.xlsx";
const COLS = "CDEFGHIJKLMNOPQRST".split("");
const CELDA_TITULO = "B2";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const fechaLarga = (iso: string | undefined) => {
  const [y, m, d] = (iso ?? "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return "";
  return `${d} de ${MESES[m - 1]} de ${y}`;
};

export const tituloRelevamiento = (inicio: string, fin: string) => {
  const a = fechaLarga(inicio);
  const b = fechaLarga(fin);
  if (!a || !b) return "";
  return `Estadísticas del período ${a} - ${b}`;
};

const nombreArchivo = (nombre: string) =>
  nombre.replace(/[\\/:*?"<>|]/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "relevamiento";

export async function exportarRelevamientoExcel({ nombre, encabezado, finales, bases, resolPorTipo, periodo }: ExportarRelevamientoOptions) {
  const res = await fetch(PLANTILLA_URL);
  if (!res.ok) throw new Error("No se encontró la planilla oficial.");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  const ws = wb.worksheets[0];

  const num = (dir: string, v: number | undefined) => { ws.getCell(dir).value = v ?? 0; };
  const texto = (dir: string, v: string | undefined) => {
    const c = ws.getCell(dir);
    c.numFmt = "@";
    c.value = (v ?? "").trim();
  };

  const titulo = tituloRelevamiento(periodo.inicio, periodo.fin);
  if (titulo) ws.getCell(CELDA_TITULO).value = titulo;



  texto("I5", encabezado.juzgado);
  texto("I6", encabezado.fiscalia);
  texto("I7", encabezado.defensoria);
  texto("I8", encabezado.distritos);

  const causas = finales.causas ?? {};
  TIPOS.forEach((t, i) => {
    const fila = 14 + i;
    num(`C${fila}`, causas[`${t.id}_con|inicio`]);
    num(`D${fila}`, causas[`${t.id}_sin|inicio`]);
    num(`H${fila}`, causas[`${t.id}_con|ingresadas`]);
    num(`I${fila}`, causas[`${t.id}_sin|ingresadas`]);
  });

  // Resoluciones: conteo por tipo desde las causas; ajustes/valores manuales (diferencia con lo calculado) van a la fila Común.
  const resol = finales.resoluciones ?? {};
  const baseRes = bases.resoluciones ?? {};
  TIPOS.forEach((t, i) => {
    const fila = 26 + i;
    MODOS_RESOLUCION.forEach((m, j) => {
      ["con", "sin"].forEach((d, k) => {
        const clave = `${m.id}|${d}`;
        let v: number;
        if (!resolPorTipo) v = t.id === "comun" ? (resol[clave] ?? 0) : 0;
        else {
          v = resolPorTipo[`${t.id}_${clave}`] ?? 0;
          if (t.id === "comun") v += (resol[clave] ?? 0) - (baseRes[clave] ?? 0);
        }
        num(`${COLS[j * 2 + k]}${fila}`, Math.max(0, v));
      });
    });
  });

  const habeas = finales.habeas ?? {};
  ([["B53", "ingresados"], ["F53", "rechazados"], ["H53", "incompetencias"], ["J53", "desistidos"], ["M53", "proc_sin_aud"], ["P53", "proc_con_aud"]] as const)
    .forEach(([dir, id]) => num(dir, habeas[`${id}|cant`]));

  const aud = finales.audiencias ?? {};
  num("D60", aud["virtuales|cant"]);
  num("D61", aud["presenciales|cant"]);

  const vg = finales.violencia ?? {};
  TIPOS_VG.forEach((t, i) => num(`G${67 + i}`, vg[`${t}|cant`]));

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `Estadisticas_${nombreArchivo(nombre)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
