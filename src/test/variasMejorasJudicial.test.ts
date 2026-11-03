// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  apareceEnDelegadas, apareceEnListaPorSituacion, esDelegadaQueTermino, esFaltaDeMerito, patchEstadoDesdeMenu,
} from "@/lib/reglasListas";
import { esVisibleEnDashboard } from "@/lib/visibilidadDashboard";
import { patchSubestado } from "@/lib/subestadosPorEstado";
import { puedeCambiarRolMiembro } from "@/lib/rolesSuperadmin";
import { nombreListaVisible, normalizarNombresListas } from "@/hooks/useNombresListas";
import { ordenarAnotacionesConFecha } from "@/hooks/useEventosCausa";
import { labelSituacionLibertad, SITUACIONES_LIBERTAD, SITUACIONES_REBELDIA } from "@/lib/causaMapper";
import { buscarCriterio } from "@/lib/estadisticasCustom";
import type { Causa } from "@/data/mockCausas";

const causa = (p: Partial<Causa>): Causa => ({
  id: "c1", numero: "1", estadoCausa: "En trámite", imputados: [], subestados: [],
  flagrancia: false, art196bis: false, delegada: false, secreta: false, estadoProcesal: null,
  ...p,
} as unknown as Causa);

describe("Delegada que termina", () => {
  it("elegir Delegada con click derecho pone el estado delegada y deja la marca", () => {
    expect(patchEstadoDesdeMenu("Delegada")).toEqual({ estado_causa: "delegada", delegada: true, tipo_recurso: null });
  });
  it("la lista Delegadas muestra solo las causas en estado delegada", () => {
    expect(apareceEnDelegadas("delegada")).toBe(true);
    expect(apareceEnDelegadas("terminada")).toBe(false);
    expect(apareceEnDelegadas("tramite")).toBe(false);
  });
  it("terminar una delegada no borra la marca: cuenta como delegada que terminó", () => {
    expect(patchEstadoDesdeMenu("Terminada")).not.toHaveProperty("delegada");
    expect(esDelegadaQueTermino({ estado_causa: "terminada", delegada: true })).toBe(true);
    expect(esDelegadaQueTermino({ estado_causa: "terminada", delegada: false })).toBe(false);
  });
  it("las estadísticas personalizadas cuentan las delegadas que terminaron", () => {
    const criterio = buscarCriterio(false, "estado_causa")!;
    expect(criterio.cumple(causa({ estadoCausa: "Terminada", delegada: true }), "Delegada que terminó", {})).toBe(true);
    expect(criterio.cumple(causa({ estadoCausa: "Terminada", delegada: false }), "Delegada que terminó", {})).toBe(false);
  });
});

describe("Falta de mérito", () => {
  it("reconoce el estado procesal sin importar mayúsculas ni acentos", () => {
    expect(esFaltaDeMerito("Falta de mérito")).toBe(true);
    expect(esFaltaDeMerito("falta de merito")).toBe(true);
    expect(esFaltaDeMerito("Procesado")).toBe(false);
    expect(esFaltaDeMerito(null)).toBe(false);
  });
});

describe("Paradero equivale a Rebeldía", () => {
  it("existe la situación Paradero en los desplegables", () => {
    expect(SITUACIONES_LIBERTAD).toContain("paradero");
    expect(labelSituacionLibertad.paradero).toBe("Paradero");
  });
  it("la lista Rebeldías y paraderos incluye ambos", () => {
    expect(apareceEnListaPorSituacion("tramite", [{ situacion_libertad: "paradero" }], SITUACIONES_REBELDIA)).toBe(true);
    expect(apareceEnListaPorSituacion("tramite", [{ situacion_libertad: "rebelde" }], SITUACIONES_REBELDIA)).toBe(true);
    expect(apareceEnListaPorSituacion("tramite", [{ situacion_libertad: "detenido" }], SITUACIONES_REBELDIA)).toBe(false);
  });
  it("la estadística por Rebelde cuenta también los paraderos", () => {
    const criterio = buscarCriterio(false, "situacion_libertad")!;
    const conParadero = causa({ imputados: [{ estadoLibertad: "Paradero" }] as Causa["imputados"] });
    expect(criterio.cumple(conParadero, "Rebelde", {})).toBe(true);
  });
});

describe("Dashboard: mostrar y ocultar", () => {
  it("sin nada oculto se ven todas, incluidas las terminadas", () => {
    expect(esVisibleEnDashboard(causa({ estadoCausa: "Terminada" }), new Set())).toBe(true);
  });
  it("ocultar un estado oculta sus causas", () => {
    const ocultos = new Set(["estado:terminada"]);
    expect(esVisibleEnDashboard(causa({ estadoCausa: "Terminada" }), ocultos)).toBe(false);
    expect(esVisibleEnDashboard(causa({ estadoCausa: "En trámite" }), ocultos)).toBe(true);
  });
  it("ocultar una característica oculta las causas que la tienen", () => {
    const ocultos = new Set(["car:flagrancia"]);
    expect(esVisibleEnDashboard(causa({ flagrancia: true }), ocultos)).toBe(false);
    expect(esVisibleEnDashboard(causa({ flagrancia: false }), ocultos)).toBe(true);
  });
});

describe("Editar subestados con click derecho", () => {
  const catalogo = [
    { nombre: "Para indagar", estado_causa: "tramite" },
    { nombre: "Procesado", estado_causa: "tramite" },
    { nombre: "Esperando cédula", estado_causa: "para_comunicar" },
  ];
  it("en el mismo estado agrega el subestado", () => {
    expect(patchSubestado(causa({ subestados: ["Para indagar"] }), "tramite", "Procesado", catalogo))
      .toEqual({ subestados: ["Para indagar", "Procesado"] });
  });
  it("en el mismo estado, elegirlo de nuevo lo quita", () => {
    expect(patchSubestado(causa({ subestados: ["Procesado"] }), "tramite", "Procesado", catalogo))
      .toEqual({ subestados: [] });
  });
  it("desde otro estado pasa a ese estado con el subestado elegido", () => {
    expect(patchSubestado(causa({ subestados: ["Procesado"] }), "para_comunicar", "Esperando cédula", catalogo))
      .toEqual({ estado_causa: "para_comunicar", subestados: ["Esperando cédula"], tipo_recurso: null });
  });
});

describe("Roles desde el panel superadmin", () => {
  const miembros = [
    { id: "a", tribunal_id: "t1", rol: "admin" as const },
    { id: "b", tribunal_id: "t1", rol: "miembro" as const },
  ];
  it("no deja a una oficina sin administrador", () => {
    expect(puedeCambiarRolMiembro(miembros, miembros[0], "lector")).not.toBeNull();
  });
  it("permite cambiar el rol de un miembro común", () => {
    expect(puedeCambiarRolMiembro(miembros, miembros[1], "admin")).toBeNull();
  });
});

describe("Renombrar listas", () => {
  it("usa el nombre propio de la oficina y vuelve al original si no hay", () => {
    expect(nombreListaVisible({ tramite: "Mis causas" }, "tramite", "Causas en Trámite")).toBe("Mis causas");
    expect(nombreListaVisible({}, "tramite", "Causas en Trámite")).toBe("Causas en Trámite");
  });
  it("ignora valores guardados inválidos", () => {
    expect(normalizarNombresListas({ tramite: "  ", detenidos: "Presos", x: 3 })).toEqual({ detenidos: "Presos" });
    expect(normalizarNombresListas(null)).toEqual({});
  });
});

describe("Orden de anotaciones de la causa", () => {
  it("la más reciente queda arriba", () => {
    const ordenadas = ordenarAnotacionesConFecha([
      { id: "1", fecha_hora: "2026-01-10T10:00:00" },
      { id: "2", fecha_hora: "2026-03-01T10:00:00" },
      { id: "3", fecha_hora: null },
      { id: "4", fecha_hora: "2026-02-01T10:00:00" },
    ]);
    expect(ordenadas.map((e) => e.id)).toEqual(["2", "4", "1"]);
  });
});
