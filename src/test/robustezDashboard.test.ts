import { describe, it, expect } from "vitest";
import { ordenarAnotacionesConFecha } from "@/hooks/useEventosCausa";
import { etiquetaEstadoLibertad } from "@/data/mockCausas";

describe("robustez dashboard", () => {
  it("ordena más reciente arriba y descarta sin fecha sin romper", () => {
    const r = ordenarAnotacionesConFecha([
      { id: "a", fecha_hora: "2026-01-01" }, { id: "b", fecha_hora: null },
      { id: "c", fecha_hora: "2026-05-01" }, { id: "d", fecha_hora: "basura" },
    ]);
    expect(r.map((e) => e.id)).toEqual(["c", "a"]);
  });
  it("situación de libertad no prevista no rompe", () => {
    expect(etiquetaEstadoLibertad(null)).toBe("Sin dato");
    expect(etiquetaEstadoLibertad("Paradero")).toBe("Paradero");
    expect(etiquetaEstadoLibertad("raro")).toBe("raro");
  });
});
