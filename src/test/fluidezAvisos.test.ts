import { afterEach, describe, expect, it, vi } from "vitest";
import { conAvisosAgrupados } from "@/lib/loteAvisos";
import { emitCausasChanged, onCausasChanged } from "@/lib/causasBus";

afterEach(() => { vi.useRealTimers(); });

describe("guardado de varios pasos", () => {
  it("refresca las listas una sola vez al final, no una por paso", async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const off = onCausasChanged(cb);

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
    off();
  });

  it("si el guardado falla, igual avisa al final para no dejar listas viejas", async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const off = onCausasChanged(cb);
    await expect(conAvisosAgrupados(async () => {
      emitCausasChanged();
      throw new Error("falló");
    })).rejects.toThrow("falló");
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });

  it("fuera de un guardado, avisos seguidos se juntan en uno", async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const off = onCausasChanged(cb);
    emitCausasChanged(); emitCausasChanged(); emitCausasChanged();
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });
});
