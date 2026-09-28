export const MODOS_TERMINACION_BASE = [
  "Elevación a juicio",
  "Desestimación",
  "Sobreseimiento por prescripción",
  "Sobreseimiento otras causales",
  "Incompetencia",
  "Suspensión de juicio a prueba",
  "Juicio abreviado",
  "Archivo",
  "Otras formas",
];

export const TIPOS_VIOLENCIA_GENERO = [
  "Femicidio",
  "Transfemicidio",
  "Femicidio vinculado",
  "Lesiones",
  "Amenazas/coacción",
  "Abuso sexual",
  "Otras",
];

const key = (vocaliaId: string) => `iustrack_modos_terminacion_${vocaliaId}`;

export function leerModosPropios(vocaliaId?: string | null): string[] {
  if (!vocaliaId) return [];
  try {
    const v = JSON.parse(localStorage.getItem(key(vocaliaId)) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

export function guardarModosPropios(vocaliaId: string, modos: string[]) {
  try { localStorage.setItem(key(vocaliaId), JSON.stringify(modos)); } catch { /* noop */ }
}

/** Hoy en Argentina (YYYY-MM-DD). */
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
