import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useEventosCausa, EventoCausa } from "@/hooks/useEventosCausa";
import { useEventoMutations, EventoInput } from "@/hooks/useEventoMutations";
import { useCategoriasVocalia } from "@/hooks/useCategoriasVocalia";
import { useVocaliaActual } from "@/context/VocaliaContext";
import { getSemaforoBg, getSemaforoText } from "@/lib/eventoMapper";
import { formatLocalDate } from "@/lib/parseDate";
import { cn } from "@/lib/utils";
import EventoFormInline from "./EventoFormInline";

/** Anotación cargada antes de crear la causa; se guarda al crearla. */
export interface AnotacionBorrador extends EventoInput { _id: string; _creado: string }

interface Props {
  /** Sin causaId la sección trabaja en modo borrador (causa nueva). */
  causaId?: string | null;
  borradores?: AnotacionBorrador[];
  onBorradoresChange?: (b: AnotacionBorrador[]) => void;
  onMutated?: () => void;
  /** "panel" = columna lateral junto a la ficha: una sola columna y texto más grande. */
  variante?: "form" | "panel";
}

function fmt(d: string) {
  return formatLocalDate(d);
}

function fmtCreado(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export default function AnotacionesSection({ causaId, borradores = [], onBorradoresChange, variante = "form" }: Props) {
  const enPanel = variante === "panel";
  const local = !causaId;
  const remoto = useEventosCausa(causaId);
  const borradoresComoEventos: EventoCausa[] = borradores.map((b) => ({
    id: b._id, causa_id: "", titulo: b.titulo, descripcion: b.descripcion, fecha_hora: b.fecha,
    tipo_evento: b.tipo_evento, completado: false, created_at: b._creado,
    categoria_personalizada_id: b.categoria_personalizada_id ?? null,
  }));
  const conFecha = local
    ? borradoresComoEventos.filter((e) => !!e.fecha_hora).sort((a, b) => (a.fecha_hora! < b.fecha_hora! ? -1 : 1))
    : remoto.conFecha;
  const sinFecha = local ? borradoresComoEventos.filter((e) => !e.fecha_hora) : remoto.sinFecha;
  const loading = local ? false : remoto.loading;
  const refetch = remoto.refetch;
  const { vocalia } = useVocaliaActual();
  const { categorias } = useCategoriasVocalia(vocalia?.id ?? null);
  const muts = useEventoMutations();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EventoCausa | null>(null);

  const catNameById = new Map(categorias.map((c) => [c.id, c.nombre_categoria]));

  const afterMutation = async () => { await refetch(); };

  const handleCreate = async (v: EventoInput) => {
    if (local) {
      onBorradoresChange?.([...borradores, { ...v, _id: `borrador-${Date.now()}`, _creado: new Date().toISOString() }]);
      setAdding(false);
      return;
    }
    const r = await muts.crearEvento(causaId!, v);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Anotación agregada");
    setAdding(false);
    await afterMutation();
  };

  const handleUpdate = async (id: string, v: EventoInput) => {
    if (local) {
      onBorradoresChange?.(borradores.map((b) => (b._id === id ? { ...b, ...v } : b)));
      setEditingId(null);
      return;
    }
    const r = await muts.actualizarEvento(id, v);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Anotación actualizada");
    setEditingId(null);
    await afterMutation();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (local) {
      onBorradoresChange?.(borradores.filter((b) => b._id !== confirmDelete.id));
      setConfirmDelete(null);
      return;
    }
    const r = await muts.borrarEvento(confirmDelete.id);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Anotación borrada");
    setConfirmDelete(null);
    await afterMutation();
  };

  const agregarOtraDeCategoria = async (categoriaId: string, titulo: string) => {
    if (local) {
      await handleCreate({ titulo, descripcion: null, tipo_evento: null, fecha: null, categoria_personalizada_id: categoriaId });
      return;
    }
    const r = await muts.crearEvento(causaId!, {
      titulo,
      descripcion: null,
      tipo_evento: null,
      fecha: null,
      categoria_personalizada_id: categoriaId,
    });
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success(`Otra "${titulo}" agregada`);
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
    const catName = e.categoria_personalizada_id ? catNameById.get(e.categoria_personalizada_id) : null;
    return (
      <div
        key={e.id}
        className={cn(
          "rounded-md border-l-4 flex items-start gap-3",
          enPanel ? "p-4" : "p-3",
          withDate && e.fecha_hora ? getSemaforoBg(e.fecha_hora) : "bg-muted/40 border-l-border",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-semibold text-foreground", enPanel ? "text-sm" : "text-xs")}>
              {e.titulo}
            </span>
            {catName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                <Tag className="w-2.5 h-2.5" /> {catName}
              </Badge>
            )}
            {e.tipo_evento && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{e.tipo_evento}</Badge>
            )}
            {withDate && e.fecha_hora && (
              <span className={cn("font-mono", enPanel ? "text-xs" : "text-[11px]", getSemaforoText(e.fecha_hora))}>
                {fmt(e.fecha_hora)}
              </span>
            )}
            {!withDate && e.created_at && (
              <span className={cn("text-muted-foreground", enPanel ? "text-[11px]" : "text-[10px]")}>
                creado {fmtCreado(e.created_at)}
              </span>
            )}
          </div>
          {e.descripcion && (
            <p className={cn(
              "mt-1.5 whitespace-pre-wrap break-words",
              enPanel ? "text-sm leading-relaxed text-muted-foreground" : "text-xs text-muted-foreground mt-1",
            )}>
              {e.descripcion}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setEditingId(e.id); setAdding(false); }}
            className="p-1 text-muted-foreground hover:text-primary"
            title="Editar"
          >
            <Pencil className={cn(enPanel ? "h-4 w-4" : "h-3.5 w-3.5")} />
          </button>
          <button
            onClick={() => setConfirmDelete(e)}
            className="p-1 text-muted-foreground hover:text-destructive"
            title="Borrar"
          >
            <Trash2 className={cn(enPanel ? "h-4 w-4" : "h-3.5 w-3.5")} />
          </button>
        </div>
      </div>
    );
  };

  // Categorías ya presentes en esta causa (para mostrar botón "agregar otra")
  const categoriasUsadas = new Map<string, string>();
  [...conFecha, ...sinFecha].forEach((e) => {
    if (e.categoria_personalizada_id) {
      const n = catNameById.get(e.categoria_personalizada_id);
      if (n) categoriasUsadas.set(e.categoria_personalizada_id, n);
    }
  });

  const subtitulo = enPanel ? "text-xs" : "text-[11px]";

  return (
    <section className={cn(enPanel ? "relative z-10 pointer-events-auto space-y-4" : "space-y-3")}>
      <div className={cn("flex items-center", enPanel ? "justify-end" : "justify-between")}>
        {!enPanel && (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anotaciones y eventos
          </h3>
        )}
        {!adding && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(enPanel && "h-9 px-3 text-sm")}
            onClick={() => { setAdding(true); setEditingId(null); }}
          >
            <Plus className={cn("mr-1", enPanel ? "h-4 w-4" : "h-3.5 w-3.5")} /> Agregar anotación
          </Button>
        )}
      </div>

      {local && (
        <p className={cn("rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-muted-foreground", enPanel ? "text-xs" : "text-[11px]")}>
          Se guardan junto con la causa cuando tocás “Crear causa”.
        </p>
      )}

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
        <div className={cn("grid gap-5", enPanel ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 gap-4")}>
          <div className="space-y-2" data-tour="anotaciones-con-fecha">
            <h4 className={cn(subtitulo, "font-semibold uppercase tracking-wider text-muted-foreground/80")}>
              Eventos con fecha
            </h4>
            {conFecha.length === 0 ? (
              <p data-tour-empty="anotaciones-con-fecha" className="text-xs text-muted-foreground/60 italic">Sin eventos con fecha</p>
            ) : (
              <div className="space-y-2">{conFecha.map((e) => renderItem(e, true))}</div>
            )}
          </div>
          <div className="space-y-2" data-tour="anotaciones-sin-fecha">
            <h4 className={cn(subtitulo, "font-semibold uppercase tracking-wider text-muted-foreground/80")}>
              Anotaciones sin fecha
            </h4>
            {sinFecha.length === 0 ? (
              <p data-tour-empty="anotaciones-sin-fecha" className="text-xs text-muted-foreground/60 italic">Sin anotaciones sueltas</p>
            ) : (
              <div className="space-y-2">{sinFecha.map((e) => renderItem(e, false))}</div>
            )}
          </div>
        </div>
      )}

      {categoriasUsadas.size > 0 && (
        <div className={cn("border-t border-border/60", enPanel ? "pt-3" : "pt-2")}>
          <p className={cn("text-muted-foreground mb-1.5", enPanel ? "text-xs" : "text-[11px]")}>
            Agregar otra entrada de categoría:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(categoriasUsadas.entries()).map(([id, nombre]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => agregarOtraDeCategoria(id, nombre)}
                disabled={muts.saving}
              >
                <Plus className="w-3 h-3 mr-1" /> Otra {nombre}
              </Button>
            ))}
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
