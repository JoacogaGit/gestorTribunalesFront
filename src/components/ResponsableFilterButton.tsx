import { Users, X, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResponsableFilter } from "@/hooks/useResponsableFilter";

interface Props {
  filtro: ResponsableFilter;
  className?: string;
}

/** Filtro multi-selección por responsable de la causa (despachante / empleado a cargo). */
export default function ResponsableFilterButton({ filtro, className = "" }: Props) {
  const { label, opciones, seleccionados, activo, toggle, limpiar } = filtro;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger
          title={`Filtrar por ${label.toLowerCase()}`}
          className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-xs transition-colors ${
            activo
              ? "border-primary/50 bg-primary/10 text-primary font-medium"
              : "border-border/60 bg-card/80 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Responsable</span>
          {activo && (
            <span className="ml-0.5 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px] leading-4">
              {seleccionados.length}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Filtrar por {label.toLowerCase()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {opciones.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Todavía no hay responsables cargados en las causas.
            </p>
          )}
          {opciones.map((op) => {
            const on = seleccionados.includes(op);
            return (
              <DropdownMenuItem
                key={op}
                onSelect={(e) => { e.preventDefault(); toggle(op); }}
                className={`text-xs justify-between gap-2 ${on ? "text-primary" : ""}`}
              >
                <span className="truncate">{op}</span>
                {on && <Check className="w-3.5 h-3.5 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
          {activo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => limpiar()} className="text-xs text-muted-foreground">
                <X className="w-3.5 h-3.5 mr-1.5" /> Limpiar filtro
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activo && (
        <button
          type="button"
          onClick={limpiar}
          title="Quitar filtro de responsable"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground max-w-[220px]"
        >
          <span className="truncate">{seleccionados.join(", ")}</span>
          <X className="w-3 h-3 shrink-0" />
        </button>
      )}
    </div>
  );
}
