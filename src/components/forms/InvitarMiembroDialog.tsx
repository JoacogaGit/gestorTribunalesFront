import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Check, Mail, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useInvitaciones, RolInvitacion } from "@/hooks/useInvitaciones";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tribunalId: string;
  /** Si se pasa, fuerza el rol y oculta el selector. Útil para "invitar a un nuevo admin" desde Abandonar tribunal. */
  forceRol?: RolInvitacion;
}

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
});

export default function InvitarMiembroDialog({ open, onOpenChange, tribunalId, forceRol }: Props) {
  const inv = useInvitaciones(tribunalId);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolInvitacion>(forceRol ?? "miembro");
  const [enviarMail, setEnviarMail] = useState(true);
  const [resultado, setResultado] = useState<{
    link: string;
    email: string;
    sent: boolean;
    reason?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail(""); setRol(forceRol ?? "miembro"); setEnviarMail(true); setResultado(null); setCopied(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const r = await inv.crear(parsed.data.email, rol, enviarMail);
    if (r.ok !== true) { toast.error(r.error); return; }
    const link = `${window.location.origin}/invitacion/${r.data!.invitacion.token}`;
    setResultado({ link, email: r.data!.invitacion.email_invitado, sent: r.data!.sent, reason: r.data!.reason });
    toast.success("Invitación generada");
  };

  const copiar = async () => {
    if (!resultado) return;
    await navigator.clipboard.writeText(resultado.link);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{resultado ? "Invitación creada" : "Invitar miembro"}</DialogTitle>
          {!resultado && (
            <DialogDescription className="text-xs">
              Generá una invitación para sumar a alguien al tribunal.
            </DialogDescription>
          )}
        </DialogHeader>

        {!resultado ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="persona@correo.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>

            {forceRol ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
                Esta persona será invitada como <strong>{forceRol === "admin" ? "Admin" : "Miembro"}</strong> del tribunal.
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="rol">Rol</Label>
                <Select value={rol} onValueChange={(v) => setRol(v as RolInvitacion)}>
                  <SelectTrigger id="rol"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="miembro">Miembro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Los admins pueden invitar a otros miembros, cambiar roles y eliminar miembros.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 pt-2">
              <Checkbox id="enviarMail" checked={enviarMail} onCheckedChange={(v) => setEnviarMail(!!v)} />
              <Label htmlFor="enviarMail" className="text-xs font-normal cursor-pointer leading-tight">
                Intentar enviar mail automáticamente. Si no es posible, vas a poder copiar el link manualmente.
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={inv.saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inv.saving}>
                {inv.saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Generar invitación
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Link de invitación</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all font-mono bg-background rounded px-2 py-1.5 border border-border">
                  {resultado.link}
                </code>
                <Button type="button" size="sm" variant="outline" onClick={copiar}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Destinatario: <span className="text-foreground font-medium">{resultado.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                {resultado.sent
                  ? "Mail enviado correctamente."
                  : "El mail no se envió automáticamente. Copiá el link y enviáselo vos."}
              </div>
              <p className="pt-2">La invitación expira en 7 días.</p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Listo</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
