import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Loader2, Scale, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const PENDING_KEY = "pending_invitation_token";

interface InvitacionInfo {
  rol_a_asignar: "admin" | "miembro";
  tribunal_nombre: string;
  expira_en: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<InvitacionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invitaciones")
        .select("rol_a_asignar, expira_en, usado, tribunales:tribunal_id(nombre)")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError("No encontramos esa invitación. Puede que haya sido cancelada o ya esté usada.");
      } else if (data.usado) {
        setError("Esta invitación ya fue usada.");
      } else if (new Date(data.expira_en).getTime() < Date.now()) {
        setError("Esta invitación expiró.");
      } else {
        setInfo({
          rol_a_asignar: data.rol_a_asignar as "admin" | "miembro",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tribunal_nombre: (data as any).tribunales?.nombre ?? "el tribunal",
          expira_en: data.expira_en,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, user]);

  const guardarYRedirigir = (to: string) => {
    if (token) localStorage.setItem(PENDING_KEY, token);
    navigate(to);
  };

  const aceptar = async () => {
    if (!token) return;
    setAccepting(true);
    const { error } = await supabase.rpc("aceptar_invitacion", { p_token: token });
    setAccepting(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("inválida") || msg.includes("expirada") || msg.includes("usada")) {
        toast.error("La invitación es inválida, expirada o ya fue usada.");
      } else if (msg.includes("ya")) {
        toast.message("Ya sos miembro de este tribunal.");
        navigate("/", { replace: true });
      } else {
        toast.error("No pudimos aceptar la invitación. Intentá de nuevo.");
      }
      return;
    }
    localStorage.removeItem(PENDING_KEY);
    toast.success("¡Listo! Te uniste al tribunal");
    navigate("/", { replace: true });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sin sesión: ofrecer login o registro.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-surface">
        <div className="max-w-md w-full elevated-card rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold mx-auto flex items-center justify-center shadow-glow mb-4">
            <Scale className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Te invitaron a un tribunal</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Para aceptar la invitación necesitás iniciar sesión o crear una cuenta.
          </p>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => guardarYRedirigir("/auth")}>
              <LogIn className="w-4 h-4 mr-1.5" /> Ya tengo cuenta — Iniciar sesión
            </Button>
            <Button variant="outline" className="w-full" onClick={() => guardarYRedirigir("/signup")}>
              Necesito crear una cuenta — Registrarme
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sesión activa con error.
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-surface">
        <div className="max-w-md w-full elevated-card rounded-2xl p-8 text-center">
          <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-display font-bold mb-2">No se pudo abrir la invitación</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button asChild><Link to="/">Volver al inicio</Link></Button>
        </div>
      </div>
    );
  }

  // Sesión + invitación válida.
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-surface">
      <div className="max-w-md w-full elevated-card rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="text-xl font-display font-bold mb-1">Invitación al tribunal</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Te invitaron a <strong className="text-foreground">{info?.tribunal_nombre}</strong> como{" "}
          <strong className="text-foreground">{info?.rol_a_asignar}</strong>.
        </p>
        <div className="space-y-2">
          <Button className="w-full" onClick={aceptar} disabled={accepting}>
            {accepting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Aceptar invitación
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
            Rechazar
          </Button>
        </div>
      </div>
    </div>
  );
}
