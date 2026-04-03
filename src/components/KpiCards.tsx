import { useState } from "react";
import { Users, Gavel, AlertTriangle, ShieldAlert, Clock, Scale } from "lucide-react";
import { Causa, getCaratula, getAllEventos } from "@/data/mockCausas";

const now = new Date();
const thisMonth = now.getMonth();
const thisYear = now.getFullYear();

interface KpiDef {
  label: string;
  value: number;
  icon: typeof ShieldAlert;
  color: string;
  items: { label: string; sub: string }[];
}

function buildKpis(causas: Causa[]): KpiDef[] {
  // Detenidos (per imputado)
  const detenidos: { label: string; sub: string }[] = [];
  for (const c of causas) {
    for (const imp of c.imputados) {
      if (imp.estadoLibertad === "Detenido") {
        detenidos.push({ label: imp.nombre, sub: `${c.numero} — ${imp.lugarDetencion || ""}` });
      }
    }
  }

  const juiciosEsteMes = causas.filter(
    (c) => c.juicioFijado && new Date(c.juicioFijado.fecha).getMonth() === thisMonth && new Date(c.juicioFijado.fecha).getFullYear() === thisYear
  );

  const ppProximas = causas.filter((c) => {
    if (!c.fechaVencimientoPP) return false;
    const diff = new Date(c.fechaVencimientoPP).getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  });

  const rebeldes: { label: string; sub: string }[] = [];
  for (const c of causas) {
    for (const imp of c.imputados) {
      if (imp.estadoLibertad === "Rebelde") {
        rebeldes.push({ label: imp.nombre, sub: c.numero });
      }
    }
  }

  const eventos = getAllEventos(causas);
  const proxEventos = eventos.filter((e) => {
    const d = new Date(e.fecha).getTime();
    return d > now.getTime() && d < now.getTime() + 30 * 24 * 60 * 60 * 1000;
  });

  return [
    { label: "Detenidos", value: detenidos.length, icon: ShieldAlert, color: "bg-alert-urgent/10 text-alert-urgent", items: detenidos },
    { label: "Juicios este mes", value: juiciosEsteMes.length, icon: Gavel, color: "bg-alert-info/10 text-alert-info", items: juiciosEsteMes.map((c) => ({ label: getCaratula(c), sub: c.numero })) },
    { label: "PP próximas", value: ppProximas.length, icon: Clock, color: "bg-alert-warning/10 text-alert-warning", items: ppProximas.map((c) => ({ label: getCaratula(c), sub: `Vence: ${new Date(c.fechaVencimientoPP!).toLocaleDateString("es-AR")}` })) },
    { label: "Rebeldes", value: rebeldes.length, icon: AlertTriangle, color: "bg-alert-warning/10 text-alert-warning", items: rebeldes },
    { label: "Eventos 30 días", value: proxEventos.length, icon: Scale, color: "bg-accent/10 text-accent", items: proxEventos.map((e) => ({ label: `${e.tipo}: ${getCaratula(e.causa)}`, sub: new Date(e.fecha).toLocaleDateString("es-AR") })) },
    { label: "Total causas", value: causas.length, icon: Users, color: "bg-alert-ok/10 text-alert-ok", items: causas.map((c) => ({ label: getCaratula(c), sub: c.numero })) },
  ];
}

export default function KpiCards({ causas }: { causas: Causa[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const kpis = buildKpis(causas);

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

      {expanded !== null && kpis[expanded].items.length > 0 && (
        <div className="glass-card rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold text-foreground mb-3">{kpis[expanded].label} — {kpis[expanded].items.length}</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {kpis[expanded].items.map((item, j) => (
              <div key={j} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors text-sm">
                <span className="text-foreground truncate flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">{item.sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
