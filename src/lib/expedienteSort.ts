/**
 * Clave de orden para números de expediente.
 * Ignora las letras (ej. "CCC", "FCB") y ordena primero por AÑO y luego por NÚMERO.
 * Ejemplos: "CCC 12345/2019", "1234/20", "FCB 987/2021/TO1".
 */
export function expedienteSortKey(numero: string | null | undefined): number {
  if (!numero) return Number.MAX_SAFE_INTEGER;
  const tokens = String(numero).match(/\d+/g);
  if (!tokens || tokens.length === 0) return Number.MAX_SAFE_INTEGER;

  let anio: number | null = null;
  let anioIdx = -1;

  // 1) Año explícito de 4 dígitos (1900-2099).
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.length === 4) {
      const n = Number(t);
      if (n >= 1900 && n <= 2099) { anio = n; anioIdx = i; break; }
    }
  }
  // 2) Año de 2 dígitos (formato "1234/20"), tomado del segundo token.
  if (anio === null && tokens.length >= 2) {
    const t = tokens[1];
    if (t.length === 2) {
      const n = Number(t);
      anio = n <= 50 ? 2000 + n : 1900 + n;
      anioIdx = 1;
    }
  }

  const numeroTok = tokens.find((_, i) => i !== anioIdx) ?? "0";
  const num = Math.min(Number(numeroTok), 9_999_999);
  return (anio ?? 0) * 10_000_000 + num;
}
