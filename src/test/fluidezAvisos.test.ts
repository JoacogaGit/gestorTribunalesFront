import { describe, expect, it, vi } from "vitest";
import { conAvisosAgrupados } from "@/lib/loteAvisos";

// El bus usa EventTarget y temporizadores; lo probamos con relojes falsos.
describe("guardado de varios pasos", () => {
  it("refresca las listas una sola vez al final, no una por paso", async () => {
    vi.useFakeTimers();
    const { emitCausasChanged } = await import("@/lib/causasBus");
    const { renderHook } = await import("@testing-library/react");
    const { useCausasChanged } = await import("@/lib/causasBus");
    const cb = vi.fn();
    renderHook(() => useCausasChanged(cb));

    await conAvisosAgrupados(async () => {
      emitCausasChanged(); // causa
      await vi.advanceTimersByTimeAsync(200);
      emitCausasChanged(); // imputado 1
      await vi.advanceTimersByTimeAsync(200);
      emitCausasChanged(); // imputado 2
      await vi.advanceTimersByTimeAsync(200);
      expect(cb).not.toHaveBeenCalled();
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
