import { useMemo } from "react";
import { Causa } from "@/data/mockCausas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, X } from "lucide-react";
import { MODOS_TERMINACION_BASE } from "@/lib/terminacion";

export interface FiltroTerminadas {
  modos: string[];
  desde: string;
  hasta: string;
}

export const FILTRO_TERMINADAS_VACIO: FiltroTerminadas = { modos: [], desde: "", hasta: "" };

const SIN_MODO = "(Sin modo cargado)";

export function aplicarFiltroTerminadas(causas: Causa[], f: FiltroTerminadas): Causa[] {
  if (!f.modos.length && !f.desde && !f.hasta) return causas;
  return causas.filter((c) => {
    if (f.modos.length) {
      const m = c.modoTerminacion || SIN_MODO;
      if (!f.modos.includes(m)) return false;
    }
    if (f.desde || f.hasta) {
      const fecha = c.fechaTerminacion || "";
      if (!fecha) return false;
      if (f.desde && fecha < f.desde) return false;
      if (f.hasta && fecha > f.hasta) return false;
    }
    return true;
  });
}

interface Props {
  causas: Causa[];
  value: FiltroTerminadas;
  onChange: (f: FiltroTerminadas) => void;
  total: number;
}

export default function TerminadasFiltros({ causas, value, onChange, total }: Props) {
  const opciones = useMemo(() => {
    const usados = causas.map((c) => c.modoTerminacion).filter(Boolean) as string[];
    return [...Array.from(new Set([...MODOS_TERMINACION_BASE, ...usados])), SIN_MODO];
  }, [causas]);
  const activo = value.modos.length > 0 || !!value.desde || !!value.hasta;
  const toggle = (m: string) =>
    onChange({ ...value, modos: value.modos.includes(m) ? value.modos.filter((x) => x !== m) : [...value.modos, m] });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
      <span className="font-semibold text-muted-foreground">Filtrar terminadas:</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Modo de terminación{value.modos.length ? ` (${value.modos.length})` : ""}
            <ChevronDown className="ml-1 w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 max-h-[60vh] overflow-y-auto p-2">
          {opciones.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={value.modos.includes(m)} onCheckedChange={() => toggle(m)} />
              {m}
            </label>
          ))}
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground">Terminadas desde</span>
      <Input type="date" className="h-8 w-[150px] text-xs" value={value.desde} onChange={(e) => onChange({ ...value, desde: e.target.value })} />
      <span className="text-muted-foreground">hasta</span>
      <Input type="date" className="h-8 w-[150px] text-xs" value={value.hasta} onChange={(e) => onChange({ ...value, hasta: e.target.value })} />
      {activo && (
        <>
          <span className="text-muted-foreground">{total} causa{total === 1 ? "" : "s"}</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange(FILTRO_TERMINADAS_VACIO)}>
            <X className="mr-1 w-3.5 h-3.5" /> Limpiar
          </Button>
        </>
      )}
    </div>
  );
}
