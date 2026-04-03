import { mockCausas } from "@/data/mockCausas";
import { AlertTriangle, Clock, Scale, FileCheck } from "lucide-react";

interface Evento {
  fecha: string;
  tipo: "Juicio" | "Prescripción" | "Vto. PP" | "Vto. Probation";
  causa: string;
  numero: string;
  icon: typeof Clock;
  color: string;
}

function buildEventos(): Evento[] {
  const eventos: Evento[] = [];
  for (const c of mockCausas) {
    if (c.juicioFijado) {
      eventos.push({ fecha: c.juicioFijado.fecha, tipo: "Juicio", causa: c.caratula, numero: c.numero, icon: Scale, color: "text-alert-info bg-alert-info/10" });
    }
    eventos.push({ fecha: c.fechaPrescripcion, tipo: "Prescripción", causa: c.caratula, numero: c.numero, icon: AlertTriangle, color: "text-alert-warning bg-alert-warning/10" });
    if (c.fechaVencimientoPP) {
      eventos.push({ fecha: c.fechaVencimientoPP, tipo: "Vto. PP", causa: c.caratula, numero: c.numero, icon: Clock, color: "text-alert-urgent bg-alert-urgent/10" });
    }
    if (c.probation) {
      eventos.push({ fecha: c.probation.vencimiento, tipo: "Vto. Probation", causa: c.caratula, numero: c.numero, icon: FileCheck, color: "text-accent bg-accent/10" });
    }
  }
  return eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

const allEventos = buildEventos();

// Show only upcoming or recently past (within last 30 days)
const now = Date.now();
const relevantEventos = allEventos.filter((e) => {
  const d = new Date(e.fecha).getTime();
  return d > now - 30 * 24 * 60 * 60 * 1000;
}).slice(0, 12);

function alertStyle(fecha: string) {
  const diff = (new Date(fecha).getTime() - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "border-l-alert-urgent";
  if (diff < 30) return "border-l-alert-warning";
  if (diff < 90) return "border-l-alert-info";
  return "border-l-border";
}

export default function CalendarioVencimientos() {
  return (
    <div className="space-y-2">
      {relevantEventos.map((e, i) => {
        const isPast = new Date(e.fecha).getTime() < now;
        return (
          <div
            key={i}
            className={`glass-card rounded-md p-3 border-l-4 ${alertStyle(e.fecha)} flex items-center gap-3 ${isPast ? "opacity-70" : ""}`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${e.color}`}>
              <e.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{e.tipo}</span>
                {isPast && <span className="text-[10px] font-bold text-alert-urgent">VENCIDO</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{e.numero} — {e.causa}</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              {new Date(e.fecha).toLocaleDateString("es-AR")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
