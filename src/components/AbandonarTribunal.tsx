import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { LogOut, Loader2, AlertTriangle, Shield, UserPlus, Trash2, Archive, Copy, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMiembrosTribunal } from "@/hooks/useMiembrosTribunal";
import { useTribunal } from "@/hooks/useTribunal";
import InvitarMiembroDialog from "@/components/forms/InvitarMiembroDialog";

export interface AbandonarTribunalHandle {
  /** Abre el flujo de abandono desde un trigger externo (ej: UserMenu). */
  start: () => void;
}

interface Props {
  tribunalId: string;
  /** Llamado tras abandonar/eliminar; debería limpiar la vocalía activa y refrescar membresías. */
  onAbandoned: () => void;
  /** Si true, no renderiza la sección con el botón. Sólo expone start() vía ref. */
  hideSection?: boolean;
}

type Step = "idle" | "case1" | "case2" | "case3" | "confirm-archive" | "confirm-delete";

const AbandonarTribunal = forwardRef<AbandonarTribunalHandle, Props>(function AbandonarTribunal(
  { tribunalId, onAbandoned, hideSection },
  ref,
) {
  const { user } = useAuth();
  const { tribunal } = useTribunal(tribunalId);
  const { miembros, refetch: refetchMiembros, adminCount, cambiarRol, saving } = useMiembrosTribunal(tribunalId);
  const [step, setStep] = useState<Step>("idle");
  const [processing, setProcessing] = useState(false);
  const [openInvitar, setOpenInvitar] = useState(false);
  const [copied, setCopied] = useState(false);

  const yo = useMemo(() => miembros.find((m) => m.usuario_id === user?.id) ?? null, [miembros, user]);
  const otros = useMemo(() => miembros.filter((m) => m.usuario_id !== user?.id), [miembros, user]);
  const soyAdmin = yo?.rol === "admin";
  const soyUnicoMiembro = miembros.length === 1 && !!yo;
  const soyUnicoAdmin = soyAdmin && adminCount === 1 && otros.length > 0;

  // Si después de promover a otro admin yo dejo de ser único admin, pasar al caso 1
  useEffect(() => {
    if (step === "case2" && !soyUnicoAdmin && !soyUnicoMiembro) {
      setStep("case1");
    }
  }, [step, soyUnicoAdmin, soyUnicoMiembro]);

  const start = () => {
    if (soyUnicoMiembro) setStep("case3");
    else if (soyUnicoAdmin) setStep("case2");
    else setStep("case1");
  };

  const cerrar = () => {
    if (processing) return;
    setStep("idle");
  };

  const abandonarSimple = async () => {
    if (!yo) return;
    setProcessing(true);
    const { error } = await supabase.from("miembros_tribunal").delete().eq("id", yo.id);
    setProcessing(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Abandonaste ${tribunal?.nombre ?? "el tribunal"}`);
    setStep("idle");
    onAbandoned();
  };

  const archivar = async () => {
    setProcessing(true);
    const { error } = await supabase.rpc("abandonar_tribunal_archivar", { p_tribunal_id: tribunalId });
    setProcessing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tribunal archivado en papelera por 30 días");
    setStep("idle");
    onAbandoned();
  };

  const eliminarTodo = async () => {
    setProcessing(true);
    const { error } = await supabase.rpc("abandonar_tribunal_eliminar_todo", { p_tribunal_id: tribunalId });
    setProcessing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tribunal eliminado definitivamente");
    setStep("idle");
    onAbandoned();
  };

  const promoverAAdmin = async (miembroId: string, nombre: string) => {
    const r = await cambiarRol(miembroId, "admin");
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success(`${nombre} ahora es admin`);
    refetchMiembros();
  };

  const copiarCodigo = async () => {
    if (!tribunal?.codigo_acceso) return;
    await navigator.clipboard.writeText(tribunal.codigo_acceso);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-display font-semibold text-foreground">Abandonar tribunal</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Dejás de tener acceso a este tribunal. Esta acción no afecta a los demás miembros (salvo que seas el último).
              </p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={start} disabled={!yo}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Abandonar tribunal
          </Button>
        </div>
      </section>

      {/* CASO 1 — simple */}
      <AlertDialog open={step === "case1"} onOpenChange={(o) => !o && cerrar()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmás abandonar {tribunal?.nombre ?? "el tribunal"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a perder el acceso a las causas, calendario y configuración. Si querés volver, alguien tiene que invitarte de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processing}
              onClick={(e) => { e.preventDefault(); abandonarSimple(); }}
            >
              {processing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Abandonar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CASO 2 — único admin con otros miembros */}
      <Dialog open={step === "case2"} onOpenChange={(o) => !o && cerrar()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sos el único admin de este tribunal</DialogTitle>
            <DialogDescription>
              Antes de abandonar, nombrá a otro admin. Una vez que haya otro admin vas a poder abandonar normalmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border divide-y divide-border max-h-72 overflow-y-auto">
              {otros.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No hay otros miembros en el tribunal.</div>
              ) : otros.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => promoverAAdmin(m.id, m.nombre)}>
                    <Shield className="w-3.5 h-3.5 mr-1.5" /> Promover a admin
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpenInvitar(true)} className="w-full">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invitar a un nuevo admin
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CASO 3 — único miembro */}
      <Dialog open={step === "case3"} onOpenChange={(o) => !o && cerrar()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Sos el único miembro de {tribunal?.nombre ?? "este tribunal"}
            </DialogTitle>
            <DialogDescription>Si abandonás, nadie más queda. Elegí qué hacer con el tribunal.</DialogDescription>
          </DialogHeader>

          {tribunal?.codigo_acceso && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">Tu código de acceso (anotalo si elegís archivar):</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-lg font-mono font-bold text-foreground tracking-widest">{tribunal.codigo_acceso}</code>
                <Button size="sm" variant="outline" onClick={copiarCodigo}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <div className="flex items-start gap-2 mb-2">
                <Archive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">(A) Abandonar y archivar (papelera 30 días)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Si te arrepentís, contactá a soporte con el código de acceso para restaurarlo. Después de 30 días se borra definitivo.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-destructive/40 p-3">
              <div className="flex items-start gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">(B) Abandonar y eliminar todo ahora</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se borra el tribunal + TODAS sus causas, eventos, imputados, prescripciones. <strong>NO se puede deshacer.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={cerrar} disabled={processing}>Cancelar</Button>
            <Button variant="outline" onClick={() => setStep("confirm-archive")} disabled={processing}>
              <Archive className="w-3.5 h-3.5 mr-1.5" /> Abandonar y archivar
            </Button>
            <Button variant="destructive" onClick={() => setStep("confirm-delete")} disabled={processing}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Abandonar y eliminar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM ARCHIVE */}
      <AlertDialog open={step === "confirm-archive"} onOpenChange={(o) => !o && setStep("case3")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar {tribunal?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Va a quedar en la papelera por 30 días. Pasado ese plazo se borra definitivo. Asegurate de tener anotado el código de acceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={processing}
              onClick={(e) => { e.preventDefault(); archivar(); }}
            >
              {processing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Sí, archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM DELETE ALL */}
      <AlertDialog open={step === "confirm-delete"} onOpenChange={(o) => !o && setStep("case3")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">¿Eliminar TODO definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el tribunal, todas sus causas, sujetos, eventos y prescripciones. Esta acción <strong>no se puede deshacer</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processing}
              onClick={(e) => { e.preventDefault(); eliminarTodo(); }}
            >
              {processing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvitarMiembroDialog
        open={openInvitar}
        onOpenChange={(o) => { setOpenInvitar(o); if (!o) refetchMiembros(); }}
        tribunalId={tribunalId}
      />
    </>
  );
}
