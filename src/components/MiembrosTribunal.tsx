import { useState } from "react";
import { Copy, Check, UserPlus, Trash2, Shield, ShieldOff, Loader2, Mail, Link2, List, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTribunal } from "@/hooks/useTribunal";
import { useVocalias } from "@/hooks/useVocalias";
import { useMiembrosTribunal, MiembroRow, RolMiembro } from "@/hooks/useMiembrosTribunal";
import { useInvitaciones, InvitacionRow } from "@/hooks/useInvitaciones";
import { useAuth } from "@/context/AuthContext";
import RefreshButton from "@/components/RefreshButton";
import InvitarMiembroDialog from "@/components/forms/InvitarMiembroDialog";

interface Props {
  tribunalId: string;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

function diasHasta(d: string | null): number {
  if (!d) return Infinity;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function MiembrosTribunal({ tribunalId }: Props) {
  const { user } = useAuth();
  const { tribunal, loading: tLoading, refetch: refetchTribunal } = useTribunal(tribunalId);
  const miembrosHook = useMiembrosTribunal(tribunalId);
  const invHook = useInvitaciones(tribunalId);
  const { vocalias: todasVocalias, refetch: refetchVocalias } = useVocalias();
  const vocaliasDelTribunal = todasVocalias.filter((v) => v.tribunal_id === tribunalId);
  const cantidadVocalias = vocaliasDelTribunal.length;
  const modo = tribunal?.modo ?? "vocalias_separadas";
  const [cambiandoModo, setCambiandoModo] = useState(false);

  const cambiarModoTribunal = async () => {
    if (!tribunal) return;
    const nuevoModo = modo === "lista_unica" ? "vocalias_separadas" : "lista_unica";
    if (nuevoModo === "lista_unica" && cantidadVocalias !== 1) {
      toast.error("Solo se puede cambiar a lista única si hay una sola vocalía.");
      return;
    }
    setCambiandoModo(true);
    const { error } = await supabase
      .from("tribunales")
      .update({ modo: nuevoModo })
      .eq("id", tribunal.id);
    setCambiandoModo(false);
    if (error) { toast.error("No se pudo cambiar el modo del tribunal."); return; }
    toast.success(nuevoModo === "lista_unica" ? "Ahora el tribunal trabaja como lista única." : "Ahora el tribunal trabaja con vocalías separadas.");
    refetchTribunal();
    refetchVocalias();
  };

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [openInvitar, setOpenInvitar] = useState(false);
  const [confirmCambio, setConfirmCambio] = useState<MiembroRow | null>(null);
  const [confirmQuitar, setConfirmQuitar] = useState<MiembroRow | null>(null);
  const [confirmCancelInv, setConfirmCancelInv] = useState<InvitacionRow | null>(null);

  const copiar = async (texto: string, cb: () => void) => {
    await navigator.clipboard.writeText(texto);
    cb();
    setTimeout(() => { setCopiedCode(false); setCopiedTokenId(null); }, 1500);
  };

  const handleCambiarRol = async () => {
    if (!confirmCambio) return;
    const nuevo: RolMiembro = confirmCambio.rol === "admin" ? "miembro" : "admin";
    // Bloquear degradación del último admin
    if (confirmCambio.rol === "admin" && miembrosHook.adminCount <= 1) {
      toast.error("No se puede degradar al único administrador del tribunal.");
      setConfirmCambio(null);
      return;
    }
    const r = await miembrosHook.cambiarRol(confirmCambio.id, nuevo);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success(`${confirmCambio.nombre} ahora es ${nuevo}`);
    setConfirmCambio(null);
  };

  const handleQuitar = async () => {
    if (!confirmQuitar) return;
    if (confirmQuitar.usuario_id === user?.id) {
      toast.error("No podés quitarte a vos mismo.");
      setConfirmQuitar(null);
      return;
    }
    if (confirmQuitar.rol === "admin" && miembrosHook.adminCount <= 1) {
      toast.error("No se puede quitar al único administrador.");
      setConfirmQuitar(null);
      return;
    }
    const r = await miembrosHook.quitarMiembro(confirmQuitar.id);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success(`${confirmQuitar.nombre} fue quitado del tribunal`);
    setConfirmQuitar(null);
  };

  const handleCancelarInv = async () => {
    if (!confirmCancelInv) return;
    const r = await invHook.cancelar(confirmCancelInv.id);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Invitación cancelada");
    setConfirmCancelInv(null);
  };

  const copiarLinkInv = (inv: InvitacionRow) => {
    const link = `${window.location.origin}/invitacion/${inv.token}`;
    copiar(link, () => setCopiedTokenId(inv.id));
    toast.success("Link copiado");
  };

  const reenviarInv = async (inv: InvitacionRow) => {
    const r = await invHook.reenviar(inv.id);
    if (r.ok !== true) { toast.error(r.error); return; }
    if (r.data?.sent) toast.success("Mail reenviado");
    else toast.message("No se pudo reenviar el mail. Copiá el link manualmente.");
  };

  return (
    <div className="space-y-8">
      {/* Header tribunal + código */}
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Tribunal</h2>
            {tLoading ? (
              <Skeleton className="h-7 w-48 mt-1" />
            ) : (
              <h3 className="text-2xl font-display font-bold text-foreground">{tribunal?.nombre ?? "—"}</h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={() => { refetchTribunal(); miembrosHook.refetch(); invHook.refetch(); }} loading={miembrosHook.loading || invHook.loading} />
          </div>
        </div>

        {tribunal?.codigo_acceso && (
          <div className="mt-4 rounded-md bg-muted/40 border border-border p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Compartí este código con quien quieras invitar
              </div>
              <code className="text-xl font-mono font-bold text-primary tracking-widest">{tribunal.codigo_acceso}</code>
            </div>
            <Button size="sm" variant="outline" onClick={() => copiar(tribunal.codigo_acceso!, () => setCopiedCode(true))}>
              {copiedCode ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copiedCode ? "Copiado" : "Copiar código"}
            </Button>
          </div>
        )}
      </section>

      {/* Miembros */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-foreground/80">
            Miembros actuales
          </h3>
          <Button size="sm" onClick={() => setOpenInvitar(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invitar miembro
          </Button>
        </div>

        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {miembrosHook.loading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : miembrosHook.miembros.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">Sin miembros</TableCell></TableRow>
              ) : miembrosHook.miembros.map((m) => {
                const esYo = m.usuario_id === user?.id;
                const ultimoAdmin = m.rol === "admin" && miembrosHook.adminCount <= 1;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nombre}{esYo && <span className="text-[10px] text-muted-foreground ml-1.5">(vos)</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.rol === "admin" ? "default" : "secondary"}>{m.rol}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(m.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost" size="sm"
                          disabled={miembrosHook.saving || ultimoAdmin}
                          onClick={() => setConfirmCambio(m)}
                          title={ultimoAdmin ? "No se puede degradar al único admin" : "Cambiar rol"}
                        >
                          {m.rol === "admin" ? <ShieldOff className="w-3.5 h-3.5 mr-1" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
                          {m.rol === "admin" ? "Pasar a miembro" : "Pasar a admin"}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={miembrosHook.saving || esYo || ultimoAdmin}
                          onClick={() => setConfirmQuitar(m)}
                          title={esYo ? "No podés quitarte a vos mismo" : ultimoAdmin ? "No se puede quitar al único admin" : "Quitar"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Invitaciones pendientes */}
      <section className="space-y-3">
        <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-foreground/80">
          Invitaciones pendientes
        </h3>

        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invHook.loading ? (
                <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : invHook.invitaciones.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">No hay invitaciones pendientes</TableCell></TableRow>
              ) : invHook.invitaciones.map((i) => {
                const dias = diasHasta(i.expira_en);
                const porVencer = dias < 2;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.email_invitado}</TableCell>
                    <TableCell><Badge variant="secondary">{i.rol_a_asignar}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(i.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(i.expira_en)}</TableCell>
                    <TableCell>
                      <Badge variant={porVencer ? "destructive" : "outline"} className="text-[10px]">
                        {porVencer ? `Por vencer (${dias}d)` : "Vigente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copiarLinkInv(i)}>
                          {copiedTokenId === i.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={invHook.saving} onClick={() => reenviarInv(i)}>
                          {invHook.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancelInv(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <InvitarMiembroDialog
        open={openInvitar}
        onOpenChange={(o) => { setOpenInvitar(o); if (!o) invHook.refetch(); }}
        tribunalId={tribunalId}
      />

      <AlertDialog open={!!confirmCambio} onOpenChange={(o) => !o && setConfirmCambio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar el rol de {confirmCambio?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pasará de <strong>{confirmCambio?.rol}</strong> a <strong>{confirmCambio?.rol === "admin" ? "miembro" : "admin"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleCambiarRol(); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmQuitar} onOpenChange={(o) => !o && setConfirmQuitar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar a {confirmQuitar?.nombre} del tribunal?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no podrá acceder a las causas. Esta acción se puede revertir invitándolo de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleQuitar(); }}
            >
              Sí, quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmCancelInv} onOpenChange={(o) => !o && setConfirmCancelInv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la invitación a {confirmCancelInv?.email_invitado}?</AlertDialogTitle>
            <AlertDialogDescription>
              El link existente dejará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleCancelarInv(); }}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
