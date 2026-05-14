import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface VocaliaActual {
  id: string;
  nombre: string;
  tribunalId: string;
}

interface Ctx {
  vocalia: VocaliaActual | null;
  setVocalia: (v: VocaliaActual | null) => void;
  clearVocalia: () => void;
}

const VocaliaContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "justrack-vocalia-actual";

export function VocaliaProvider({ children }: { children: ReactNode }) {
  const [vocalia, setVocaliaState] = useState<VocaliaActual | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as VocaliaActual) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (vocalia) localStorage.setItem(STORAGE_KEY, JSON.stringify(vocalia));
    else localStorage.removeItem(STORAGE_KEY);
  }, [vocalia]);

  return (
    <VocaliaContext.Provider
      value={{
        vocalia,
        setVocalia: setVocaliaState,
        clearVocalia: () => setVocaliaState(null),
      }}
    >
      {children}
    </VocaliaContext.Provider>
  );
}

export function useVocaliaActual() {
  const ctx = useContext(VocaliaContext);
  if (!ctx) throw new Error("useVocaliaActual debe usarse dentro de <VocaliaProvider>");
  return ctx;
}
