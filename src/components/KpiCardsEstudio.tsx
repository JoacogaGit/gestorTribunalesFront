import { useMemo } from "react";
import { motion } from "framer-motion";
import { Briefcase, Landmark, Search, Scale, Gavel, ShieldAlert } from "lucide-react";
import { Causa } from "@/data/mockCausas";
import { Skeleton } from "@/components/ui/skeleton";
import { EP_INSTRUCCION, EP_ELEVADAS, EP_RECURRIDAS } from "@/lib/estadosProcesales";

interface Props {
  causas: Causa[];
  loading: boolean;
}

/** KPIs adaptados al modo estudio: se calculan sobre las causas del estudio. */
export default function KpiCardsEstudio({ causas, loading }: Props) {
  const cards = useMemo(() => {
    const ep = (c: Causa) => (c.estadoProcesal || "").trim();
    const cuenta = (estados: string[]) => causas.filter((c) => estados.includes(ep(c))).length;
    const fueros = new Set(causas.map((c) => (c.fuero || "").trim()).filter(Boolean));
    const detenidos = causas.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Detenido")).length;
    const delitos = new Set(causas.flatMap((c) => c.delitos ?? []).filter(Boolean));

    return [
      { key: "total", label: "Causas del estudio", value: causas.length, icon: Briefcase, color: "bg-alert-ok/10 text-alert-ok", empty: "Sin causas cargadas" },
      { key: "instruccion", label: "En instrucción", value: cuenta(EP_INSTRUCCION), icon: Search, color: "bg-alert-info/10 text-alert-info", empty: "Sin causas en instrucción" },
      { key: "elevadas", label: "Elevadas a juicio", value: cuenta(EP_ELEVADAS), icon: Scale, color: "bg-accent/10 text-accent", empty: "Sin causas elevadas" },
      { key: "recurridas", label: "Recurridas", value: cuenta(EP_RECURRIDAS), icon: Gavel, color: "bg-alert-warning/10 text-alert-warning", empty: "Sin recursos" },
      { key: "detenidos", label: "Con detenidos", value: detenidos, icon: ShieldAlert, color: "bg-alert-urgent/10 text-alert-urgent", empty: "No hay detenidos" },
      { key: "fueros", label: "Fueros / delitos", value: fueros.size, icon: Landmark, color: "bg-primary/10 text-primary", empty: "Sin fueros cargados", sub: `${delitos.size} delitos` },
    ];
  }, [causas]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div data-tour="kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((kpi, i) => (
        <motion.div
          key={kpi.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
          className="elevated-card rounded-xl p-4 flex flex-col gap-2 text-left"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
            <kpi.icon className="w-5 h-5" />
          </div>
          {kpi.value > 0 ? (
            <span className="text-3xl font-display font-bold text-foreground leading-none">{kpi.value}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic leading-tight">{kpi.empty}</span>
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {kpi.label}
            {kpi.sub && kpi.value > 0 && <span className="ml-1 normal-case text-muted-foreground/70">· {kpi.sub}</span>}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
