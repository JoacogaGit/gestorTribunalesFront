import { useState } from "react";
import { Causa } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function alertClass(fecha: string): string {
  const diff = new Date(fecha).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "text-alert-urgent font-semibold";
  if (days < 90) return "text-alert-warning font-semibold";
  return "text-muted-foreground";
}

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

export default function CausasTable({ causas, title }: { causas: Causa[]; title?: string }) {
  const [selected, setSelected] = useState<Causa | null>(null);

  return (
    <>
      {title && <h2 className="text-lg font-display font-semibold text-foreground mb-4">{title}</h2>}
      <div className="glass-card rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-sunken/50">
              <TableHead className="whitespace-nowrap">N° Causa</TableHead>
              <TableHead>Carátula</TableHead>
              <TableHead>Delito</TableHead>
              <TableHead>Imputado/s</TableHead>
              <TableHead>Libertad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Defensor</TableHead>
              <TableHead className="whitespace-nowrap">Vocalía</TableHead>
              <TableHead className="whitespace-nowrap">Secretaría</TableHead>
              <TableHead className="whitespace-nowrap">Inicio</TableHead>
              <TableHead className="whitespace-nowrap">Elevación</TableHead>
              <TableHead className="whitespace-nowrap">Prescripción</TableHead>
              <TableHead className="whitespace-nowrap">PP Vence</TableHead>
              <TableHead className="whitespace-nowrap">Juicio</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {causas.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => setSelected(c)}
              >
                <TableCell className="font-mono text-xs font-semibold text-accent whitespace-nowrap">
                  {c.numero}
                </TableCell>
                <TableCell className="text-sm font-medium text-foreground max-w-[220px] truncate">
                  {c.caratula}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                  {c.delito}
                </TableCell>
                <TableCell className="text-xs text-foreground whitespace-nowrap">
                  {c.imputados.join(", ")}
                </TableCell>
                <TableCell>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${libertadBadge[c.estadoLibertad]}`}>
                    {c.estadoLibertad}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-foreground whitespace-nowrap">{c.estadoCausa}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {c.defensor.nombre} <span className="opacity-60">({c.defensor.tipo})</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.vocalia}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.secretaria}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(c.fechaInicio)}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(c.fechaElevacion)}</TableCell>
                <TableCell className={`text-xs whitespace-nowrap ${alertClass(c.fechaPrescripcion)}`}>
                  {fmtDate(c.fechaPrescripcion)}
                </TableCell>
                <TableCell className={`text-xs whitespace-nowrap ${c.fechaVencimientoPP ? alertClass(c.fechaVencimientoPP) : "text-muted-foreground"}`}>
                  {fmtDate(c.fechaVencimientoPP)}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {c.juicioFijado ? (
                    <span className="text-alert-info font-medium">
                      {fmtDate(c.juicioFijado.fecha)} {c.juicioFijado.hora}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate italic">
                  {c.notas || "—"}
                </TableCell>
              </TableRow>
            ))}
            {causas.length === 0 && (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                  Sin causas en esta categoría
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {selected && <CausaDetail causa={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
