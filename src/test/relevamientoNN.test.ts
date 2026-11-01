import { describe, expect, it } from "vitest";
import { CausaRel, calcularAuto, fusionarResolucionesLegacy, modoResolucion, resolucionesPorTipo } from "@/lib/relevamientos";
import { MODOS_TERMINACION_BASE } from "@/lib/terminacion";

const causa = (p: Partial<CausaRel>): CausaRel => ({
  id: Math.random().toString(), estado_causa: "en_tramite", flagrancia: false, delegada: false, art196bis: false,
  fecha_ingreso: "2026-03-10", created_at: null, fecha_terminacion: null, modo_terminacion: null, modo_inicio: null,
  sujetos: [{ situacion_libertad: "detenido", violencia_genero: true, tipo_violencia_genero: "Lesiones", borrado_en: null }],
  ...p,
});

describe("causas NN fuera de la estadística", () => {
  it("una causa NN no cuenta como ingresada, con detenido ni violencia de género", () => {
    const r = calcularAuto([causa({ modo_inicio: "NN" }), causa({ modo_inicio: "Denuncia" })], "2026-01-01", "2026-06-30");
    expect(r.causas["comun_con|ingresadas"]).toBe(1);
    expect(r.violencia["Lesiones|cant"]).toBe(1);
  });
  it("una causa NN terminada no cuenta en resoluciones", () => {
    const t = { estado_causa: "terminada", fecha_terminacion: "2026-04-01", modo_terminacion: "Archivo" };
    const lista = [causa({ ...t, modo_inicio: "NN" }), causa(t)];
    expect(calcularAuto(lista, "2026-01-01", "2026-06-30").resoluciones["archivo|con"]).toBe(1);
    expect(resolucionesPorTipo(lista, "2026-01-01", "2026-06-30")["comun_archivo|con"]).toBe(1);
  });
});

describe("modos no oficiales van a Otras formas", () => {
  it("los modos oficiales conservan su categoría", () => {
    expect(modoResolucion("Archivo")).toBe("archivo");
    expect(modoResolucion("Desestimación")).toBe("desestimacion");
    expect(modoResolucion("Suspensión de juicio a prueba")).toBe("susp_juicio");
    expect(modoResolucion("Juicio abreviado")).toBe("abreviado");
  });
  it("Condena, Acumulación y Pasa a NN cuentan como Otras formas", () => {
    for (const m of ["Condena", "Acumulación", "Pasa a NN", "Un modo propio"]) {
      expect(modoResolucion(m)).toBe("otras");
    }
  });
  it("los relevamientos guardados conservan el juicio abreviado en su propia columna", () => {
    expect(fusionarResolucionesLegacy({ "abreviado|con": 2, "otras|con": 1, "archivo|sin": 3 }))
      .toEqual({ "abreviado|con": 2, "otras|con": 1, "archivo|sin": 3 });
  });
});

describe("opciones del desplegable de terminación", () => {
  it("incluye Juicio abreviado, Condena, Acumulación y Pasa a NN", () => {
    expect(MODOS_TERMINACION_BASE).toEqual(expect.arrayContaining(["Juicio abreviado", "Condena", "Acumulación", "Pasa a NN"]));
  });
});
