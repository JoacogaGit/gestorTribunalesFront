import { mockCausas, getCausaAlerts, CausaAlert } from "@/data/mockCausas";
import { AlertTriangle, Clock, Gavel, Calendar, Shield } from "lucide-react";

const severityStyles: Record<string, string> = {
  critical: "bg-alert-urgent/15 text-alert-urgent border-l-4 border-alert-urgent",
  urgent: "bg-alert-urgent/10 text-alert-urgent border-l-4 border-alert-urgent/60",
  warning: "bg-alert-warning/10 text-alert-warning border-l-4 border-alert-warning",
};

const tipoIcons: Record<string, typeof AlertTriangle> = {
  prescripcion: Clock,
  pp: Shield,
  juicio: Gavel,
  audiencia: Calendar,
  probation: AlertTriangle,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}

export default function AlertasPanel() {
  const allAlerts: CausaAlert[] = mockCausas
    .flatMap(getCausaAlerts)
    .filter(a => a.severity !== "ok")
    .sort((a, b) => {
      const order = { critical: 0, urgent: 1, warning: 2, ok: 3 };
      return order[a.severity] - order[b.severity] || new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });

  if (allAlerts.length === 0) {
    return (
      <div className="glass-card rounded-lg p-6 text-center text-muted-foreground">
        Sin alertas activas
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allAlerts.map((alert, i) => {
        const Icon = tipoIcons[alert.tipo] || AlertTriangle;
        return (
          <div
            key={`${alert.causa.id}-${alert.tipo}-${i}`}
            className={`rounded-lg px-4 py-3 flex items-center gap-3 ${severityStyles[alert.severity] || ""}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold">{alert.descripcion}</span>
              <span className="text-xs opacity-70 ml-2">— {alert.causa.numero} {alert.causa.caratula}</span>
            </div>
            <span className="text-xs font-mono shrink-0">{fmtDate(alert.fecha)}</span>
          </div>
        );
      })}
    </div>
  );
}
