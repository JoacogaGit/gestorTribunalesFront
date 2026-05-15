import { useEffect, useState } from "react";
import { Causa, getCaratula, getProximityColor, EstadoCausa } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import CausaFormDialog from "./forms/CausaFormDialog";
import { Pencil, Check, Search, Copy, Plus, X, ExternalLink, ChevronDown, MoveRight, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Paperclip, Loader2 } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
} from "@/components/ui/context-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCausaMutations } from "@/hooks/useCausaMutations";
import { useProximasAnotacionesPorCausa } from "@/hooks/useProximasAnotacionesPorCausa";
import { getSemaforoText } from "@/lib/eventoMapper";

const libertadBadge: Record<string, string> = {
  Detenido: "bg-alert-urgent/15 text-alert-urgent",
  Excarcelado: "bg-alert-ok/15 text-alert-ok",
  Rebelde: "bg-alert-warning/15 text-alert-warning",
  SJP: "bg-alert-info/15 text-alert-info",
};

const estadosCausa: EstadoCausa[] = ["En trámite", "En juicio", "Terminada", "Queja en Corte", "Casación", "REX"];

interface ColDef {
  key: string;
  label: string;
  render: (c: Causa) => React.ReactNode;
  cellClass?: string;
  headClass?: string;
  /** Function returning a value used for sorting. Numbers, strings or undefined. */
  sortValue?: (c: Causa) => string | number | undefined;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

interface Props {
  causas: Causa[];
  allCausas?: Causa[];
  title?: string;
  listKey?: string;
  vocalia?: number;
  onUpdateCausa?: (causa: Causa) => void;
  onDeleteCausa?: (id: string) => void;
  onCreateCausa?: (causa: Causa) => void;
  onImportCausa?: (causa: Causa) => void;
  /** Allow changing case status from context menu (used for "all" / dashboard view). */
  onChangeEstado?: (causa: Causa, nuevoEstado: EstadoCausa) => void;
  /** Refetch de la lista tras una mutación CRUD. */
  onMutated?: () => void;
  /** Click en el punto azul de "causa conexa" cuando hay match. */
  onNavigateToConexa?: (causaId: string) => void;
  /** Si está seteado y matchea una fila, abre su detalle automáticamente. */
  openCausaId?: string | null;
  /** Llamado cuando se consume el openCausaId. */
  onOpenedCausa?: () => void;
}

export default function CausasTable({
  causas, allCausas, title, listKey, vocalia = 1,
  onUpdateCausa, onDeleteCausa, onCreateCausa, onImportCausa, onChangeEstado, onMutated,
  onNavigateToConexa, openCausaId, onOpenedCausa,
}: Props) {
  const [selected, setSelected] = useState<Causa | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(title || "");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Causa | null>(null);
  const muts = useCausaMutations();

  // Auto-abrir detalle cuando navegan desde una causa conexa.
  useEffect(() => {
    if (!openCausaId) return;
    const found = causas.find((c) => c.id === openCausaId);
    if (found) {
      setSelected(found);
      onOpenedCausa?.();
    }
  }, [openCausaId, causas, onOpenedCausa]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const r = await muts.borrarCausa(confirmDelete.id);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Causa eliminada");
    setConfirmDelete(null);
    onMutated?.();
  };

  const allColumns: ColDef[] = [
    {
      key: "numero",
      label: "N° Causa",
      headClass: "whitespace-nowrap",
      cellClass: "font-mono text-xs font-semibold whitespace-nowrap",
      sortValue: (c) => c.numero,
      render: (c) => {
        const conexaId = c.causaConexaId ?? null;
        const conexaTexto = c.causaConexaTexto ?? null;
        const hasConexa = !!(conexaId || conexaTexto);
        const hasPdf = (c.adjuntos || []).length > 0;
        const numEl = c.link
          ? <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline inline-flex items-center gap-1">{c.numero}<ExternalLink className="w-3 h-3" /></a>
          : <span className="text-primary">{c.numero}</span>;
        return (
          <div className="flex items-center gap-1.5">
            {numEl}
            {hasConexa && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (conexaId && onNavigateToConexa) onNavigateToConexa(conexaId);
                      }}
                      disabled={!conexaId}
                      className={`w-2 h-2 rounded-full bg-sky-400 ring-1 ring-sky-400/40 ${conexaId ? "cursor-pointer hover:ring-2 hover:ring-sky-400/70" : "cursor-help"} disabled:cursor-help`}
                      aria-label="Causa conexa"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {conexaId
                      ? <span>Conexa con: <span className="font-mono">{conexaTexto || "(vinculada)"}</span> — clic para abrir</span>
                      : <span>Conexa: <span className="font-mono">{conexaTexto}</span></span>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {hasPdf && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Paperclip className="w-3 h-3 text-muted-foreground" onClick={(e) => e.stopPropagation()} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {(c.adjuntos || []).length} archivo(s) PDF
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      key: "caratula", label: "Carátula",
      cellClass: "text-sm font-medium text-foreground max-w-[220px] truncate",
      sortValue: (c) => getCaratula(c),
      render: (c) => c.link
        ? <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">{getCaratula(c)}</a>
        : getCaratula(c),
    },
    { key: "delito", label: "Delito", cellClass: "text-xs text-muted-foreground max-w-[180px] truncate", sortValue: (c) => c.delito, render: (c) => c.delito },
    {
      key: "libertad", label: "Libertad",
      sortValue: (c) => c.imputados[0]?.estadoLibertad,
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.imputados.map((imp, i) => (
            <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${libertadBadge[imp.estadoLibertad]}`}>{imp.estadoLibertad}</span>
          ))}
        </div>
      ),
    },
    { key: "estado", label: "Estado", cellClass: "text-xs text-foreground whitespace-nowrap", sortValue: (c) => c.estadoCausa, render: (c) => c.estadoCausa },
    { key: "defensor", label: "Defensor", cellClass: "text-xs text-muted-foreground whitespace-nowrap", sortValue: (c) => c.imputados[0]?.defensor.nombre || "", render: (c) => c.imputados[0]?.defensor.nombre || "—" },
    {
      key: "prescripcion", label: "Prescripción", headClass: "whitespace-nowrap",
      sortValue: (c) => {
        const all = [c.fechaPrescripcion, ...(c.fechasPrescripcionExtra || []).map((f) => f.fecha)].filter(Boolean);
        const future = all.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
        return future[0] ?? Number.MAX_SAFE_INTEGER;
      },
      render: (c) => {
        const all = [c.fechaPrescripcion, ...(c.fechasPrescripcionExtra || []).map((f) => f.fecha)].filter(Boolean);
        if (all.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="space-y-0.5 text-xs whitespace-nowrap">
            {all.map((f, i) => (
              <div key={i} className={getProximityColor(f)}>{fmtDate(f)}</div>
            ))}
          </div>
        );
      },
    },
    {
      key: "pp", label: "PP Vence", headClass: "whitespace-nowrap",
      sortValue: (c) => c.fechaVencimientoPP ? new Date(c.fechaVencimientoPP).getTime() : Number.MAX_SAFE_INTEGER,
      render: (c) => <span className={`text-xs whitespace-nowrap ${c.fechaVencimientoPP ? getProximityColor(c.fechaVencimientoPP) : "text-muted-foreground"}`}>{fmtDate(c.fechaVencimientoPP)}</span>,
    },
    ...(listKey === "recursos" ? [{
      key: "vtoPena",
      label: "Vto. Pena",
      headClass: "whitespace-nowrap",
      sortValue: (c: Causa) => {
        const fechas = c.imputados
          .map((i) => i.fechaVencimientoPena)
          .filter((f): f is string => !!f)
          .map((f) => new Date(f).getTime());
        return fechas.length ? Math.min(...fechas) : Number.MAX_SAFE_INTEGER;
      },
      render: (c: Causa) => {
        const items = c.imputados
          .map((i) => ({ nombre: i.nombre, fecha: i.fechaVencimientoPena }))
          .filter((x) => !!x.fecha) as { nombre: string; fecha: string }[];
        if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        items.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        return (
          <div className="space-y-0.5 text-xs whitespace-nowrap">
            {items.map((it, i) => (
              <div key={i} className={getProximityColor(it.fecha)}>{fmtDate(it.fecha)}</div>
            ))}
          </div>
        );
      },
    } satisfies ColDef] : []),
    {
      key: "juicios", label: "Juicios y Audiencias", headClass: "whitespace-nowrap",
      sortValue: (c) => {
        const fechas: number[] = [];
        if (c.juicioFijado) fechas.push(new Date(c.juicioFijado.fecha).getTime());
        (c.audiencias || []).forEach((a) => a.fecha && fechas.push(new Date(a.fecha).getTime()));
        fechas.sort((a, b) => a - b);
        return fechas[0] ?? Number.MAX_SAFE_INTEGER;
      },
      render: (c) => {
        const items: { label: string; fecha: string; hora?: string }[] = [];
        if (c.juicioFijado) items.push({ label: "Juicio", fecha: c.juicioFijado.fecha, hora: c.juicioFijado.hora });
        (c.audiencias || []).forEach((a) => items.push({ label: a.tipo || "Audiencia", fecha: a.fecha, hora: a.hora }));
        if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="space-y-0.5 text-xs">
            {items.map((it, i) => (
              <div key={i} className={getProximityColor(it.fecha)}>
                {it.label} — {fmtDate(it.fecha)}{it.hora ? ` ${it.hora}` : ""}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "otrosIntervinientes", label: "Otros intervinientes",
      cellClass: "text-xs text-muted-foreground max-w-[180px]",
      sortValue: (c) => (c.otrosIntervinientes || []).map((o) => o.nombre).join(", "),
      render: (c) => (c.otrosIntervinientes && c.otrosIntervinientes.length > 0)
        ? <div className="space-y-0.5">{c.otrosIntervinientes.map((o, i) => <div key={i}><span className="font-medium text-foreground/80">{o.rol}:</span> {o.nombre}</div>)}</div>
        : <span className="text-muted-foreground">—</span>,
    },
    { key: "anotaciones", label: "Anotaciones", cellClass: "text-xs text-muted-foreground max-w-[180px] truncate", sortValue: (c) => c.anotaciones || "", render: (c) => c.anotaciones || "—" },
    {
      key: "agenda", label: "Agenda", headClass: "whitespace-nowrap",
      sortValue: (c) => {
        const f = (c.agenda || []).map((a) => new Date(a.fecha).getTime()).filter(Boolean).sort((a, b) => a - b);
        return f[0] ?? Number.MAX_SAFE_INTEGER;
      },
      render: (c) => c.agenda && c.agenda.length > 0
        ? <div className="space-y-0.5 text-xs">{c.agenda.map((ag, i) => <div key={i} className={getProximityColor(ag.fecha)}>{ag.texto.substring(0, 20)}{ag.texto.length > 20 ? "…" : ""} — {fmtDate(ag.fecha)}</div>)}</div>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
  ];

  const storageKey = listKey ? `cols-hidden-${listKey}` : null;
  const customColsKey = listKey ? `cols-custom-${listKey}` : null;
  const initialHidden = (() => {
    if (!storageKey) return new Set<string>();
    try { return new Set<string>(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { return new Set<string>(); }
  })();
  const initialCustom = (() => {
    if (!customColsKey) return [] as { key: string; label: string }[];
    try { return JSON.parse(localStorage.getItem(customColsKey) || "[]"); } catch { return []; }
  })();
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(initialHidden);
  const [customCols, setCustomCols] = useState<{ key: string; label: string }[]>(initialCustom);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");

  const persistCustomCols = (next: { key: string; label: string }[]) => {
    setCustomCols(next);
    if (customColsKey) localStorage.setItem(customColsKey, JSON.stringify(next));
  };

  const addCustomCol = () => {
    const label = newColLabel.trim();
    if (!label) return;
    const key = `custom-${Date.now()}`;
    persistCustomCols([...customCols, { key, label }]);
    setNewColLabel("");
    setShowAddCol(false);
    toast.success(`Categoría "${label}" agregada`);
  };

  const removeCustomCol = (key: string) => persistCustomCols(customCols.filter((c) => c.key !== key));

  const toggleCol = (key: string) => {
    const next = new Set(hiddenCols);
    next.has(key) ? next.delete(key) : next.add(key);
    setHiddenCols(next);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...next]));
  };

  const customColDefs: ColDef[] = customCols.map((cc) => ({
    key: cc.key,
    label: cc.label,
    cellClass: "text-xs text-muted-foreground max-w-[160px]",
    sortValue: (c) => (c.extra?.[cc.key] || "").toString(),
    render: (c) => {
      const val = c.extra?.[cc.key] || "";
      return (
        <input
          defaultValue={val}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const v = e.target.value;
            if (v === val) return;
            const extra = { ...(c.extra || {}), [cc.key]: v };
            onUpdateCausa?.({ ...c, extra });
          }}
          placeholder="—"
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5"
        />
      );
    },
  }));

  const fullColumns = [...allColumns, ...customColDefs];
  const visibleColumns = fullColumns.filter((c) => !hiddenCols.has(c.key));
  const displayTitle = customTitle || title;

  const handleHeaderSort = (key: string) => {
    if (sortBy?.key === key) {
      if (sortBy.dir === "asc") setSortBy({ key, dir: "desc" });
      else setSortBy(null);
    } else {
      setSortBy({ key, dir: "asc" });
    }
  };

  const filtered = causas.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.numero.toLowerCase().includes(q) ||
      getCaratula(c).toLowerCase().includes(q) ||
      c.delito.toLowerCase().includes(q) ||
      c.imputados.some((i) => i.nombre.toLowerCase().includes(q))
    );
  });

  const sorted = (() => {
    if (!sortBy) return filtered;
    const col = fullColumns.find((c) => c.key === sortBy.key);
    if (!col?.sortValue) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb), "es", { numeric: true });
    });
    if (sortBy.dir === "desc") arr.reverse();
    return arr;
  })();

  const copyToClipboard = () => {
    const header = visibleColumns.map((c) => c.label).join("\t");
    const rows = sorted.map((c) =>
      visibleColumns.map((col) => {
        const node = col.render(c);
        if (typeof node === "string") return node;
        if (col.key === "numero") return c.numero;
        if (col.key === "caratula") return getCaratula(c);
        if (col.key === "estado") return c.estadoCausa;
        if (col.key === "delito") return c.delito;
        return "";
      }).join("\t")
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    toast.success("Lista copiada al portapapeles");
  };

  const handleCreate = () => {
    setShowCreate(true);
  };

  const importable = (allCausas || []).filter((c) => !causas.some((x) => x.id === c.id));

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {displayTitle && (
          <div className="flex items-center gap-2 group">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                  className="text-lg font-display font-semibold text-foreground bg-muted/50 px-3 py-1 rounded-md outline-none border border-border"
                  autoFocus
                />
                <button onClick={() => setEditingTitle(false)} className="p-1 text-alert-ok hover:text-alert-ok/80">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-display font-semibold text-foreground">{displayTitle}</h2>
                <button
                  onClick={() => { setCustomTitle(displayTitle || ""); setEditingTitle(true); }}
                  className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {sortBy && (
            <button
              onClick={() => setSortBy(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 px-2 py-1 rounded-md flex items-center gap-1"
              title="Quitar ordenamiento"
            >
              <X className="w-3 h-3" /> Orden: {fullColumns.find((c) => c.key === sortBy.key)?.label} ({sortBy.dir})
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/40 rounded-md">
              Categorías <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">Mostrar / Ocultar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map((col) => (
                <DropdownMenuItem key={col.key} onSelect={(e) => { e.preventDefault(); toggleCol(col.key); }} className="text-xs flex items-center gap-2">
                  <input type="checkbox" readOnly checked={!hiddenCols.has(col.key)} className="accent-primary" />
                  {col.label}
                </DropdownMenuItem>
              ))}
              {customCols.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">Personalizadas</DropdownMenuLabel>
                  {customCols.map((col) => (
                    <DropdownMenuItem key={col.key} onSelect={(e) => e.preventDefault()} className="text-xs flex items-center gap-2 group">
                      <input type="checkbox" readOnly checked={!hiddenCols.has(col.key)} onClick={() => toggleCol(col.key)} className="accent-primary" />
                      <span className="flex-1 truncate" onClick={() => toggleCol(col.key)}>{col.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCustomCol(col.key); }}
                        className="text-alert-urgent/60 hover:text-alert-urgent opacity-0 group-hover:opacity-100"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowAddCol(true); }} className="text-xs flex items-center gap-2 text-primary">
                <Plus className="w-3 h-3" /> Agregar categoría
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={copyToClipboard} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Copiar lista">
            <Copy className="w-4 h-4" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
        </div>
      </div>

      <div className="elevated-card rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-card/95 backdrop-blur-md [&_tr]:border-b border-border/70">
              <TableRow className="bg-transparent hover:bg-transparent">
                {visibleColumns.map((col) => {
                  const isSorted = sortBy?.key === col.key;
                  const SortIcon = !isSorted ? ArrowUpDown : sortBy.dir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <TableHead
                      key={col.key}
                      className={`text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/90 ${col.headClass || ""} ${col.sortValue ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                      onClick={() => col.sortValue && handleHeaderSort(col.key)}
                      title={col.sortValue ? "Clic para ordenar" : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortValue && (
                          <SortIcon className={`w-3 h-3 ${isSorted ? "text-primary" : "text-muted-foreground/40"}`} />
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => (
                <ContextMenu key={c.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => setSelected(c)}>
                      {visibleColumns.map((col) => (
                        <TableCell key={col.key} className={col.cellClass}>{col.render(c)}</TableCell>
                      ))}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuLabel className="text-xs font-mono">{c.numero}</ContextMenuLabel>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => setSelected(c)} className="text-xs">
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Abrir / Editar
                    </ContextMenuItem>
                    {(onChangeEstado || onUpdateCausa) && (
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="text-xs">
                          Cambiar estado
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {estadosCausa.map((e) => (
                            <ContextMenuItem
                              key={e}
                              onSelect={() => {
                                if (onChangeEstado) onChangeEstado(c, e);
                                else onUpdateCausa?.({ ...c, estadoCausa: e });
                                toast.success(`Estado: ${e}`);
                              }}
                              className={`text-xs ${c.estadoCausa === e ? "bg-primary/10 text-primary" : ""}`}
                            >
                              {e}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => setConfirmDelete(c)}
                      className="text-xs text-alert-urgent focus:text-alert-urgent"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Borrar causa
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground py-8">
                    {search ? "Sin resultados" : "Sin causas en esta categoría"}
                  </TableCell>
                </TableRow>
              )}
              {(onCreateCausa || onImportCausa) && !search && (
                <TableRow className="bg-muted/10">
                  <TableCell colSpan={visibleColumns.length} className="py-2">
                    <div className="flex items-center justify-center gap-2">
                      {onCreateCausa && (
                        <button onClick={handleCreate} className="flex items-center gap-1.5 text-xs text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md border border-dashed border-primary/40">
                          <Plus className="w-3.5 h-3.5" /> Nueva causa
                        </button>
                      )}
                      {onImportCausa && importable.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-md border border-dashed border-border">
                            <MoveRight className="w-3.5 h-3.5" /> Traer de otra lista
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="max-h-60 overflow-y-auto w-72">
                            <DropdownMenuLabel className="text-xs">Causas en otras listas</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {importable.map((c) => (
                              <DropdownMenuItem key={c.id} onSelect={() => onImportCausa(c)} className="text-xs flex flex-col items-start">
                                <span className="font-mono text-primary">{c.numero}</span>
                                <span className="text-muted-foreground truncate w-full">{getCaratula(c)}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
      </div>
      {selected && (
        <CausaDetail
          causa={selected}
          onClose={() => setSelected(null)}
          onMutated={onMutated}
        />
      )}
      <CausaFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        mode="crear"
        onMutated={onMutated}
      />

      <Dialog open={showAddCol} onOpenChange={setShowAddCol}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              autoFocus
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomCol()}
              placeholder="Ej. Fiscal, Querella, Observaciones…"
            />
            <p className="text-[11px] text-muted-foreground">
              Aparecerá como una columna editable en cada fila de esta lista.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddCol(false); setNewColLabel(""); }}>Cancelar</Button>
              <Button className="flex-1" onClick={addCustomCol} disabled={!newColLabel.trim()}>Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta causa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto borrará la causa <span className="font-mono">{confirmDelete?.numero}</span>, todos sus imputados y todos sus eventos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={muts.saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={muts.saving}
            >
              {muts.saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
