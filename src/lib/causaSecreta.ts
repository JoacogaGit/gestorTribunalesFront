import type { CausaInput } from "@/hooks/useCausaMutations";

export function payloadSecreto(causa: CausaInput, esAdmin: boolean): CausaInput {
  const { secreta, ...rest } = causa;
  return esAdmin ? { ...rest, secreta: !!secreta } : rest;
}