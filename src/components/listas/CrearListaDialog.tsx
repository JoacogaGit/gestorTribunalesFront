import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCrear: (nombre: string) => Promise<void>;
}

export default function CrearListaDialog({ open, onOpenChange, onCrear }: Props) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    setSaving(true);
    try {
      await onCrear(n);
      toast.success("Lista creada");
      setNombre("");
      onOpenChange(false);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo crear la lista");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva lista personalizada</DialogTitle>
            <DialogDescription>
              Las listas son carpetas de acomodo compartidas dentro de la vocalía. Podés tener hasta 2.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="nombre-lista">Nombre</Label>
            <Input
              id="nombre-lista"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Para revisar / Pendientes despacho"
              maxLength={80}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nombre.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear lista
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
