import { Loader2, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { MigracionStatus } from "@/components/WizardMigracion";

interface Props {
  status: MigracionStatus;
  vocaliaNombre: string;
  onVerMigracion: () => void;
}

export default function MigracionFloatingBanner({ status, vocaliaNombre, onVerMigracion }: Props) {
  if (!status.activa) return null;
  const total = status.totalLotes;
  const procesados = status.lotesOk + status.lotesError;
  const pct = total > 0 ? Math.round((procesados / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-40 -mx-6 lg:-mx-8 mb-4 px-6 lg:px-8 py-3 bg-accent/10 border-y border-accent/30 backdrop-blur">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          {status.procesando ? (
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
          ) : status.hasExito ? (
            <CheckCircle2 className="w-4 h-4 text-alert-ok" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
          <span className="text-sm font-semibold">
            {status.procesando
              ? `Procesando lote ${status.loteActual || procesados + 1} de ${total}`
              : status.hasExito
                ? "Migración completada"
                : status.hasResultado
                  ? "Migración lista para revisar"
                  : "Migración en pausa"}
          </span>
        </div>
        {status.procesando && (
          <span className="text-xs font-semibold text-alert-urgent uppercase tracking-wider">
            ⚠ NO cierres esta pestaña
          </span>
        )}
        <div className="flex-1 min-w-[160px] flex items-center gap-3">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs font-mono text-muted-foreground shrink-0">{pct}%</span>
        </div>
        <Button size="sm" variant="outline" onClick={onVerMigracion} className="shrink-0">
          Ver migración <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
      {status.procesando && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Migrando en {vocaliaNombre}. Podés seguir navegando otras pestañas del navegador, pero esta tiene que quedar abierta.
        </p>
      )}
    </div>
  );
}
