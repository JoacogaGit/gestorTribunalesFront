import { describe, expect, it } from "vitest";
import { anotacionesPorCausa, columnasDetenido, fechaCelda, HEADERS_DETENIDOS_EXTRA } from "@/lib/exportDetenidos";
import { obtenerVistasActuales, publicarVista, retirarVista } from "@/lib/vistaExportable";
import type { Causa } from "@/data/mockCausas";

describe("Excel de Detenidos: columnas extra por imputado", () => {
  it("agrega las seis columnas pedidas, en orden", () => {
    expect(HEADERS_DETENIDOS_EXTRA).toEqual([
      "Lugar de detención",
      "Fecha de detención",
      "Prescripción",
      "Vencimiento de pena",
      "Vencimiento de prisión preventiva",
      "Anotaciones de la causa",
    ]);
  });

  it("toma lugar_alojamiento, fecha_detencion, prescripcion_fecha, vencimiento_pena y vencimiento_pp", () => {
    const fila = columnasDetenido({
      lugar_alojamiento: "Unidad 28",
      fecha_detencion: "2026-03-05",
      prescripcion_fecha: "2030-01-31",
      vencimiento_pena: "2028-12-01",
      vencimiento_pp: "2027-03-05",
    }, "Audiencia (10/11/2026)");
    expect(fila).toEqual(["Unidad 28", "05/03/2026", "31/01/2030", "01/12/2028", "05/03/2027", "Audiencia (10/11/2026)"]);
  });

  it("deja la celda en blanco si el dato está vacío", () => {
    expect(columnasDetenido({ lugar_alojamiento: null, fecha_detencion: null }, undefined)).toEqual(["", "", "", "", "", ""]);
    expect(fechaCelda("")).toBe("");
  });

  it("anotaciones: título + fecha de la causa del detenido, en hora Argentina", () => {
    const m = anotacionesPorCausa([
      { causa_id: "c1", titulo: "Audiencia", fecha_hora: "2026-11-10T02:00:00Z" }, // 9/11 23 h en Argentina
      { causa_id: "c1", titulo: "Pedir informe", fecha_hora: null },
      { causa_id: "c2", titulo: "Otra causa", fecha_hora: "2026-11-01" },
    ]);
    expect(m.get("c1")).toBe("Audiencia (09/11/2026); Pedir informe");
    expect(m.get("c2")).toBe("Otra causa (01/11/2026)");
    expect(m.get("c3")).toBeUndefined();
  });
});

describe("Solo esta lista: exporta lo que está en pantalla", () => {
  it("usa las filas ya filtradas que publica la lista y las retira al cerrarla", () => {
    const owner = Symbol("t");
    const filas = [{ id: "a" }, { id: "b" }] as unknown as Causa[];
    publicarVista(owner, { titulo: "Trámite", listKey: "tramite", filas });
    expect(obtenerVistasActuales().find((v) => v.titulo === "Trámite")?.filas.map((f) => f.id)).toEqual(["a", "b"]);
    retirarVista(owner);
    expect(obtenerVistasActuales().find((v) => v.titulo === "Trámite")).toBeUndefined();
  });
});
