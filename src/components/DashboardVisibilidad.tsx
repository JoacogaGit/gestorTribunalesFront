import { Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CARACTERISTICAS, GRUPOS_ESTADO } from "@/lib/visibilidadDashboard";

interface Props {
  ocultos: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

/** Botón central del dashboard para elegir qué causas se muestran y cuáles no. */
export default function DashboardVisibilidad({ ocultos, onChange }: Props) {
  const toggle = (id: string) => {
    const next = new Set(ocultos);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const fila = (item: { id: string; label: string }) => {
    const visible = !ocultos.has(item.id);
    return (
      <label key={item.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
        <Checkbox checked={visible} onCheckedChange={() => toggle(item.id)} aria-label={`Mostrar ${item.label}`} />
        <span className={`flex-1 ${visible ? "text-foreground" : "text-muted-foreground line-through"}`}>{item.label}</span>
        {visible ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
      </label>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button data-tour="dashboard-visibilidad" className="h-10 gap-2 rounded-full px-5 text-sm font-semibold shadow-elevated">
          <SlidersHorizontal className="h-4 w-4" />
          Elegir qué causas ver
          {ocultos.size > 0 && (
            <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px]">
              {ocultos.size} oculto{ocultos.size === 1 ? "" : "s"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" collisionPadding={12} className="w-[min(92vw,560px)] max-h-[70vh] overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Qué causas se muestran en el dashboard</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(new Set())} disabled={ocultos.size === 0}>
            Mostrar todo
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Por estado</p>
            {GRUPOS_ESTADO.map(fila)}
          </div>
          <div>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Por característica</p>
            {CARACTERISTICAS.map(fila)}
          </div>
        </div>
        <p className="mt-3 px-2 text-xs text-muted-foreground">
          Si destildás una característica, se ocultan todas las causas que la tengan. Tu elección queda guardada para la próxima vez.
        </p>
      </PopoverContent>
    </Popover>
  );
}
