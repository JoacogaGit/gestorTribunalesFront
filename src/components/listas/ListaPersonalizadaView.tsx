import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, RefreshCw, FolderOpen, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import OcultaDeSelector from "@/components/listas/OcultaDeSelector";
import { toast } from "sonner";
import CausasTable from "@/components/CausasTable";
import { emitCausasChanged } from "@/lib/causasBus";
import EmptyState from "@/components/EmptyState";
import { Causa } from "@/data/mockCausas";
import { useCausasDeLista } from "@/hooks/useCausasDeLista";
import { ListaPersonalizada, useListasPersonalizadas } from "@/hooks/useListasPersonalizadas";
import AgregarCausaListaDialog from "@/components/listas/AgregarCausaListaDialog";

interface Props {
  lista: ListaPersonalizada;
  vocaliaId: string;
  onListaBorrada: () => void;
  onNavigateToConexa?: (causaId: string) => void;
  /** Filtro global por responsable. */
  filtrarCausas?: (causas: Causa[]) => Causa[];
}

export default function ListaPersonalizadaView({ lista, vocaliaId, onListaBorrada, onNavigateToConexa, filtrarCausas }: Props) {
  const { causas: causasRaw, loading, error, refetch, agregarCausa, sacarCausa } = useCausasDeLista(lista.id, vocaliaId);
  const causas = useMemo(() => filtrarCausas ? filtrarCausas(causasRaw) : causasRaw, [causasRaw, filtrarCausas]);
  const { listas: todasLasListas, borrarLista, actualizarOcultaDe, actualizarOpciones, refetch: refetchListas } = useListasPersonalizadas(vocaliaId);
  const otrasListas = useMemo(() => todasLasListas.filter((l) => l.id !== lista.id), [todasLasListas, lista.id]);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveCausa, setConfirmRemoveCausa] = useState<Causa | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [ocultaDe, setOcultaDe] = useState<string[]>(lista.oculta_de ?? []);
  const [optClickDerecho, setOptClickDerecho] = useState(lista.seleccionable_click_derecho !== false);
  const [optCalendario, setOptCalendario] = useState(lista.mostrar_en_calendario !== false);
  const [optSoloAdmin, setOptSoloAdmin] = useState(lista.solo_admin === true);

  const abrirConfig = () => {
    setOcultaDe(lista.oculta_de ?? []);
    setOptClickDerecho(lista.seleccionable_click_derecho !== false);
    setOptCalendario(lista.mostrar_en_calendario !== false);
    setOptSoloAdmin(lista.solo_admin === true);
    setShowConfig(true);
  };

  const guardarConfig = async () => {
    setSavingConfig(true);
    try {
      await actualizarOcultaDe(lista.id, ocultaDe);
      await actualizarOpciones(lista.id, {
        seleccionable_click_derecho: optClickDerecho,
        mostrar_en_calendario: optCalendario,
        solo_admin: optSoloAdmin,
      });
      toast.success("Configuración guardada");
      setShowConfig(false);
      // Cambia qué causas se ocultan de otras pestañas: refrescarlas.
      emitCausasChanged();
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo guardar la configuración");
    } finally {
      setSavingConfig(false);
    }
  };

  const idsEnLista = useMemo(() => new Set(causas.map((c) => c.id)), [causas]);

  const handleBorrarLista = async () => {
    setDeleting(true);
    try {
      await borrarLista(lista.id);
      await refetchListas();
      emitCausasChanged();
      toast.success("Lista eliminada");
      onListaBorrada();
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo borrar la lista");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleSacarCausa = async () => {
    if (!confirmRemoveCausa) return;
    try {
      await sacarCausa(confirmRemoveCausa.id);
      toast.success("Causa removida de la lista");
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo sacar la causa");
    } finally {
      setConfirmRemoveCausa(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={abrirConfig}>
          <Settings2 className="w-4 h-4 mr-1" /> Configurar lista
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Agregar causa
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-alert-urgent hover:text-alert-urgent">
          <Trash2 className="w-4 h-4 mr-1" /> Borrar lista
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar la lista</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-xs">{error}</span>
            <Button size="sm" variant="outline" onClick={refetch}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : causas.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Esta lista está vacía"
          subtitle="Agregá causas desde cualquier pestaña. Las causas mantienen su estado original."
          actionLabel="+ Agregar causa"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <CausasTable
          causas={causas}
          title={lista.nombre}
          listKey={`lista-${lista.id}`}
          allCausas={causas}
          onMutated={refetch}
          onNavigateToConexa={onNavigateToConexa}
          extraRowAction={{
            label: "Sacar de esta lista",
            onClick: (c) => setConfirmRemoveCausa(c),
            destructive: true,
          }}
        />
      )}

      <AgregarCausaListaDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        vocaliaId={vocaliaId}
        causasYaEnListaIds={idsEnLista}
        onAgregar={agregarCausa}
      />

      <Dialog open={showConfig} onOpenChange={(v) => !savingConfig && setShowConfig(v)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar "{lista.nombre}"</DialogTitle>
            <DialogDescription>
              Opciones de esta lista dentro del espacio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>¿De qué otra(s) lista(s) desaparece la causa?</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Al agregar una causa a esta lista, deja de verse en las listas que marques. Dentro de esta lista se sigue viendo.
              </p>
              <OcultaDeSelector value={ocultaDe} onChange={setOcultaDe} disabled={savingConfig} otrasListas={otrasListas} />
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-3">
              <div>
                <Label htmlFor="cfg-click-derecho">Seleccionable con click derecho</Label>
                <p className="text-xs text-muted-foreground mt-1">Si está apagado, esta lista no aparece en el menú de click derecho de las causas.</p>
              </div>
              <Switch id="cfg-click-derecho" checked={optClickDerecho} onCheckedChange={setOptClickDerecho} disabled={savingConfig} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="cfg-calendario">Mostrar sus eventos en el calendario</Label>
                <p className="text-xs text-muted-foreground mt-1">Si está apagado, los eventos con fecha de estas causas no aparecen en el calendario ni en Google Calendar.</p>
              </div>
              <Switch id="cfg-calendario" checked={optCalendario} onCheckedChange={setOptCalendario} disabled={savingConfig} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="cfg-solo-admin">Visible solo para administradores</Label>
                <p className="text-xs text-muted-foreground mt-1">Si está prendido, el resto de los roles no ve esta lista ni su contenido.</p>
              </div>
              <Switch id="cfg-solo-admin" checked={optSoloAdmin} onCheckedChange={setOptSoloAdmin} disabled={savingConfig} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)} disabled={savingConfig}>Cancelar</Button>
            <Button onClick={guardarConfig} disabled={savingConfig}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={(v) => !deleting && setConfirmDelete(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lista "{lista.nombre}"</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la lista <strong>{lista.nombre}</strong>. Las causas que contiene <strong>NO</strong> se borrarán, solo dejarán de aparecer acá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBorrarLista} disabled={deleting} className="bg-alert-urgent hover:bg-alert-urgent/90">
              Eliminar lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRemoveCausa} onOpenChange={(v) => !v && setConfirmRemoveCausa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sacar causa de esta lista</AlertDialogTitle>
            <AlertDialogDescription>
              La causa <strong>{confirmRemoveCausa?.caratulaOverride ?? confirmRemoveCausa?.numero ?? ""}</strong> dejará de aparecer en esta lista personalizada. No se borra ni cambia su estado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSacarCausa}>Sacar de la lista</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
