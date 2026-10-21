import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { apareceEnListaPorSituacion, patchEstadoDesdeMenu } from "@/lib/reglasListas";
import { emitCausasChanged } from "@/lib/causasBus";
import { useRemoteCausas } from "@/hooks/useRemoteCausas";
import { guardarMemoriaVista, leerMemoriaVista } from "@/lib/memoriaVistaLista";
import EventoFormInline from "@/components/forms/EventoFormInline";
import type { EventoInput } from "@/hooks/useEventoMutations";
import type { Causa } from "@/data/mockCausas";

const causa = (id: string) => ({ id } as unknown as Causa);

describe("Detenidos / Rebeldes / SJP no dependen del estado de la causa", () => {
  it("una causa Para sacar sentencia con un detenido sigue en Detenidos", () => {
    expect(apareceEnListaPorSituacion("para_sentencia", [{ situacion_libertad: "detenido" }], "detenido")).toBe(true);
  });
  it("una causa Para comunicar con un rebelde sigue en Rebeldes", () => {
    expect(apareceEnListaPorSituacion("para_comunicar", [{ situacion_libertad: "rebelde" }], "rebelde")).toBe(true);
  });
  it("una causa Para sacar sentencia con un imputado en probation sigue en SJP", () => {
    expect(apareceEnListaPorSituacion("para_sentencia", [{ situacion_libertad: "probation" }], "probation")).toBe(true);
  });
  it("una causa terminada sale de Detenidos aunque tenga un detenido", () => {
    expect(apareceEnListaPorSituacion("terminada", [{ situacion_libertad: "detenido" }], "detenido")).toBe(false);
  });
  it("un imputado borrado no cuenta", () => {
    expect(apareceEnListaPorSituacion("tramite", [{ situacion_libertad: "detenido", borrado_en: "2026-01-01" }], "detenido")).toBe(false);
  });
});

describe("Cambio de estado por click derecho", () => {
  it("Para sacar sentencia se guarda como para_sentencia", () => {
    expect(patchEstadoDesdeMenu("Para sacar sentencia")).toEqual({ estado_causa: "para_sentencia", tipo_recurso: null });
  });
  it("Para comunicar se guarda como para_comunicar", () => {
    expect(patchEstadoDesdeMenu("Para comunicar")).toEqual({ estado_causa: "para_comunicar", tipo_recurso: null });
  });
  it("Casación se guarda como recurso de casación", () => {
    expect(patchEstadoDesdeMenu("Casación")).toEqual({ estado_causa: "recurso", tipo_recurso: "casacion" });
  });
});

describe("Listas que se actualizan solas", () => {
  it("al avisar un cambio, la lista se vuelve a cargar sin vaciarse", async () => {
    let llamada = 0;
    const fetcher = vi.fn(async () => (++llamada === 1 ? [causa("a")] : [causa("a"), causa("b")]));
    const { result } = renderHook(() => useRemoteCausas("k1", fetcher));
    await waitFor(() => expect(result.current.causas).toHaveLength(1));
    const vistas: number[] = [];
    act(() => { emitCausasChanged(); });
    vistas.push(result.current.causas.length);
    await waitFor(() => expect(result.current.causas).toHaveLength(2));
    expect(vistas).toEqual([1]);
    expect(result.current.loading).toBe(false);
  });

  it("una respuesta vieja no pisa a una más nueva", async () => {
    const resolvers: ((v: Causa[]) => void)[] = [];
    const fetcher = () => new Promise<Causa[]>((r) => { resolvers.push(r); });
    const { result } = renderHook(() => useRemoteCausas("k2", fetcher));
    await act(async () => { void result.current.refetch(); });
    await act(async () => { resolvers[1]([causa("nueva")]); });
    await act(async () => { resolvers[0]([causa("vieja")]); });
    expect(result.current.causas.map((c) => c.id)).toEqual(["nueva"]);
  });
});

describe("La lista recuerda dónde estabas", () => {
  it("guarda búsqueda, página y scroll por lista", () => {
    guardarMemoriaVista("esp:tramite", { search: "perez", page: 3, scrollTop: 420 });
    expect(leerMemoriaVista("esp:tramite")).toMatchObject({ search: "perez", page: 3, scrollTop: 420 });
    expect(leerMemoriaVista("esp:detenidos")).toEqual({});
  });
});

describe("Anotación abierta al tocar Guardar de la ficha", () => {
  it("lo escrito queda disponible para guardarse aunque no se toque su propio botón", () => {
    let leer: (() => EventoInput | null) | null = null;
    render(
      <EventoFormInline
        mode="crear"
        saving={false}
        onSubmit={() => {}}
        onCancel={() => {}}
        onRegistrarPendiente={(fn) => { leer = fn; }}
      />,
    );
    expect(leer!()).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Ej. Audiencia de debate"), { target: { value: "Pedir informe" } });
    expect(leer!()).toMatchObject({ titulo: "Pedir informe" });
  });

  it("una anotación editada sin cambios no se vuelve a guardar", () => {
    let leer: (() => EventoInput | null) | null = null;
    render(
      <EventoFormInline
        mode="editar"
        initialValue={{ titulo: "Audiencia", tipo_evento: null, descripcion: null, fecha: null }}
        saving={false}
        onSubmit={() => {}}
        onCancel={() => {}}
        onRegistrarPendiente={(fn) => { leer = fn; }}
      />,
    );
    expect(leer!()).toBeNull();
    fireEvent.change(screen.getByDisplayValue("Audiencia"), { target: { value: "Audiencia preliminar" } });
    expect(leer!()).toMatchObject({ titulo: "Audiencia preliminar" });
  });
});
