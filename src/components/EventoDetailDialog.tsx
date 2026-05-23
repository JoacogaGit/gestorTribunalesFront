import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ExternalLink, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { CalendarEvento, CALENDAR_TIPO_LABEL, getSemaforoText } from "@/lib/eventoMapper";
import EventoFormInline from "@/components/forms/EventoFormInline";
import { useEventoMutations, EventoInput } from "@/hooks/useEventoMutations";
import { toast } from "sonner";

interface Props {
  evento: CalendarEvento | null;
  onClose: () => void;
  onOpenCausa: (causaId: string) => void;
  onMutated?: () => void;
}

function fmtFecha(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function EventoDetailDialog({ evento, onClose, onOpenCausa, onMutated }: Props) {
  const { saving, actualizarEvento, borrarEvento } = useEventoMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!evento) return null;

  const esEventoReal = evento.tipo === "evento";
  const eventoId = esEventoReal ? evento.id.replace(/^evento-/, "") : null;
  const esPasado = new Date(evento.fecha).getTime() < Date.now();

  const handleUpdate = async (v: EventoInput) => {
    if (!eventoId) return;
    const r = await actualizarEvento(eventoId, v);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Evento actualizado");
    setEditing(false);
    onMutated?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!eventoId) return;
    const r = await borrarEvento(eventoId);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Evento eliminado");
    setConfirmDelete(false);
    onMutated?.();
    onClose();
  };

  return (
    <>
      <Dialog open={!!evento} onOpenChange={(o) => { if (!o) { setEditing(false); onClose(); } }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              {esPasado && <Clock className="w-4 h-4 text-muted-foreground" />}
              {evento.titulo}
              {esPasado && <Badge variant="outline" className="text-[10px]">PASADO</Badge>}
            </DialogTitle>
          </DialogHeader>

          {editing && eventoId ? (
            <EventoFormInline
              mode="editar"
              saving={saving}
              initialValue={{
                titulo: evento.titulo,
                descripcion: evento.descripcion ?? null,
                tipo_evento: evento.tipoEventoRaw ?? null,
                fecha: evento.fecha,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span className={getSemaforoText(evento.fecha)}>{fmtFecha(evento.fecha)}</span>
                {evento.hora && <span>· {evento.hora} hs</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {CALENDAR_TIPO_LABEL[evento.tipo]}
                </Badge>
                {evento.tipoEventoRaw && (
                  <Badge variant="outline" className="text-[10px]">{evento.tipoEventoRaw}</Badge>
                )}
              </div>

              {evento.descripcion && (
                <div className="rounded-md bg-muted/40 border border-border/60 p-3 text-sm text-foreground whitespace-pre-wrap break-words">
                  {evento.descripcion}
                </div>
              )}

              <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Causa asociada</p>
                <button
                  type="button"
                  onClick={() => { onOpenCausa(evento.causaId); onClose(); }}
                  className="text-left w-full group"
                >
                  <p className="font-mono text-sm font-semibold text-primary group-hover:underline inline-flex items-center gap-1">
                    {evento.causaNumero} <ExternalLink className="w-3 h-3" />
                  </p>
                  <p className="text-xs text-foreground/80">{evento.causaCaratula}</p>
                </button>
              </div>

              {!esEventoReal && (
                <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 bg-muted/30 rounded p-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    Este es un vencimiento calculado a partir de los datos del imputado. Se edita
                    desde el panel de la causa.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div className="flex gap-1.5">
                  {esEventoReal && (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Borrar
                      </Button>
                    </>
                  )}
                </div>
                <Button type="button" size="sm" onClick={() => { onOpenCausa(evento.causaId); onClose(); }}>
                  Ir a la causa <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto va a borrar "{evento.titulo}". La causa no se ve afectada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
