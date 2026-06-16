import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { EventoInput } from "@/hooks/useEventoMutations";
import { useFormDraft, loadDraft, clearDraft } from "@/hooks/useFormDraft";

interface Props {
  mode: "crear" | "editar";
  initialValue?: Partial<EventoInput>;
  saving: boolean;
  onSubmit: (v: EventoInput) => void | Promise<void>;
  onCancel: () => void;
  /** Clave estable para persistencia local en sessionStorage (ej. "evento-form:new:causa-123"). */
  draftKey?: string;
}

// All-day events: se guardan como UTC midnight ("YYYY-MM-DDT00:00:00.000Z").
function isAllDayISO(iso: string): boolean {
  return /T00:00:00(\.000)?Z$/.test(iso) || /T00:00:00\+00:?00$/.test(iso);
}

function isoToInputDate(iso: string | null | undefined): string {
  if (!iso) return "";
  if (isAllDayISO(iso)) {
    // Mantener la fecha tal cual en UTC (no aplicar timezone shift).
    return iso.slice(0, 10);
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToInputTime(iso: string | null | undefined): string {
  if (!iso || iso.length <= 10) return "";
  if (isAllDayISO(iso)) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Combina fecha (YYYY-MM-DD) + hora (HH:MM opcional) en ISO para guardar. */
function combineToISO(fecha: string, hora: string): string | null {
  if (!fecha) return null;
  if (!hora) {
    // All-day → UTC midnight para detección consistente.
    return `${fecha}T00:00:00.000Z`;
  }
  const d = new Date(`${fecha}T${hora}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function EventoFormInline({ mode, initialValue, saving, onSubmit, onCancel, draftKey }: Props) {
  // Restaurar borrador local si existe (solo en modo crear, para evitar pisar datos cargados desde DB).
  const restored = mode === "crear" && draftKey ? loadDraft<EventoInput>(draftKey) : null;

  const [titulo, setTitulo] = useState(restored?.titulo ?? initialValue?.titulo ?? "");
  const [tipo, setTipo] = useState(restored?.tipo_evento ?? initialValue?.tipo_evento ?? "");
  const initFecha = restored?.fecha
    ? (restored.fecha.length > 10 ? isoToInputDate(restored.fecha) : restored.fecha)
    : (initialValue?.fecha
      ? (initialValue.fecha.length > 10 ? isoToInputDate(initialValue.fecha) : initialValue.fecha)
      : "");
  const initHora = restored?.fecha
    ? (restored.fecha.length > 10 ? isoToInputTime(restored.fecha) : "")
    : (initialValue?.fecha && initialValue.fecha.length > 10 ? isoToInputTime(initialValue.fecha) : "");
  const [fecha, setFecha] = useState(initFecha);
  const [hora, setHora] = useState(initHora);
  const [descripcion, setDescripcion] = useState(restored?.descripcion ?? initialValue?.descripcion ?? "");
  const [err, setErr] = useState<string | null>(null);

  // Persistencia con debounce solo si hay key y estamos creando.
  useFormDraft(
    draftKey ?? "__noop__",
    { titulo, tipo_evento: tipo || null, fecha: combineToISO(fecha, hora), descripcion: descripcion || null },
    !!draftKey && mode === "crear",
  );

  const submit = async () => {
    if (!titulo.trim()) { setErr("El título es obligatorio."); return; }
    if (hora && !fecha) { setErr("Si cargás hora, también debés cargar la fecha."); return; }
    setErr(null);
    await onSubmit({
      titulo: titulo.trim(),
      tipo_evento: tipo.trim() || null,
      fecha: combineToISO(fecha, hora),
      descripcion: descripcion?.trim() || null,
    });
    if (draftKey) clearDraft(draftKey);
  };

  const cancel = () => {
    if (draftKey) clearDraft(draftKey);
    onCancel();
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
        <div className="space-y-1.5">
          <Label className="text-xs">Hora (opcional)</Label>
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} disabled={!fecha} />
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
        <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={saving}>Cancelar</Button>
        <Button type="button" size="sm" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          {mode === "crear" ? "Agregar" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
