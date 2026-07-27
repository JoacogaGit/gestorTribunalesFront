import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AmbitoTablero } from "@/hooks/useTableros";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCrear: (nombre: string, ambito: AmbitoTablero) => Promise<void> | void;
}

export default function CrearTableroDialog({ open, onOpenChange, onCrear }: Props) {
  const [nombre, setNombre] = useState("");
  const [ambito, setAmbito] = useState<AmbitoTablero>("personal");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onCrear(nombre.trim(), ambito);
      setNombre("");
      setAmbito("personal");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva anotación</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="tb-nombre">Nombre</Label>
            <Input
              id="tb-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ej: Audiencias de la semana"
              autoFocus
            />

          </div>
          <div className="space-y-2">
            <Label>Ámbito</Label>
            <RadioGroup value={ambito} onValueChange={(v) => setAmbito(v as AmbitoTablero)} className="gap-3">
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="personal" id="amb-personal" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Personal</span>
                  <span className="block text-xs text-muted-foreground">Sólo vos lo ves. Se sincroniza con tu Google Calendar.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="vocalia" id="amb-vocalia" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Vocalía</span>
                  <span className="block text-xs text-muted-foreground">Compartido con todos los miembros del tribunal.</span>
                </span>
              </label>
            </RadioGroup>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={submit} disabled={!nombre.trim() || saving}>
              {saving ? "Creando…" : "Crear anotación"}
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
