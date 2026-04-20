import { useState } from "react";
import { Causa, getCaratula, getProximityColor, createEmptyCausa } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import { Pencil, Check, Search, Copy, Plus, X, ExternalLink, ChevronDown, MoveRight, Trash2 } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const libertadBadge: Record<string, string> = {
  Detenido: "bg-alert-urgent/15 text-alert-urgent",
  Excarcelado: "bg-alert-ok/15 text-alert-ok",
  Rebelde: "bg-alert-warning/15 text-alert-warning",
  SJP: "bg-alert-info/15 text-alert-info",
};

interface ColDef {
  key: string;
  label: string;
  render: (c: Causa) => React.ReactNode;
  cellClass?: string;
  headClass?: string;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

interface Props {
  causas: Causa[];
  /** All cases in the workspace, used for the "import from another list" feature. */
  allCausas?: Causa[];
  title?: string;
  /** Identifier of the list (used to persist hidden columns per list). */
  listKey?: string;
  vocalia?: number;
  onUpdateCausa?: (causa: Causa) => void;
  onDeleteCausa?: (id: string) => void;
  onCreateCausa?: (causa: Causa) => void;
  /** Called when user picks an existing case from another list to import here. */
  onImportCausa?: (causa: Causa) => void;
}

export default function CausasTable({
  causas, allCausas, title, listKey, vocalia = 1,
  onUpdateCausa, onDeleteCausa, onCreateCausa, onImportCausa,
}: Props) {
  const [selected, setSelected] = useState<Causa | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(title || "");
  const [search, setSearch] = useState("");

  const allColumns: ColDef[] = [
    {
      key: "numero",
      label: "N° Causa",
      headClass: "whitespace-nowrap",
      cellClass: "font-mono text-xs font-semibold whitespace-nowrap",
      render: (c) => c.link
        ? <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline inline-flex items-center gap-1">{c.numero}<ExternalLink className="w-3 h-3" /></a>
        : <span className="text-primary">{c.numero}</span>,
    },
    {
      key: "caratula", label: "Carátula",
      cellClass: "text-sm font-medium text-foreground max-w-[220px] truncate",
      render: (c) => c.link
        ? <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">{getCaratula(c)}</a>
        : getCaratula(c),
    },
    { key: "delito", label: "Delito", cellClass: "text-xs text-muted-foreground max-w-[180px] truncate", render: (c) => c.delito },
    {
      key: "libertad", label: "Libertad",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.imputados.map((imp, i) => (
            <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${libertadBadge[imp.estadoLibertad]}`}>{imp.estadoLibertad}</span>
          ))}
        </div>
      ),
    },
    { key: "estado", label: "Estado", cellClass: "text-xs text-foreground whitespace-nowrap", render: (c) => c.estadoCausa },
    { key: "defensor", label: "Defensor", cellClass: "text-xs text-muted-foreground whitespace-nowrap", render: (c) => c.imputados[0]?.defensor.nombre || "—" },
    {
      key: "prescripcion", label: "Prescripción", headClass: "whitespace-nowrap",
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
      render: (c) => <span className={`text-xs whitespace-nowrap ${c.fechaVencimientoPP ? getProximityColor(c.fechaVencimientoPP) : "text-muted-foreground"}`}>{fmtDate(c.fechaVencimientoPP)}</span>,
    },
    {
      key: "juicios", label: "Juicios y Audiencias", headClass: "whitespace-nowrap",
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
    { key: "anotaciones", label: "Anotaciones", cellClass: "text-xs text-muted-foreground max-w-[150px] truncate", render: (c) => c.anotaciones || "—" },
    {
      key: "agenda", label: "Agenda", headClass: "whitespace-nowrap",
      render: (c) => c.agenda && c.agenda.length > 0
        ? <div className="space-y-0.5 text-xs">{c.agenda.map((ag, i) => <div key={i} className={getProximityColor(ag.fecha)}>{ag.texto.substring(0, 20)}… — {fmtDate(ag.fecha)}</div>)}</div>
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

  const removeCustomCol = (key: string) => {
    persistCustomCols(customCols.filter((c) => c.key !== key));
  };

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
    render: (c) => {
      const val = (c as any).extra?.[cc.key] || "";
      return (
        <input
          defaultValue={val}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const v = e.target.value;
            if (v === val) return;
            const extra = { ...((c as any).extra || {}), [cc.key]: v };
            onUpdateCausa?.({ ...c, extra } as any);
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

  const copyToClipboard = () => {
    const header = visibleColumns.map((c) => c.label).join("\t");
    const rows = filtered.map((c) =>
      visibleColumns.map((col) => {
        const node = col.render(c);
        return typeof node === "string" ? node : (col.key === "numero" ? c.numero : col.key === "caratula" ? getCaratula(c) : "");
      }).join("\t")
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    toast.success("Lista copiada al portapapeles");
  };

  const handleCreate = () => {
    if (!onCreateCausa) return;
    const nueva = createEmptyCausa(vocalia);
    onCreateCausa(nueva);
    setSelected(nueva);
  };

  const importable = (allCausas || []).filter((c) => !causas.some((x) => x.id === c.id));

  return (
    <>
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
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/40 rounded-md">
              Categorías <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Mostrar / Ocultar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map((col) => (
                <DropdownMenuItem key={col.key} onSelect={(e) => { e.preventDefault(); toggleCol(col.key); }} className="text-xs flex items-center gap-2">
                  <input type="checkbox" readOnly checked={!hiddenCols.has(col.key)} className="accent-primary" />
                  {col.label}
                </DropdownMenuItem>
              ))}
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

      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {visibleColumns.map((col) => (
                  <TableHead key={col.key} className={col.headClass}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => setSelected(c)}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} className={col.cellClass}>{col.render(c)}</TableCell>
                  ))}
                </TableRow>
              ))}
              {filtered.length === 0 && (
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
          </Table>
        </div>
      </div>
      {selected && (
        <CausaDetail
          causa={selected}
          onClose={() => setSelected(null)}
          onUpdate={onUpdateCausa}
          onDelete={onDeleteCausa}
        />
      )}
    </>
  );
}
