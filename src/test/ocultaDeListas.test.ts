import { describe, expect, it, vi } from "vitest";

const listas = [
  { id: "conexidades", oculta_de: ["tramite", "lista:azules"] },
  { id: "azules", oculta_de: ["lista:azules"] },
];
const asociaciones = [
  { lista_id: "conexidades", causa_id: "c1" },
  { lista_id: "azules", causa_id: "c2" },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabla: string) => {
      if (tabla === "listas_personalizadas") {
        return {
          select: () => ({
            eq: () => ({
              contains: async (_c: string, [destino]: string[]) => ({
                data: listas.filter((l) => l.oculta_de.includes(destino)),
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          in: async (_c: string, ids: string[]) => ({
            data: asociaciones.filter((a) => ids.includes(a.lista_id)),
            error: null,
          }),
        }),
      };
    },
  },
}));

import { claveLista, fetchCausasOcultasDe } from "@/lib/pestanasOcultables";

describe("Ocultar causas de otras listas", () => {
  it("una causa agregada a Conexidades desaparece de Trámite", async () => {
    const ocultas = await fetchCausasOcultasDe("espacio", "tramite");
    expect([...ocultas]).toEqual(["c1"]);
  });

  it("una causa agregada a Conexidades desaparece de la lista Azules, pero Azules no se oculta a sí misma", async () => {
    const ocultas = await fetchCausasOcultasDe("espacio", claveLista("azules"), "azules");
    expect([...ocultas]).toEqual(["c1"]);
  });
});
