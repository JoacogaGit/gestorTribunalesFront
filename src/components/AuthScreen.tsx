import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Scale, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SubtleBackground from "@/components/SubtleBackground";

export default function AuthScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login")) toast.error("Email o contraseña incorrectos.");
      else if (msg.includes("not confirmed") || msg.includes("not verified"))
        toast.error("Tu cuenta no está verificada. Revisá tu casilla de mail.");
      else toast.error("Ocurrió un error. Intentá de nuevo.");
      return;
    }
    toast.success("Sesión iniciada");
    navigate("/", { replace: true });
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };


  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <SubtleBackground />

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">JusTrack</h1>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide">Sistema de gestión de causas penales</p>
        </div>

        <div className="elevated-card rounded-2xl p-8 animate-scale-in">
          <h2 className="text-xl font-display font-semibold text-foreground mb-1">Bienvenido de nuevo</h2>
          <p className="text-sm text-muted-foreground mb-6">Ingresá tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="tu@justicia.gob.ar"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11" required autoComplete="email" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11" required autoComplete="current-password" />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

            <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-card px-2 text-muted-foreground">o</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full h-11 inline-flex items-center justify-center gap-2.5 rounded-md border border-border bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.2 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.2 29.1 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.1z"/>
              <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.7 13.1-4.6l-6-5.1c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3-11.3-7.5l-6.6 5.1C9.6 39.1 16.2 43.5 24 43.5z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.2 5.5l6 5.1c-.4.4 6.4-4.7 6.4-14.1 0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            ¿No tenés cuenta?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Registrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
