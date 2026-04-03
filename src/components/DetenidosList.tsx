import { useState } from "react";
import { Causa, getCaratula, getProximityColor, Imputado } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import { Search } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";

interface DetenidoRow {
  imputado: Imputado;
  causa: Causa;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

export default function DetenidosList({ causas }: { causas: Causa[] }) {
  const [selected, setSelected] = useState<Causa | null>(null);
  const [search, setSearch] = useState("");

  const rows: DetenidoRow[] = [];
  for (const c of causas) {
    for (const imp of c.imputados) {
      if (imp.estadoLibertad === "Detenido") {
        rows.push({ imputado: imp, causa: c });
      }
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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Detenidos <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
        </h2>
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
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Imputado</TableHead>
                <TableHead>Lugar de Detención</TableHead>
                <TableHead>N° Causa</TableHead>
                <TableHead>Delito</TableHead>
                <TableHead>Defensor</TableHead>
                <TableHead className="whitespace-nowrap">Vto. PP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow
                  key={`${r.causa.id}-${i}`}
                  className="cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => setSelected(r.causa)}
                >
                  <TableCell className="text-sm font-medium text-foreground">{r.imputado.nombre}</TableCell>
                  <TableCell className="text-xs text-alert-urgent">{r.imputado.lugarDetencion || "—"}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-primary">{r.causa.numero}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.causa.delito}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.imputado.defensor.nombre}</TableCell>
                  <TableCell className={`text-xs whitespace-nowrap ${r.causa.fechaVencimientoPP ? getProximityColor(r.causa.fechaVencimientoPP) : "text-muted-foreground"}`}>
                    {fmtDate(r.causa.fechaVencimientoPP)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Sin detenidos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {selected && <CausaDetail causa={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
