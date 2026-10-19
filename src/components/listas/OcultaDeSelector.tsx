import { Checkbox } from "@/components/ui/checkbox";
import { PESTANAS_OCULTABLES, claveLista } from "@/lib/pestanasOcultables";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  /** Otras listas personalizadas del espacio (sin incluir la lista que se configura). */
  otrasListas?: { id: string; nombre: string }[];
}

/** Selección múltiple de listas/pestañas de las que desaparecen las causas de una lista. */
export default function OcultaDeSelector({ value, onChange, disabled, otrasListas = [] }: Props) {
  const toggle = (p: string, checked: boolean) => {
    onChange(checked ? Array.from(new Set([...value, p])) : value.filter((v) => v !== p));
  };

  const opciones = [
    ...PESTANAS_OCULTABLES.map((p) => ({ value: p.value as string, label: p.label })),
    ...otrasListas.map((l) => ({ value: claveLista(l.id) as string, label: l.nombre })),
  ];
  const conocidas = new Set(opciones.map((o) => o.value));
  const elegidas = value.filter((v) => conocidas.has(v)).length;

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((p) => (
          <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer min-w-0">
            <Checkbox
              checked={value.includes(p.value)}
              onCheckedChange={(c) => toggle(p.value, c === true)}
              disabled={disabled}
            />
            <span className="truncate" title={p.label}>{p.label}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {elegidas === 0
          ? "No elegiste ninguna: las causas se siguen viendo en todas las listas."
          : `Las causas de esta lista no van a aparecer en ${elegidas === 1 ? "la lista elegida" : `las ${elegidas} listas elegidas`}.`}
      </p>
    </div>
  );
}
