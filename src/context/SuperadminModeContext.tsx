import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

interface SuperadminModeState {
  tribunalId: string;
  tribunalNombre: string;
}

interface SuperadminModeCtx {
  mode: SuperadminModeState | null;
  enter: (state: SuperadminModeState) => void;
  exit: () => void;
}

const Ctx = createContext<SuperadminModeCtx | undefined>(undefined);
const STORAGE_KEY = "superadmin_mode";

export function SuperadminModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SuperadminModeState | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SuperadminModeState) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (mode) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [mode]);

  const enter = useCallback((s: SuperadminModeState) => setMode(s), []);
  const exit = useCallback(() => setMode(null), []);

  return <Ctx.Provider value={{ mode, enter, exit }}>{children}</Ctx.Provider>;
}

export function useSuperadminMode() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSuperadminMode debe usarse dentro de <SuperadminModeProvider>");
  return c;
}
