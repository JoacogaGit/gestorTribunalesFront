import { useState } from "react";
import { Causa, getProximityColor, Imputado } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import CausaFormDialog from "./forms/CausaFormDialog";
import { Search, Copy, Plus, ChevronDown, Trash2, Pencil, Loader2 } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuLabel, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCausaMutations } from "@/hooks/useCausaMutations";

interface DetenidoRow {
  imputado: Imputado;
  causa: Causa;
}

interface ColDef {
  key: string;
  label: string;
  render: (r: DetenidoRow) => React.ReactNode;
  cellClass?: string;
  headClass?: string;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

interface Props {
  causas: Causa[];
  vocalia?: number;
  onUpdateCausa?: (causa: Causa) => void;
  onDeleteCausa?: (id: string) => void;
  onCreateCausa?: (causa: Causa) => void;
  onMutated?: () => void;
}

export default function DetenidosList({ causas, vocalia = 1, onUpdateCausa, onDeleteCausa, onCreateCausa, onMutated }: Props) {
  const [selected, setSelected] = useState<Causa | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const allColumns: ColDef[] = [
    { key: "imputado", label: "Imputado", cellClass: "text-sm font-medium text-foreground", render: (r) => r.imputado.nombre },
    { key: "lugar", label: "Lugar de Detención", cellClass: "text-xs text-alert-urgent", render: (r) => r.imputado.lugarDetencion || "—" },
    {
      key: "numero", label: "N° Causa", cellClass: "font-mono text-xs font-semibold",
      render: (r) => r.causa.link
        ? <a href={r.causa.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">{r.causa.numero}</a>
        : <span className="text-primary">{r.causa.numero}</span>,
    },
    { key: "delito", label: "Delito", cellClass: "text-xs text-muted-foreground max-w-[200px] truncate", render: (r) => r.causa.delito },
    { key: "estadoCausa", label: "Estado causa", cellClass: "text-xs text-foreground whitespace-nowrap", render: (r) => r.causa.estadoCausa },
    { key: "defensor", label: "Defensor", cellClass: "text-xs text-muted-foreground", render: (r) => r.imputado.defensor.nombre },
    {
      key: "pp", label: "Vto. PP", headClass: "whitespace-nowrap",
      render: (r) => <span className={`text-xs whitespace-nowrap ${r.causa.fechaVencimientoPP ? getProximityColor(r.causa.fechaVencimientoPP) : "text-muted-foreground"}`}>{fmtDate(r.causa.fechaVencimientoPP)}</span>,
    },
    {
      key: "vtoPena", label: "Vto. Pena", headClass: "whitespace-nowrap",
      render: (r) => <span className={`text-xs whitespace-nowrap ${r.imputado.fechaVencimientoPena ? getProximityColor(r.imputado.fechaVencimientoPena) : "text-muted-foreground"}`}>{fmtDate(r.imputado.fechaVencimientoPena)}</span>,
    },
  ];

  const storageKey = "cols-hidden-detenidos";
  const initialHidden = (() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { return new Set<string>(); }
  })();
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(initialHidden);

  const toggleCol = (key: string) => {
    const next = new Set(hiddenCols);
    next.has(key) ? next.delete(key) : next.add(key);
    setHiddenCols(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  };

  const visibleColumns = allColumns.filter((c) => !hiddenCols.has(c.key));

  const rows: DetenidoRow[] = [];
  for (const c of causas) {
    for (const imp of c.imputados) {
      if (imp.estadoLibertad === "Detenido") rows.push({ imputado: imp, causa: c });
    }
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.imputado.nombre.toLowerCase().includes(q) ||
      r.causa.numero.toLowerCase().includes(q) ||
      r.causa.delito.toLowerCase().includes(q) ||
      (r.imputado.lugarDetencion || "").toLowerCase().includes(q)
    );
  });

  const copyToClipboard = () => {
    const header = visibleColumns.map((c) => c.label).join("\t");
    const lines = filtered.map((r) => visibleColumns.map((col) => {
      switch (col.key) {
        case "imputado": return r.imputado.nombre;
        case "lugar": return r.imputado.lugarDetencion || "";
        case "numero": return r.causa.numero;
        case "delito": return r.causa.delito;
        case "estadoCausa": return r.causa.estadoCausa;
        case "defensor": return r.imputado.defensor.nombre;
        case "pp": return fmtDate(r.causa.fechaVencimientoPP);
        case "vtoPena": return fmtDate(r.imputado.fechaVencimientoPena);
        default: return "";
      }
    }).join("\t"));
    navigator.clipboard.writeText([header, ...lines].join("\n"));
    toast.success("Lista copiada al portapapeles");
  };

  const handleCreate = () => {
    setShowCreate(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Detenidos <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-2">
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
              {filtered.map((r, i) => (
                <TableRow key={`${r.causa.id}-${i}`} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => setSelected(r.causa)}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} className={col.cellClass}>{col.render(r)}</TableCell>
                  ))}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground py-8">Sin detenidos</TableCell>
                </TableRow>
              )}
              {onCreateCausa && !search && (
                <TableRow className="bg-muted/10">
                  <TableCell colSpan={visibleColumns.length} className="py-2 text-center">
                    <button onClick={handleCreate} className="inline-flex items-center gap-1.5 text-xs text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md border border-dashed border-primary/40">
                      <Plus className="w-3.5 h-3.5" /> Nueva causa con detenido
                    </button>
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
          onMutated={onMutated}
        />
      )}
      <CausaFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        mode="crear"
        initialSujetoSituacion="detenido"
        onMutated={onMutated}
      />
    </>
  );
}
