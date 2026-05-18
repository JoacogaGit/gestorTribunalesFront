import { PestanaParseada } from "@/lib/parseMigracionFile";

export const TAMANO_LOTE = 25;

export interface LotePestana {
  pestana: PestanaParseada;
  nro_lote: number;
  total_lotes: number;
  filas: number;
}

export function dividirPestanaEnLotes(pestana: PestanaParseada, tamanoLote = TAMANO_LOTE): LotePestana[] {
  if (typeof pestana.contenido === "string") {
    return [{ pestana, nro_lote: 1, total_lotes: 1, filas: pestana.contenido.split("\n").filter((l) => l.trim()).length }];
  }

  const filas = pestana.contenido.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (filas.length <= tamanoLote) {
    return [{ pestana: { ...pestana, contenido: filas }, nro_lote: 1, total_lotes: 1, filas: filas.length }];
  }

  const encabezado = filas[0];
  const datos = filas.slice(1);
  const totalLotes = Math.ceil(datos.length / tamanoLote);

  return Array.from({ length: totalLotes }, (_, idx) => {
    const chunk = datos.slice(idx * tamanoLote, (idx + 1) * tamanoLote);
    return {
      pestana: { ...pestana, contenido: [encabezado, ...chunk] },
      nro_lote: idx + 1,
      total_lotes: totalLotes,
      filas: chunk.length,
    };
  });
}