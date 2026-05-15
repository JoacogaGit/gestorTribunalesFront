import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { EventoInput } from "@/hooks/useEventoMutations";

interface Props {
  mode: "crear" | "editar";
  initialValue?: Partial<EventoInput>;
  saving: boolean;
  onSubmit: (v: EventoInput) => void | Promise<void>;
  onCancel: () => void;
}

function isoToInputDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // formato YYYY-MM-DD en hora local
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EventoFormInline({ mode, initialValue, saving, onSubmit, onCancel }: Props) {
  const [titulo, setTitulo] = useState(initialValue?.titulo ?? "");
  const [tipo, setTipo] = useState(initialValue?.tipo_evento ?? "");
  // initialValue.fecha puede venir como ISO timestamp (de DB) o ya YYYY-MM-DD
  const initFecha = initialValue?.fecha
    ? (initialValue.fecha.length > 10 ? isoToInputDate(initialValue.fecha) : initialValue.fecha)
    : "";
  const [fecha, setFecha] = useState(initFecha);
  const [descripcion, setDescripcion] = useState(initialValue?.descripcion ?? "");
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!titulo.trim()) { setErr("El título es obligatorio."); return; }
    setErr(null);
    await onSubmit({
      titulo: titulo.trim(),
      tipo_evento: tipo.trim() || null,
      fecha: fecha || null,
      descripcion: descripcion?.trim() || null,
    });
  };

  return (
    <div className="bg-muted/40 border border-border/60 rounded-md p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs">Título *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus placeholder="Ej. Audiencia de debate" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Input
            value={tipo ?? ""}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Ej. audiencia, nota, recordatorio"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fecha (opcional)</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs">Descripción</Label>
          <Textarea rows={2} value={descripcion ?? ""} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
      </div>
      {err && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
          {err}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="button" size="sm" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          {mode === "crear" ? "Agregar" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
