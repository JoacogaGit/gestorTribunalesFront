import { useState } from "react";
import { Causa, getCaratula, getProximityColor } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import { Pencil, Check, Search, Copy, Trash2 } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

const libertadBadge: Record<string, string> = {
  Detenido: "bg-alert-urgent/15 text-alert-urgent",
  Excarcelado: "bg-alert-ok/15 text-alert-ok",
  Rebelde: "bg-alert-warning/15 text-alert-warning",
  SJP: "bg-alert-info/15 text-alert-info",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

interface Props {
  causas: Causa[];
  title?: string;
  onUpdateCausa?: (causa: Causa) => void;
}

export default function CausasTable({ causas, title, onUpdateCausa }: Props) {
  const [selected, setSelected] = useState<Causa | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(title || "");
  const [search, setSearch] = useState("");

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
    const header = "N°\tCarátula\tDelito\tEstado\tPrescripción";
    const rows = filtered.map((c) =>
      `${c.numero}\t${getCaratula(c)}\t${c.delito}\t${c.estadoCausa}\t${fmtDate(c.fechaPrescripcion)}`
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    toast.success("Lista copiada al portapapeles");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
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
        <div className="flex items-center gap-2">
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
                <TableHead className="whitespace-nowrap">N° Causa</TableHead>
                <TableHead>Carátula</TableHead>
                <TableHead>Delito</TableHead>
                <TableHead>Libertad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Defensor</TableHead>
                <TableHead className="whitespace-nowrap">Prescripción</TableHead>
                <TableHead className="whitespace-nowrap">PP Vence</TableHead>
                <TableHead className="whitespace-nowrap">Juicio</TableHead>
                <TableHead className="whitespace-nowrap">Audiencias</TableHead>
                <TableHead>Anotaciones</TableHead>
                <TableHead>Agenda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => setSelected(c)}
                >
                  <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                    {c.numero}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground max-w-[220px] truncate">
                    {getCaratula(c)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                    {c.delito}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.imputados.map((imp, i) => (
                        <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${libertadBadge[imp.estadoLibertad]}`}>
                          {imp.estadoLibertad}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-foreground whitespace-nowrap">{c.estadoCausa}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {c.imputados[0].defensor.nombre}
                  </TableCell>
                  <TableCell className={`text-xs whitespace-nowrap ${getProximityColor(c.fechaPrescripcion)}`}>
                    {fmtDate(c.fechaPrescripcion)}
                  </TableCell>
                  <TableCell className={`text-xs whitespace-nowrap ${c.fechaVencimientoPP ? getProximityColor(c.fechaVencimientoPP) : "text-muted-foreground"}`}>
                    {fmtDate(c.fechaVencimientoPP)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {c.juicioFijado ? (
                      <span className={getProximityColor(c.juicioFijado.fecha)}>
                        {fmtDate(c.juicioFijado.fecha)} {c.juicioFijado.hora}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {c.audiencias && c.audiencias.length > 0 ? (
                      <div className="space-y-0.5">
                        {c.audiencias.map((a, i) => (
                          <div key={i} className={getProximityColor(a.fecha)}>
                            {a.tipo} — {fmtDate(a.fecha)}
                          </div>
                        ))}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {c.anotaciones || "—"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {c.agenda && c.agenda.length > 0 ? (
                      <div className="space-y-0.5">
                        {c.agenda.map((ag, i) => (
                          <div key={i} className={getProximityColor(ag.fecha)}>
                            {ag.texto.substring(0, 20)}… — {fmtDate(ag.fecha)}
                          </div>
                        ))}
                      </div>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    {search ? "Sin resultados" : "Sin causas en esta categoría"}
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
        />
      )}
    </>
  );
}
