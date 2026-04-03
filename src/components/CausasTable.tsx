import { useState } from "react";
import { Causa, getAlertSeverity, getCausaAlerts } from "@/data/mockCausas";
import CausaDetail from "./CausaDetail";
import { Pencil, Check } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const severityClass: Record<string, string> = {
  critical: "text-alert-urgent font-semibold animate-pulse-alert",
  urgent: "text-alert-urgent font-semibold",
  warning: "text-alert-warning font-semibold",
  ok: "text-muted-foreground",
};

function alertClass(fecha: string): string {
  return severityClass[getAlertSeverity(fecha)] || "text-muted-foreground";
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(title || "");

  const displayTitle = customTitle || title;

  return (
    <>
      {displayTitle && (
        <div className="flex items-center gap-2 mb-4 group">
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
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="whitespace-nowrap">N° Causa</TableHead>
                <TableHead>Carátula</TableHead>
                <TableHead>Delito</TableHead>
                <TableHead>Imputado/s</TableHead>
                <TableHead>Libertad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Defensor</TableHead>
                <TableHead className="whitespace-nowrap">Vocalía</TableHead>
                <TableHead className="whitespace-nowrap">Secretaría</TableHead>
                <TableHead className="whitespace-nowrap">Prescripción</TableHead>
                <TableHead className="whitespace-nowrap">PP Vence</TableHead>
                <TableHead className="whitespace-nowrap">Juicio</TableHead>
                <TableHead className="whitespace-nowrap">Audiencias</TableHead>
                <TableHead>Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {causas.map((c) => {
                const alerts = getCausaAlerts(c);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
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
                      {c.defensor.nombre}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.vocalia}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.secretaria}</TableCell>
                    <TableCell className={`text-xs whitespace-nowrap ${alertClass(c.fechaPrescripcion)}`}>
                      {fmtDate(c.fechaPrescripcion)}
                    </TableCell>
                    <TableCell className={`text-xs whitespace-nowrap ${c.fechaVencimientoPP ? alertClass(c.fechaVencimientoPP) : "text-muted-foreground"}`}>
                      {fmtDate(c.fechaVencimientoPP)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {c.juicioFijado ? (
                        <span className={alertClass(c.juicioFijado.fecha)}>
                          {fmtDate(c.juicioFijado.fecha)} {c.juicioFijado.hora}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {c.audiencias && c.audiencias.length > 0 ? (
                        <div className="space-y-0.5">
                          {c.audiencias.map((a, i) => (
                            <div key={i} className={alertClass(a.fecha)}>
                              {a.tipo} — {fmtDate(a.fecha)}
                            </div>
                          ))}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {alerts.length > 0 ? (
                        <div className="flex gap-1">
                          {alerts.some(a => a.severity === "critical") && <span className="w-2.5 h-2.5 rounded-full bg-alert-urgent animate-pulse-alert" />}
                          {alerts.some(a => a.severity === "urgent") && <span className="w-2.5 h-2.5 rounded-full bg-alert-urgent" />}
                          {alerts.some(a => a.severity === "warning") && <span className="w-2.5 h-2.5 rounded-full bg-alert-warning" />}
                        </div>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-alert-ok inline-block" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {causas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                    Sin causas en esta categoría
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
