import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useVocaliaActual } from "@/context/VocaliaContext";

interface AuthUser {
  id: string;
  email: string;
  nombre: string;
}

interface AuthCtx {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function toAuthUser(u: User | null | undefined): AuthUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const nombre =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (u.email ? u.email.split("@")[0] : "Usuario");
  return { id: u.id, email: u.email ?? "", nombre };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearVocalia } = useVocaliaActual();

  useEffect(() => {
    // 1) Listener primero
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      const newUser = toAuthUser(sess?.user);
      setSession(sess);
      setUser((prev) => {
        // Mantener la MISMA referencia si el usuario no cambió (evita re-renders
        // en cascada por TOKEN_REFRESHED al volver de otra pestaña).
        if (prev?.id === newUser?.id && prev?.email === newUser?.email) {
          return prev;
        }
        return newUser;
      });
    });
    // 2) Luego getSession
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const newUser = toAuthUser(data.session?.user);
      setUser((prev) => {
        if (prev?.id === newUser?.id && prev?.email === newUser?.email) return prev;
        return newUser;
      });
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    clearVocalia();
  };

  return <Ctx.Provider value={{ user, session, loading, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return c;
}
