import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumirTutorialOficina, programarTutorialOficina } from "@/lib/tutorialInicio";
import { payloadSecreto } from "@/lib/causaSecreta";
import { useCrearEspacio } from "@/hooks/useCrearEspacio";
import type { CausaInput } from "@/hooks/useCausaMutations";

const { insert, rpc } = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: (data: unknown) => { insert(data); return { select: () => ({ single: async () => ({ data: { id: "espacio", nombre: "Espacio 2", tribunal_id: "oficina" }, error: null }) }) }; } }),
    rpc,
  },
}));

beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); });

describe("Tutorial de nueva oficina", () => {
  it("arranca una vez en la oficina creada aunque se haya completado antes", () => {
    localStorage.setItem("iustrack:tutorial_completado:usuario", "1");
    programarTutorialOficina("usuario", "nueva");
    expect(consumirTutorialOficina("usuario", "anterior")).toBe(false);
    expect(consumirTutorialOficina("otro", "nueva")).toBe(false);
    expect(consumirTutorialOficina("usuario", "nueva")).toBe(true);
    expect(consumirTutorialOficina("usuario", "nueva")).toBe(false);
    localStorage.clear();
  });
});

describe("Secreto desde la ficha", () => {
  const causa = { expediente_nro: "23", secreta: true } as CausaInput;
  it("incluye la elección de secreto para admin", () => {
    expect(payloadSecreto(causa, true).secreta).toBe(true);
    expect(payloadSecreto({ ...causa, secreta: false }, true).secreta).toBe(false);
  });
  it("no modifica el secreto al guardar como no-admin", () => {
    expect(payloadSecreto(causa, false)).not.toHaveProperty("secreta");
    expect(payloadSecreto(causa, false).expediente_nro).toBe("23");
  });
});

describe("Contraseña opcional al crear espacio", () => {
  it("crea sin contraseña cuando no se solicita", async () => {
    const { result } = renderHook(() => useCrearEspacio());
    await result.current.crear("oficina", "Espacio 2", null);
    expect(insert).toHaveBeenCalledWith({ tribunal_id: "oficina", nombre: "Espacio 2" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("guarda la contraseña mediante la operación protegida", async () => {
    rpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useCrearEspacio());
    await result.current.crear("oficina", "Espacio 2", "clave de prueba");
    expect(rpc).toHaveBeenCalledWith("definir_password_vocalia", { p_vocalia_id: "espacio", p_password: "clave de prueba" });
  });
  it("rechaza la contraseña vacía antes de crear", async () => {
    const { result } = renderHook(() => useCrearEspacio());
    await expect(result.current.crear("oficina", "Espacio 2", " ")).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
  it("reintenta la contraseña sin duplicar el espacio si falla", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "falló" } }).mockResolvedValueOnce({ error: null });
    const { result } = renderHook(() => useCrearEspacio());
    await expect(result.current.crear("oficina", "Espacio 2", "clave de prueba")).rejects.toThrow();
    await result.current.crear("oficina", "Espacio 2", "clave de prueba");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});