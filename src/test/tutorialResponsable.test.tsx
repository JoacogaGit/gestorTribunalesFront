import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useResponsableFilter } from "@/hooks/useResponsableFilter";

const { rows } = vi.hoisted(() => ({ rows: [
  { id: "1", despachante: "Ana", empleado_a_cargo: "Ana" },
  { id: "2", despachante: "Luis", empleado_a_cargo: "Luis" },
] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ is: async () => ({ data: rows }) }) }) }) },
}));

describe("Filtro transitorio del tutorial", () => {
  it.each([false, true])("filtra filas reales y restaura la selección previa (estudio=%s)", async (esEstudio) => {
    const { result, unmount } = renderHook(() => useResponsableFilter("espacio", esEstudio));
    await waitFor(() => expect(result.current.opciones).toEqual(["Ana", "Luis"]));
    act(() => result.current.toggle("Luis"));
    expect(result.current.filtrar(rows).map((row) => row.id)).toEqual(["2"]);
    act(() => window.dispatchEvent(new CustomEvent("iustrack:tutorial-filtro-responsable", { detail: true })));
    expect(result.current.seleccionados).toEqual(["Ana"]);
    expect(result.current.filtrar(rows).map((row) => row.id)).toEqual(["1"]);
    act(() => window.dispatchEvent(new CustomEvent("iustrack:tutorial-filtro-responsable", { detail: false })));
    expect(result.current.seleccionados).toEqual(["Luis"]);
    expect(result.current.filtrar(rows).map((row) => row.id)).toEqual(["2"]);
    unmount();
  });

  it("sin responsables no aplica filtros ni falla", async () => {
    const { result, unmount } = renderHook(() => useResponsableFilter(null, false));
    act(() => window.dispatchEvent(new CustomEvent("iustrack:tutorial-filtro-responsable", { detail: true })));
    expect(result.current.activo).toBe(false);
    expect(result.current.filtrar(rows)).toEqual(rows);
    unmount();
  });
});