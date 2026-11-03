import { esRebeldia, type Causa } from "@/data/mockCausas";
import { esFaltaDeMerito } from "@/lib/reglasListas";

/** Grupos de estado que se pueden mostrar u ocultar en el dashboard. */
export const GRUPOS_ESTADO = [
  { id: "estado:tramite", label: "En trámite" },
  { id: "estado:recurso", label: "Recursos" },
  { id: "estado:para_sentencia", label: "Para sacar sentencia" },
  { id: "estado:para_comunicar", label: "Para comunicar" },
  { id: "estado:delegada", label: "Delegadas" },
  { id: "estado:terminada", label: "Terminadas" },
] as const;

/** Características que se pueden mostrar u ocultar en el dashboard. */
export const CARACTERISTICAS = [
  { id: "car:detenidos", label: "Con detenidos" },
  { id: "car:rebeldia", label: "Con rebeldías o paraderos" },
  { id: "car:sjp", label: "Con SJP" },
  { id: "car:flagrancia", label: "Flagrancia" },
  { id: "car:art196bis", label: "196bis / NN" },
  { id: "car:delegada", label: "Marcadas como delegadas (incluye las que terminaron)" },
  { id: "car:falta_merito", label: "Falta de mérito" },
  { id: "car:violencia_genero", label: "Violencia de género" },
  { id: "car:secreta", label: "Secretas" },
] as const;

const RECURSOS = ["Casación", "Queja en Corte", "REX", "Apelación", "TSJ"];

type CausaVisible = Pick<Causa, "estadoCausa" | "imputados" | "flagrancia" | "art196bis" | "delegada" | "estadoProcesal" | "secreta">;

export function grupoEstado(c: Pick<Causa, "estadoCausa">): string {
  const e = c.estadoCausa;
  if (e === "En trámite" || e === "En juicio") return "estado:tramite";
  if (RECURSOS.includes(e)) return "estado:recurso";
  if (e === "Para sacar sentencia") return "estado:para_sentencia";
  if (e === "Para comunicar") return "estado:para_comunicar";
  if (e === "Delegada") return "estado:delegada";
  if (e === "Terminada") return "estado:terminada";
  return "estado:tramite";
}

export function caracteristicasDe(c: CausaVisible): string[] {
  const out: string[] = [];
  const imp = c.imputados ?? [];
  if (imp.some((i) => i.estadoLibertad === "Detenido")) out.push("car:detenidos");
  if (imp.some((i) => esRebeldia(i.estadoLibertad))) out.push("car:rebeldia");
  if (imp.some((i) => i.estadoLibertad === "SJP")) out.push("car:sjp");
  if (c.flagrancia) out.push("car:flagrancia");
  if (c.art196bis) out.push("car:art196bis");
  if (c.delegada) out.push("car:delegada");
  if (esFaltaDeMerito(c.estadoProcesal)) out.push("car:falta_merito");
  if (imp.some((i) => i.violenciaGenero)) out.push("car:violencia_genero");
  if (c.secreta) out.push("car:secreta");
  return out;
}

/**
 * Una causa se ve en el dashboard si su estado no está oculto y no tiene
 * ninguna característica oculta. Sin nada oculto, se ven todas (incluidas terminadas).
 */
export function esVisibleEnDashboard(c: CausaVisible, ocultos: ReadonlySet<string>): boolean {
  if (ocultos.size === 0) return true;
  if (ocultos.has(grupoEstado(c))) return false;
  return !caracteristicasDe(c).some((k) => ocultos.has(k));
}

export function claveVisibilidad(userKey: string, vocaliaId: string | null): string {
  return `iustrack_dash_visibilidad_${userKey}_${vocaliaId ?? "-"}`;
}

export function leerOcultos(clave: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const arr = JSON.parse(localStorage.getItem(clave) || "[]");
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function guardarOcultos(clave: string, ocultos: ReadonlySet<string>) {
  try { localStorage.setItem(clave, JSON.stringify([...ocultos])); } catch { /* ignore */ }
}
