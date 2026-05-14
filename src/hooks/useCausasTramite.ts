import { useCausasPorEstado } from "./useCausasPorEstado";

/** Wrapper retro-compatible. */
export function useCausasTramite(vocaliaId: string | null) {
  return useCausasPorEstado("tramite", vocaliaId);
}
