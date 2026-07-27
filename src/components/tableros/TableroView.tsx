import { useMemo, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor,
  closestCorners, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Plus, MoreHorizontal, GripVertical, CalendarClock, Scale, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTablero, TableroTarjeta, TarjetaInput } from "@/hooks/useTablero";
import type { Tablero } from "@/hooks/useTableros";
import TarjetaFormDialog from "./TarjetaFormDialog";
import { formatLocalDate, toARTimeString } from "@/lib/parseDate";
import { isAllDayISO } from "@/lib/eventoMapper";

interface Props {
  tablero: Tablero;
  vocaliaId: string | null;
}

function TarjetaCard({ tarjeta, onEdit }: { tarjeta: TableroTarjeta; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarjeta.id,
    data: { type: "tarjeta", columnaId: tarjeta.columna_id },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const hora = tarjeta.fecha_hora && !isAllDayISO(tarjeta.fecha_hora) ? toARTimeString(tarjeta.fecha_hora) : null;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onEdit}
      className="rounded-lg border border-border/70 bg-card p-3 shadow-soft cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
    >
      <p className="text-sm font-medium text-foreground break-words">{tarjeta.titulo}</p>
      {tarjeta.descripcion && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-3 break-words">{tarjeta.descripcion}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {tarjeta.fecha_hora && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            <CalendarClock className="h-3 w-3" />
            {formatLocalDate(tarjeta.fecha_hora)}{hora ? ` · ${hora}` : ""}
          </span>
        )}
        {tarjeta.causa_id && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            <Scale className="h-3 w-3" /> Causa vinculada
          </span>
        )}
      </div>
    </div>
  );
}

function Columna({
  id, nombre, tarjetas, isMobile, onRename, onDelete, onAddCard, onEditCard,
}: {
  id: string;
  nombre: string;
  tarjetas: TableroTarjeta[];
  isMobile: boolean;
  onRename: (nombre: string) => void;
  onDelete: () => void;
  onAddCard: () => void;
  onEditCard: (t: TableroTarjeta) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id, data: { type: "columna" },
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: `col-drop-${id}`, data: { type: "columna-drop", columnaId: id } });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nombre);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col rounded-xl bg-muted/40 border border-border/60 ${
        isMobile ? "w-[85vw] shrink-0 snap-center" : "w-72 shrink-0"
      } max-h-full`}
    >
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/60">
        <button {...attributes} {...listeners} className="p-1 text-muted-foreground/60 hover:text-foreground cursor-grab" aria-label="Mover columna">
          <GripVertical className="h-4 w-4" />
        </button>
        {editing ? (
          <Input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { setEditing(false); if (draft.trim()) onRename(draft.trim()); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setEditing(false); if (draft.trim()) onRename(draft.trim()); }
              if (e.key === "Escape") { setEditing(false); setDraft(nombre); }
            }}
            className="h-8 text-sm"
          />
        ) : (
          <button
            onClick={() => { setDraft(nombre); setEditing(true); }}
            className="flex-1 text-left text-sm font-semibold text-foreground truncate"
            title="Click para renombrar"
          >
            {nombre}
          </button>
        )}
        <span className="text-[10px] tabular-nums text-muted-foreground">{tarjetas.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 text-muted-foreground hover:text-foreground" aria-label="Opciones de columna">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => { setDraft(nombre); setEditing(true); }} className="text-xs gap-2">
              <Pencil className="h-3.5 w-3.5" /> Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-xs gap-2 text-alert-urgent focus:text-alert-urgent">
              <Trash2 className="h-3.5 w-3.5" /> Borrar columna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={setDropRef} className="flex-1 min-h-[80px] overflow-y-auto p-2 space-y-2">
        <SortableContext items={tarjetas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tarjetas.map((t) => (
            <TarjetaCard key={t.id} tarjeta={t} onEdit={() => onEditCard(t)} />
          ))}
        </SortableContext>
        {tarjetas.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground py-4">Sin tarjetas</p>
        )}
      </div>

      <button
        onClick={onAddCard}
        className="m-2 flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar tarjeta
      </button>
    </div>
  );
}

export default function TableroView({ tablero, vocaliaId }: Props) {
  const isMobile = useIsMobile();
  const {
    columnas, tarjetas, loading,
    crearColumna, renombrarColumna, borrarColumna, reordenarColumnas,
    crearTarjeta, actualizarTarjeta, borrarTarjeta, aplicarMovimiento,
  } = useTablero(tablero.id, tablero.ambito);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [nuevaColumna, setNuevaColumna] = useState(false);
  const [nombreColumna, setNombreColumna] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<TableroTarjeta | null>(null);
  const [columnaDestino, setColumnaDestino] = useState<string | null>(null);
  const [visibleCol, setVisibleCol] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const porColumna = useMemo(() => {
    const map: Record<string, TableroTarjeta[]> = {};
    for (const c of columnas) map[c.id] = [];
    for (const t of tarjetas) (map[t.columna_id] ??= []).push(t);
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.orden - b.orden);
    return map;
  }, [columnas, tarjetas]);

  const activeTarjeta = tarjetas.find((t) => t.id === activeId) ?? null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeType = active.data.current?.type;

    if (activeType === "columna") {
      const from = columnas.findIndex((c) => c.id === active.id);
      const to = columnas.findIndex((c) => c.id === over.id);
      if (from === -1 || to === -1 || from === to) return;
      reordenarColumnas(arrayMove(columnas, from, to));
      return;
    }

    if (activeType !== "tarjeta") return;
    const activeCard = tarjetas.find((t) => t.id === active.id);
    if (!activeCard) return;

    const overType = over.data.current?.type;
    let destinoCol: string | null = null;
    let destinoIndex = -1;

    if (overType === "tarjeta") {
      destinoCol = over.data.current?.columnaId as string;
      destinoIndex = (porColumna[destinoCol] ?? []).findIndex((t) => t.id === over.id);
    } else if (overType === "columna-drop") {
      destinoCol = over.data.current?.columnaId as string;
      destinoIndex = (porColumna[destinoCol] ?? []).length;
    }
    if (!destinoCol) return;

    const next: Record<string, TableroTarjeta[]> = {};
    for (const c of columnas) next[c.id] = (porColumna[c.id] ?? []).filter((t) => t.id !== activeCard.id);
    const target = next[destinoCol] ?? (next[destinoCol] = []);
    const idx = destinoIndex < 0 || destinoIndex > target.length ? target.length : destinoIndex;
    target.splice(idx, 0, { ...activeCard, columna_id: destinoCol });

    const flat: TableroTarjeta[] = [];
    for (const c of columnas) (next[c.id] ?? []).forEach((t, i) => flat.push({ ...t, columna_id: c.id, orden: i }));
    aplicarMovimiento(flat);
  };

  const abrirNueva = (columnaId: string) => {
    setEditando(null);
    setColumnaDestino(columnaId);
    setFormOpen(true);
  };

  const onScrollMobile = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth * 0.85 + 12;
    setVisibleCol(Math.round(el.scrollLeft / w));
  };

  if (loading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 w-72 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          ref={scrollerRef}
          onScroll={isMobile ? onScrollMobile : undefined}
          className={`flex flex-1 min-h-0 gap-3 overflow-x-auto pb-3 ${isMobile ? "snap-x snap-mandatory px-1" : ""}`}
        >
          <SortableContext items={columnas.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {columnas.map((c) => (
              <Columna
                key={c.id}
                id={c.id}
                nombre={c.nombre}
                tarjetas={porColumna[c.id] ?? []}
                isMobile={isMobile}
                onRename={(n) => renombrarColumna(c.id, n)}
                onDelete={() => borrarColumna(c.id)}
                onAddCard={() => abrirNueva(c.id)}
                onEditCard={(t) => { setEditando(t); setColumnaDestino(c.id); setFormOpen(true); }}
              />
            ))}
          </SortableContext>

          <div className={`${isMobile ? "w-[85vw] shrink-0 snap-center" : "w-64 shrink-0"}`}>
            {nuevaColumna ? (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-2">
                <Input
                  autoFocus
                  value={nombreColumna}
                  onChange={(e) => setNombreColumna(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nombreColumna.trim()) {
                      crearColumna(nombreColumna); setNombreColumna(""); setNuevaColumna(false);
                    }
                    if (e.key === "Escape") { setNuevaColumna(false); setNombreColumna(""); }
                  }}
                  placeholder="Nombre de la columna"
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => { if (nombreColumna.trim()) { crearColumna(nombreColumna); setNombreColumna(""); setNuevaColumna(false); } }}
                  >
                    Agregar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setNuevaColumna(false); setNombreColumna(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNuevaColumna(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/20 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Plus className="h-4 w-4" /> Nueva columna
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTarjeta ? (
            <div className="rounded-lg border border-primary/50 bg-card p-3 shadow-elevated">
              <p className="text-sm font-medium text-foreground">{activeTarjeta.titulo}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isMobile && columnas.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {columnas.map((c, i) => (
            <span
              key={c.id}
              className={`h-1.5 rounded-full transition-all ${i === visibleCol ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
            />
          ))}
        </div>
      )}

      <TarjetaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vocaliaId={vocaliaId}
        tarjeta={editando}
        onSave={async (input: TarjetaInput) => {
          if (editando) await actualizarTarjeta(editando.id, input);
          else if (columnaDestino) await crearTarjeta(columnaDestino, input);
        }}
        onDelete={editando ? async () => { await borrarTarjeta(editando.id); } : undefined}
      />
    </div>
  );
}
