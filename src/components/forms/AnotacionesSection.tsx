import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEventosCausa, EventoCausa } from "@/hooks/useEventosCausa";
import { useEventoMutations, EventoInput } from "@/hooks/useEventoMutations";
import { getSemaforoBg, getSemaforoText } from "@/lib/eventoMapper";
import EventoFormInline from "./EventoFormInline";

interface Props {
  causaId: string;
  onMutated?: () => void;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}

function fmtCreado(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-AR");
}

export default function AnotacionesSection({ causaId, onMutated }: Props) {
  const { conFecha, sinFecha, loading, refetch } = useEventosCausa(causaId);
  const muts = useEventoMutations();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EventoCausa | null>(null);

  const afterMutation = async () => {
    await refetch();
    onMutated?.();
  };

  const handleCreate = async (v: EventoInput) => {
    const r = await muts.crearEvento(causaId, v);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Anotación agregada");
    setAdding(false);
    await afterMutation();
  };

  const handleUpdate = async (id: string, v: EventoInput) => {
    const r = await muts.actualizarEvento(id, v);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Anotación actualizada");
    setEditingId(null);
    await afterMutation();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const r = await muts.borrarEvento(confirmDelete.id);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Anotación borrada");
    setConfirmDelete(null);
    await afterMutation();
  };

  const renderItem = (e: EventoCausa, withDate: boolean) => {
    if (editingId === e.id) {
      return (
        <EventoFormInline
          key={e.id}
          mode="editar"
          saving={muts.saving}
          initialValue={{
            titulo: e.titulo,
            tipo_evento: e.tipo_evento,
            descripcion: e.descripcion,
            fecha: e.fecha_hora,
          }}
          onCancel={() => setEditingId(null)}
          onSubmit={(v) => handleUpdate(e.id, v)}
        />
      );
    }
    return (
      <div
        key={e.id}
        className={`rounded-md p-3 border-l-4 flex items-start gap-3 ${
          withDate && e.fecha_hora ? getSemaforoBg(e.fecha_hora) : "bg-muted/40 border-l-border"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground truncate">{e.titulo}</span>
            {e.tipo_evento && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{e.tipo_evento}</Badge>
            )}
            {withDate && e.fecha_hora && (
              <span className={`text-[11px] font-mono ${getSemaforoText(e.fecha_hora)}`}>
                {fmt(e.fecha_hora)}
              </span>
            )}
            {!withDate && e.created_at && (
              <span className="text-[10px] text-muted-foreground">creado {fmtCreado(e.created_at)}</span>
            )}
          </div>
          {e.descripcion && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.descripcion}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setEditingId(e.id); setAdding(false); }}
            className="p-1 text-muted-foreground hover:text-primary"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(e)}
            className="p-1 text-muted-foreground hover:text-destructive"
            title="Borrar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Anotaciones y eventos
        </h3>
        {!adding && (
          <Button type="button" size="sm" variant="outline" onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Agregar anotación
          </Button>
        )}
      </div>

      {adding && (
        <EventoFormInline
          mode="crear"
          saving={muts.saving}
          onCancel={() => setAdding(false)}
          onSubmit={handleCreate}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Eventos con fecha
            </h4>
            {conFecha.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">Sin eventos con fecha</p>
            ) : (
              <div className="space-y-2">{conFecha.map((e) => renderItem(e, true))}</div>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Anotaciones sin fecha
            </h4>
            {sinFecha.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">Sin anotaciones sueltas</p>
            ) : (
              <div className="space-y-2">{sinFecha.map((e) => renderItem(e, false))}</div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta anotación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={muts.saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={muts.saving}
            >
              {muts.saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
