import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import OcultaDeSelector from "@/components/listas/OcultaDeSelector";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCrear: (nombre: string, ocultaDe: string[]) => Promise<void>;
}

export default function CrearListaDialog({ open, onOpenChange, onCrear }: Props) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [ocultar, setOcultar] = useState(false);
  const [ocultaDe, setOcultaDe] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    setSaving(true);
    try {
      await onCrear(n, ocultar ? ocultaDe : []);
      toast.success("Lista creada");
      setNombre("");
      setOcultar(false);
      setOcultaDe([]);
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
              Las listas son carpetas de acomodo compartidas dentro de el espacio. Podés tener hasta 2.
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
          <div className="space-y-3 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="ocultar-lista">¿Las causas de esta lista deben ocultarse de otras pestañas?</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Las causas seguirán visibles dentro de esta lista.
                </p>
              </div>
              <Switch id="ocultar-lista" checked={ocultar} onCheckedChange={setOcultar} disabled={saving} />
            </div>
            {ocultar && <OcultaDeSelector value={ocultaDe} onChange={setOcultaDe} disabled={saving} />}
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
