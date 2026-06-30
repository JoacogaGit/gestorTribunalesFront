import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return toast.error("Las contraseñas no coinciden.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      toast.error("No se pudo actualizar la contraseña. El link puede haber expirado.");
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Contraseña actualizada. Iniciá sesión con tu nueva contraseña.");
    navigate("/auth", { replace: true });
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
          <h2 className="text-xl font-display font-semibold text-foreground mb-1">Nueva contraseña</h2>
          <p className="text-sm text-muted-foreground mb-6">Elegí una contraseña nueva para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
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
              Actualizar contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
