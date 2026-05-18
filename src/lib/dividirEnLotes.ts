import { PestanaParseada } from "@/lib/parseMigracionFile";

export const TAMANO_LOTE = 25;
export const MIN_FILAS_LOTE = 5;

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

/**
 * Divide un lote en 2 mitades. Devuelve null si ya está por debajo del mínimo.
 * Preserva el encabezado en ambas mitades.
 */
export function dividirLoteEnMitades(lote: LotePestana, minFilas = MIN_FILAS_LOTE): LotePestana[] | null {
  if (typeof lote.pestana.contenido === "string") return null;
  const contenido = lote.pestana.contenido;
  if (contenido.length < 2) return null;
  const encabezado = contenido[0];
  const datos = contenido.slice(1);
  if (datos.length <= minFilas) return null;
  const mitad = Math.ceil(datos.length / 2);
  const a = datos.slice(0, mitad);
  const b = datos.slice(mitad);
  if (a.length < minFilas || b.length < minFilas) {
    // Aún así, si el chunk completo está por encima del mínimo, partimos al mínimo + resto
    if (datos.length <= minFilas) return null;
  }
  return [
    {
      pestana: { ...lote.pestana, contenido: [encabezado, ...a] },
      nro_lote: lote.nro_lote,
      total_lotes: lote.total_lotes,
      filas: a.length,
    },
    {
      pestana: { ...lote.pestana, contenido: [encabezado, ...b] },
      nro_lote: lote.nro_lote,
      total_lotes: lote.total_lotes,
      filas: b.length,
    },
  ];
}
