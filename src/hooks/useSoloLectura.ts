import { useVocaliaActual } from "@/context/VocaliaContext";
import { useRolTribunal } from "@/hooks/useRolTribunal";

/**
 * True cuando el usuario tiene rol "lector" en el tribunal de la vocalía actual:
 * puede ver todo, pero no crear, editar ni borrar.
 */
export function useSoloLectura(): boolean {
  const { vocalia } = useVocaliaActual();
  const { soloLectura } = useRolTribunal(vocalia?.tribunalId ?? null);
  return soloLectura;
}
