import { describe, it, expect } from "vitest";
import { calcularVencimiento, ordenarPorCarga } from "./plazos";

describe("plazos", () => {
  it("días corridos suma días calendario", () => {
    expect(calcularVencimiento("2026-11-13", 5, "corridos")).toBe("2026-11-18");
  });
  it("días hábiles saltea fin de semana y arranca al día siguiente", () => {
    // viernes 13 + 3 hábiles = lun 16, mar 17, mié 18
    expect(calcularVencimiento("2026-11-13", 3, "habiles")).toBe("2026-11-18");
  });
  it("días hábiles saltea fechas inhábiles", () => {
    expect(calcularVencimiento("2026-11-13", 3, "habiles", new Set(["2026-11-17"]))).toBe("2026-11-19");
  });
  it("orden por carga desc, desempate fecha desc y sin fecha al final", () => {
    const r = ordenarPorCarga([
      { id: "a", created_at: "2026-01-01T00:00:00Z", fecha_hora: null },
      { id: "b", created_at: "2026-01-01T00:00:00Z", fecha_hora: "2026-03-01T00:00:00Z" },
      { id: "c", created_at: "2026-01-01T00:00:00Z", fecha_hora: "2026-05-01T00:00:00Z" },
      { id: "d", created_at: "2026-02-01T00:00:00Z", fecha_hora: null },
    ]);
    expect(r.map((x) => x.id)).toEqual(["d", "c", "b", "a"]);
  });
});
