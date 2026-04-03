import { useState } from "react";
import { Users, Gavel, AlertTriangle, Scale, ShieldAlert, Clock } from "lucide-react";
import { mockCausas, Causa, getCausaAlerts } from "@/data/mockCausas";

const now = new Date();
const thisMonth = now.getMonth();
const thisYear = now.getFullYear();

interface KpiDef {
  label: string;
  value: number;
  icon: typeof ShieldAlert;
  color: string;
  causas: Causa[];
}

function buildKpis(): KpiDef[] {
  const detenidos = mockCausas.filter((c) => c.estadoLibertad === "Detenido");
  const juiciosEsteMes = mockCausas.filter(
    (c) => c.juicioFijado && new Date(c.juicioFijado.fecha).getMonth() === thisMonth && new Date(c.juicioFijado.fecha).getFullYear() === thisYear
  );
  const prescripcionesEsteAnio = mockCausas.filter(
    (c) => new Date(c.fechaPrescripcion).getFullYear() === thisYear
  );
  const rebeldes = mockCausas.filter((c) => c.estadoLibertad === "Rebelde");
  const ppProximasVencer = mockCausas.filter((c) => {
    if (!c.fechaVencimientoPP) return false;
    const diff = new Date(c.fechaVencimientoPP).getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  });
  const enRecurso = mockCausas.filter((c) => ["Queja en Corte", "Casación", "REX"].includes(c.estadoCausa));

  // Alertas activas
  const allAlerts = mockCausas.flatMap(getCausaAlerts);
  const causasConAlerta = [...new Set(allAlerts.map(a => a.causa.id))];
  const causasAlertadas = mockCausas.filter(c => causasConAlerta.includes(c.id));

  return [
    { label: "Detenidos", value: detenidos.length, icon: ShieldAlert, color: "bg-alert-urgent/10 text-alert-urgent", causas: detenidos },
    { label: "Juicios este mes", value: juiciosEsteMes.length, icon: Gavel, color: "bg-alert-info/10 text-alert-info", causas: juiciosEsteMes },
    { label: "PP próximas a vencer", value: ppProximasVencer.length, icon: Clock, color: "bg-alert-warning/10 text-alert-warning", causas: ppProximasVencer },
    { label: "Rebeldes", value: rebeldes.length, icon: AlertTriangle, color: "bg-alert-warning/10 text-alert-warning", causas: rebeldes },
    { label: "Con alertas", value: causasAlertadas.length, icon: Scale, color: "bg-accent/10 text-accent", causas: causasAlertadas },
    { label: "Prescripciones este año", value: prescripcionesEsteAnio.length, icon: Users, color: "bg-alert-ok/10 text-alert-ok", causas: prescripcionesEsteAnio },
  ];
}

const kpis = buildKpis();

export default function KpiCards() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <button
            key={kpi.label}
            onClick={() => setExpanded(expanded === i ? null : i)}
            className={`glass-card rounded-lg p-4 flex flex-col gap-2 text-left transition-all hover:border-primary/40 ${expanded === i ? "ring-1 ring-primary" : ""}`}
          >
            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
            <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
          </button>
        ))}
      </div>

      {expanded !== null && kpis[expanded].causas.length > 0 && (
        <div className="glass-card rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold text-foreground mb-3">{kpis[expanded].label} — {kpis[expanded].causas.length} causa(s)</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {kpis[expanded].causas.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors text-sm">
                <span className="font-mono text-xs text-primary font-semibold w-28 shrink-0">{c.numero}</span>
                <span className="text-foreground truncate flex-1">{c.caratula}</span>
                <span className="text-xs text-muted-foreground shrink-0">{c.estadoLibertad}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
