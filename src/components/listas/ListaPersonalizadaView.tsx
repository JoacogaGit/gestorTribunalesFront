import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, RefreshCw, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import CausasTable from "@/components/CausasTable";
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
}

export default function ListaPersonalizadaView({ lista, vocaliaId, onListaBorrada, onNavigateToConexa }: Props) {
  const { causas, loading, error, refetch, agregarCausa, sacarCausa } = useCausasDeLista(lista.id);
  const { borrarLista, refetch: refetchListas } = useListasPersonalizadas(vocaliaId);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveCausa, setConfirmRemoveCausa] = useState<Causa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const idsEnLista = useMemo(() => new Set(causas.map((c) => c.id)), [causas]);

  const handleBorrarLista = async () => {
    setDeleting(true);
    try {
      await borrarLista(lista.id);
      await refetchListas();
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
              La causa <strong>{confirmRemoveCausa?.caratula}</strong> dejará de aparecer en esta lista personalizada. No se borra ni cambia su estado.
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
