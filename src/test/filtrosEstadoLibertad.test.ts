import { describe, expect, it } from "vitest";
import { etiquetaEstadoLibertad } from "@/data/mockCausas";
import { cumpleFiltroEstadoSubestado, opcionesEstadoFiltro, opcionesSubestadoFiltro } from "@/lib/filtrosEstado";
import { buscarCriterio, etiquetaValor } from "@/lib/estadisticasCustom";

describe("Excarcelado se muestra como En libertad", () => {
  it("cambia solo el texto visible", () => {
    expect(etiquetaEstadoLibertad("Excarcelado")).toBe("En libertad");
    expect(etiquetaEstadoLibertad("Detenido")).toBe("Detenido");
  });
  it("las estadísticas guardan Excarcelado pero muestran En libertad", () => {
    const criterio = buscarCriterio(false, "situacion_libertad");
    expect(etiquetaValor(criterio, "Excarcelado")).toBe("En libertad");
  });
});

describe("filtro por estado y subestado", () => {
  const tramite = { estadoCausa: "En trámite" as const, subestados: ["VISTA 346"] };
  const sentencia = { estadoCausa: "Para sacar sentencia" as const, subestados: [] };

  it("sin selección no filtra nada", () => {
    expect(cumpleFiltroEstadoSubestado(tramite, [], [])).toBe(true);
    expect(cumpleFiltroEstadoSubestado(sentencia, [], [])).toBe(true);
  });
  it("filtra por uno o varios estados", () => {
    expect(cumpleFiltroEstadoSubestado(sentencia, ["En trámite"], [])).toBe(false);
    expect(cumpleFiltroEstadoSubestado(sentencia, ["En trámite", "Para sacar sentencia"], [])).toBe(true);
  });
  it("combina estado y subestado", () => {
    expect(cumpleFiltroEstadoSubestado(tramite, ["En trámite"], ["VISTA 346"])).toBe(true);
    expect(cumpleFiltroEstadoSubestado(tramite, ["En trámite"], ["CLAUSURA"])).toBe(false);
  });
  it("ofrece los estados presentes en la lista, sin repetir", () => {
    expect(opcionesEstadoFiltro([sentencia, tramite, tramite])).toEqual(["En trámite", "Para sacar sentencia"]);
  });
  it("suma al catálogo los subestados que ya tienen las causas", () => {
    expect(opcionesSubestadoFiltro(["CLAUSURA"], [tramite])).toEqual(["CLAUSURA", "VISTA 346"]);
  });
});
