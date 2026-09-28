import * as XLSX from "xlsx";
import { BLOQUES, BloqueDef, BloqueId, ModoBloque, Valores } from "@/lib/relevamientos";

interface ExportarRelevamientoOptions {
  nombre: string;
  periodoInicio: string;
  periodoFin: string;
  alcance: string;
  modos: Partial<Record<BloqueId, ModoBloque>>;
  bases: Partial<Record<BloqueId, Valores>>;
  ajustes: Partial<Record<BloqueId, Valores>>;
  finales: Partial<Record<BloqueId, Valores>>;
}

const nombreHoja = (titulo: string, usados: Set<string>) => {
  const base = titulo.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || "Bloque";
  let nombre = base;
  let n = 2;
  while (usados.has(nombre.toLocaleLowerCase("es"))) {
    const sufijo = ` ${n++}`;
    nombre = `${base.slice(0, 31 - sufijo.length)}${sufijo}`;
  }
  usados.add(nombre.toLocaleLowerCase("es"));
  return nombre;
};

const nombreArchivo = (nombre: string) => nombre
  .replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ -]/g, "")
  .trim()
  .replace(/\s+/g, "_")
  .slice(0, 50) || "relevamiento";

function filasBloque(
  def: BloqueDef,
  modo: ModoBloque,
  base: Valores,
  ajustes: Valores,
  finales: Valores,
) {
  return def.filas.flatMap((fila) => def.columnas.map((columna) => {
    const clave = `${fila.id}|${columna.id}`;
    return {
      Concepto: fila.label,
      Columna: columna.label,
      Modo: modo === "auto" ? "Automático" : "Manual",
      Calculado: modo === "auto" ? (base[clave] ?? 0) : "",
      Ajuste: modo === "auto" ? (ajustes[clave] ?? 0) : "",
      Final: finales[clave] ?? 0,
    };
  }));
}

export function exportarRelevamientoExcel(options: ExportarRelevamientoOptions) {
  const wb = XLSX.utils.book_new();
  const resumen = XLSX.utils.aoa_to_sheet([
    ["IusTrack — Relevamiento"],
    ["Nombre", options.nombre],
    ["Período", `${options.periodoInicio} al ${options.periodoFin}`],
    ["Alcance", options.alcance === "oficina" ? "Toda la oficina" : "Este espacio"],
    [],
    ["Bloque", "Modo", "Total final"],
    ...BLOQUES.map((b) => {
      const total = Object.values(options.finales[b.id] ?? {}).reduce((s, v) => s + v, 0);
      return [b.titulo, options.modos[b.id] === "manual" ? "Manual" : "Automático", total];
    }),
  ]);
  resumen["!cols"] = [{ wch: 34 }, { wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, resumen, "Resumen");

  const usados = new Set(["resumen"]);
  BLOQUES.forEach((b) => {
    const modo = options.modos[b.id] ?? b.modoDefault;
    const rows = filasBloque(b, modo, options.bases[b.id] ?? {}, options.ajustes[b.id] ?? {}, options.finales[b.id] ?? {});
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 38 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja(b.titulo, usados));
  });

  XLSX.writeFile(wb, `IusTrack_relevamiento_${nombreArchivo(options.nombre)}.xlsx`);
}