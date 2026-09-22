import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PESTANAS_OCULTABLES } from "@/lib/pestanasOcultables";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}

/** Selección múltiple de pestañas de las que se ocultan las causas de una lista. */
export default function OcultaDeSelector({ value, onChange, disabled }: Props) {
  const toggle = (p: string, checked: boolean) => {
    onChange(checked ? [...value, p] : value.filter((v) => v !== p));
  };

  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
      {PESTANAS_OCULTABLES.map((p) => (
        <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={value.includes(p.value)}
            onCheckedChange={(c) => toggle(p.value, c === true)}
            disabled={disabled}
          />
          <span>{p.label}</span>
        </label>
      ))}
      {value.length === 0 && (
        <Label className="col-span-2 text-xs text-muted-foreground font-normal">
          No seleccionaste ninguna pestaña: las causas se seguirán viendo en todas.
        </Label>
      )}
    </div>
  );
}
