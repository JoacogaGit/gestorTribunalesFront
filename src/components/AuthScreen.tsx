import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Scale, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-surface" />
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl -z-10" />
      <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-gold/15 blur-3xl -z-10" />

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

          <p className="text-center text-xs text-muted-foreground mt-6">
            ¿No tenés cuenta?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Registrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
