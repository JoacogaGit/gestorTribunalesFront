import { useCausasPorEstado } from "./useCausasPorEstado";

/** Wrapper retro-compatible de useCausasPorEstado('tramite'). */
export function useCausasTramite() {
  return useCausasPorEstado("tramite");
}
