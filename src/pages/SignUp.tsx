import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scale, Mail, Lock, User, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return toast.error("Las contraseñas no coinciden.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered"))
        toast.error("Ya existe una cuenta con ese email.");
      else toast.error("No se pudo crear la cuenta. Intentá de nuevo.");
      return;
    }
    setSentTo(email);
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
        </div>

        <div className="elevated-card rounded-2xl p-8 animate-scale-in">
          {sentTo ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-alert-ok/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-alert-ok" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">Revisá tu email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Te enviamos un mail de verificación a <span className="text-foreground font-medium">{sentTo}</span>.
                Por favor confirmá tu cuenta antes de iniciar sesión.
              </p>
              <Button className="w-full h-11" onClick={() => navigate("/auth")}>Volver al login</Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-semibold text-foreground mb-1">Creá tu cuenta</h2>
              <p className="text-sm text-muted-foreground mb-6">Completá tus datos para empezar</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-11" placeholder="Dr. Juan Pérez" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11" placeholder="tu@justicia.gob.ar" required autoComplete="email" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11" placeholder="Mínimo 8 caracteres" required minLength={8} autoComplete="new-password" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10 h-11" placeholder="Repetí la contraseña" required minLength={8} autoComplete="new-password" />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear cuenta
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                ¿Ya tenés cuenta?{" "}
                <Link to="/auth" className="text-primary font-medium hover:underline">Iniciá sesión</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
