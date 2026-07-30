import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCrear: (nombre: string) => Promise<void> | void;
}

export default function CrearTableroDialog({ open, onOpenChange, onCrear }: Props) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onCrear(nombre.trim());
      setNombre("");
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
            <p className="text-xs text-muted-foreground">
              Dentro de la anotación vas a poder crear listas personales o compartidas con la vocalía.
            </p>
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
