import { motion } from "framer-motion";
import { BarChart3, Trash2 } from "lucide-react";
import { Causa } from "@/data/mockCausas";
import { EstadisticaCustom } from "@/hooks/useEstadisticasCustom";
import { buscarCriterio, cumpleEstadistica, etiquetaValor, EstadisticaCtx } from "@/lib/estadisticasCustom";
import { resolverColor } from "@/lib/tableroColores";

interface Props {
  estadisticas: EstadisticaCustom[];
  causas: Causa[];
  esEstudio: boolean;
  ctx?: EstadisticaCtx;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
  onEliminar?: (id: string) => void;
}

export default function KpiCardsCustom({ estadisticas, causas, esEstudio, ctx, activeFilter, onSelectFilter, onEliminar }: Props) {
  if (estadisticas.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {estadisticas.map((e, i) => {
        const criterio = buscarCriterio(esEstudio, e.campo);
        const value = causas.filter((c) => cumpleEstadistica(c, criterio, e.valor, ctx ?? {})).length;
        const filtro = `custom:${e.id}`;
        const active = activeFilter === filtro;
        const hex = resolverColor(e.color) ?? "#64748b";
        return (
          <motion.div
            key={e.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectFilter?.(active ? "all" : filtro)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
            className="elevated-card group relative rounded-xl p-4 flex flex-col gap-2 text-left cursor-pointer hover:shadow-elevated transition-shadow duration-300"
            style={active ? { boxShadow: `0 0 0 1px ${hex}66, 0 0 18px 2px ${hex}59` } : undefined}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                <BarChart3 className="w-5 h-5" />
              </div>
              {onEliminar && (
                <button
                  type="button"
                  aria-label={`Eliminar estadística ${e.nombre}`}
                  onClick={(ev) => { ev.stopPropagation(); onEliminar(e.id); }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {value > 0 ? (
              <span className="text-3xl font-display font-bold text-foreground leading-none">{value}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic leading-tight">Sin causas</span>
            )}
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {e.nombre}
              <span className="ml-1 normal-case text-muted-foreground/70">· {etiquetaValor(criterio, e.valor)}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
