import { motion } from "framer-motion";
import { Users, AlertTriangle, ShieldAlert, Clock, Scale, RefreshCw } from "lucide-react";
import { DashboardKpis } from "@/hooks/useDashboardKpis";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface KpiDef {
  key: keyof DashboardKpis;
  label: string;
  icon: typeof ShieldAlert;
  color: string;
  /** Resplandor sutil del mismo color que el ícono, al activarse la tarjeta. */
  glow: string;
  empty: string;
  filter?: string;
}

const KPI_DEFS: KpiDef[] = [
  { key: "detenidos", label: "Detenidos", icon: ShieldAlert, color: "bg-alert-urgent/10 text-alert-urgent", glow: "shadow-[0_0_0_1px_hsl(var(--alert-urgent)/0.45),0_0_14px_hsl(var(--alert-urgent)/0.35)]", empty: "No hay detenidos", filter: "detenidos" },
  { key: "ppProximas", label: "PP próximas", icon: Clock, color: "bg-alert-warning/10 text-alert-warning", glow: "shadow-[0_0_0_1px_hsl(var(--alert-warning)/0.45),0_0_14px_hsl(var(--alert-warning)/0.35)]", empty: "Sin PP próximas" },
  { key: "rebeldes", label: "Rebeldes", icon: AlertTriangle, color: "bg-alert-warning/10 text-alert-warning", glow: "shadow-[0_0_0_1px_hsl(var(--alert-warning)/0.45),0_0_14px_hsl(var(--alert-warning)/0.35)]", empty: "No hay rebeldes", filter: "rebeldes" },
  { key: "eventos30d", label: "Eventos 30 días", icon: Scale, color: "bg-accent/10 text-accent", glow: "shadow-[0_0_0_1px_hsl(var(--accent)/0.5),0_0_14px_hsl(var(--accent)/0.4)]", empty: "Sin eventos próximos", filter: "eventos30d" },
  { key: "totalCausas", label: "Total causas", icon: Users, color: "bg-alert-ok/10 text-alert-ok", glow: "shadow-[0_0_0_1px_hsl(var(--alert-ok)/0.45),0_0_14px_hsl(var(--alert-ok)/0.35)]", empty: "No hay causas activas", filter: "all" },
];


interface Props {
  kpis: DashboardKpis;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export default function KpiCards({ kpis, loading, error, onRetry, activeFilter, onSelectFilter }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudieron cargar los indicadores</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-xs">{error}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div data-tour="kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {KPI_DEFS.map((kpi, i) => {
        const value = kpis[kpi.key];
        const clickable = !!kpi.filter && !!onSelectFilter;
        const active = clickable && activeFilter === kpi.filter;
        return (
          <motion.div
            key={kpi.label}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onSelectFilter!(active ? "all" : kpi.filter!) : undefined}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
            className={`elevated-card rounded-xl p-4 flex flex-col gap-2 text-left ${clickable ? "cursor-pointer hover:shadow-elevated transition-shadow" : ""} ${active ? "ring-2 ring-primary" : ""}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            {value > 0 ? (
              <span className="text-3xl font-display font-bold text-foreground leading-none">{value}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic leading-tight">{kpi.empty}</span>
            )}
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
