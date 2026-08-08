/** Paleta fija de 8 colores para listas y columnas de anotaciones. */
export interface ColorTablero {
  id: string;
  nombre: string;
  hex: string;
}

export const COLORES_TABLERO: ColorTablero[] = [
  { id: "azul", nombre: "Azul", hex: "#3b82f6" },
  { id: "verde", nombre: "Verde", hex: "#22c55e" },
  { id: "ambar", nombre: "Ámbar", hex: "#f59e0b" },
  { id: "rojo", nombre: "Rojo", hex: "#ef4444" },
  { id: "violeta", nombre: "Violeta", hex: "#8b5cf6" },
  { id: "rosa", nombre: "Rosa", hex: "#ec4899" },
  { id: "turquesa", nombre: "Turquesa", hex: "#14b8a6" },
  { id: "gris", nombre: "Gris", hex: "#64748b" },
];

/** Devuelve el hex si el valor guardado es válido (id de paleta o hex directo). */
export function resolverColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const found = COLORES_TABLERO.find((c) => c.id === color || c.hex === color);
  return found ? found.hex : null;
}

/** Fondo muy tenue, legible en claro y oscuro. */
export function colorSoftBg(color: string | null | undefined): string | undefined {
  const hex = resolverColor(color);
  return hex ? `${hex}1a` : undefined;
}

/** Borde/barra con el color, algo atenuado. */
export function colorBorde(color: string | null | undefined): string | undefined {
  const hex = resolverColor(color);
  return hex ? `${hex}80` : undefined;
}
