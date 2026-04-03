import { Users, Gavel, AlertTriangle, Scale, ShieldAlert, Clock } from "lucide-react";
import { mockCausas } from "@/data/mockCausas";

const now = new Date();
const thisMonth = now.getMonth();
const thisYear = now.getFullYear();

const detenidos = mockCausas.filter((c) => c.estadoLibertad === "Detenido").length;
const juiciosEsteMes = mockCausas.filter(
  (c) => c.juicioFijado && new Date(c.juicioFijado.fecha).getMonth() === thisMonth && new Date(c.juicioFijado.fecha).getFullYear() === thisYear
).length;
const prescripcionesEsteAnio = mockCausas.filter(
  (c) => new Date(c.fechaPrescripcion).getFullYear() === thisYear
).length;
const rebeldes = mockCausas.filter((c) => c.estadoLibertad === "Rebelde").length;
const ppProximasVencer = mockCausas.filter((c) => {
  if (!c.fechaVencimientoPP) return false;
  const diff = new Date(c.fechaVencimientoPP).getTime() - now.getTime();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
}).length;
const enRecurso = mockCausas.filter((c) => ["Queja en Corte", "Casación", "REX"].includes(c.estadoCausa)).length;

const kpis = [
  { label: "Detenidos", value: detenidos, icon: ShieldAlert, color: "bg-alert-urgent/10 text-alert-urgent" },
  { label: "Juicios este mes", value: juiciosEsteMes, icon: Gavel, color: "bg-alert-info/10 text-alert-info" },
  { label: "PP próximas a vencer", value: ppProximasVencer, icon: Clock, color: "bg-alert-warning/10 text-alert-warning" },
  { label: "Rebeldes", value: rebeldes, icon: AlertTriangle, color: "bg-alert-warning/10 text-alert-warning" },
  { label: "En recurso", value: enRecurso, icon: Scale, color: "bg-accent/10 text-accent" },
  { label: "Prescripciones este año", value: prescripcionesEsteAnio, icon: Users, color: "bg-alert-ok/10 text-alert-ok" },
];

export default function KpiCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="glass-card rounded-lg p-4 flex flex-col gap-2">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${kpi.color}`}>
            <kpi.icon className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
          <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
        </div>
      ))}
    </div>
  );
}
