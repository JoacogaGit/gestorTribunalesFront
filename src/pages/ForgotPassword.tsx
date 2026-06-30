import { useState } from "react";
import { Link } from "react-router-dom";
import { Scale, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
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
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">IusTrack</h1>
          </div>
        </div>

        <div className="elevated-card rounded-2xl p-8 animate-scale-in">
          <h2 className="text-xl font-display font-semibold text-foreground mb-1">Recuperar contraseña</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ingresá tu email y te enviaremos un link para restablecerla.
          </p>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Si el email existe en nuestro sistema, te enviamos un link para restablecer la contraseña.
              </p>
              <Link to="/auth"><Button className="w-full h-11">Volver al login</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11" placeholder="tu@justicia.gob.ar" required autoComplete="email" />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar mail de recuperación
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="text-primary font-medium hover:underline">Volver al login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
