import { Check, Palette } from "lucide-react";
import { COLORES_TABLERO, resolverColor } from "@/lib/tableroColores";

interface Props {
  value: string | null;
  onChange: (color: string | null) => void;
}

export default function ColorPicker({ value, onChange }: Props) {
  const actual = resolverColor(value);
  return (
    <div className="px-2 py-1.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Palette className="h-3 w-3" /> Color
      </p>
      <div className="flex flex-wrap gap-1.5">
        {COLORES_TABLERO.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={c.nombre}
            title={c.nombre}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(c.id); }}
            className="flex h-5 w-5 items-center justify-center rounded-full ring-offset-background transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            style={{ backgroundColor: c.hex }}
          >
            {actual === c.hex && <Check className="h-3 w-3 text-white" />}
          </button>
        ))}
        <button
          type="button"
          aria-label="Sin color"
          title="Sin color"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(null); }}
          className="h-5 w-5 rounded-full border border-dashed border-border bg-transparent text-[9px] text-muted-foreground hover:border-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
