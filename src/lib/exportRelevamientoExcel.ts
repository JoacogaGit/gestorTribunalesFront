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
}

const PLANTILLA_URL = "/planilla_estadisticas.xlsx";
const COLS = "CDEFGHIJKLMNOPQRST".split("");

const nombreArchivo = (nombre: string) =>
  nombre.replace(/[\\/:*?"<>|]/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "relevamiento";

export async function exportarRelevamientoExcel({ nombre, encabezado, finales }: ExportarRelevamientoOptions) {
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

  // Resoluciones: el bloque en la app no separa por tipo de causa si no tiene claves con tipo;
  // se aceptan claves "tipo_modo|con" o, en su defecto, "modo|con" volcadas en la fila Común.
  const resol = finales.resoluciones ?? {};
  TIPOS.forEach((t, i) => {
    const fila = 26 + i;
    MODOS_RESOLUCION.forEach((m, j) => {
      ["con", "sin"].forEach((d, k) => {
        const col = COLS[j * 2 + k];
        const conTipo = resol[`${t.id}_${m.id}|${d}`];
        const sinTipo = t.id === "comun" ? resol[`${m.id}|${d}`] : undefined;
        num(`${col}${fila}`, conTipo ?? sinTipo);
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
