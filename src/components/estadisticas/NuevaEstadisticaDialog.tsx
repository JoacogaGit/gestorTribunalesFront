import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Causa } from "@/data/mockCausas";
import { camposDisponibles, valoresPosibles } from "@/lib/estadisticasCustom";
import { COLORES_TABLERO } from "@/lib/tableroColores";
import { Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  esEstudio: boolean;
  causas: Causa[];
  onCrear: (input: { nombre: string; campo: string; valor: string; color: string | null }) => Promise<{ error?: string }>;
}

export default function NuevaEstadisticaDialog({ open, onOpenChange, esEstudio, causas, onCrear }: Props) {
  const campos = camposDisponibles(esEstudio);
  const [nombre, setNombre] = useState("");
  const [campoId, setCampoId] = useState<string>("");
  const [valor, setValor] = useState<string>("");
  const [color, setColor] = useState<string>(COLORES_TABLERO[0].id);
  const [guardando, setGuardando] = useState(false);

  const campo = campos.find((c) => c.id === campoId) ?? null;
  const valores = useMemo(() => (campo ? valoresPosibles(causas, campo) : []), [causas, campo]);

  const reset = () => { setNombre(""); setCampoId(""); setValor(""); setColor(COLORES_TABLERO[0].id); };

  const guardar = async () => {
    if (!nombre.trim() || !campoId || !valor) {
      toast.error("Completá nombre, campo y valor.");
      return;
    }
    setGuardando(true);
    const { error } = await onCrear({ nombre: nombre.trim(), campo: campoId, valor, color });
    setGuardando(false);
    if (error) { toast.error(error); return; }
    toast.success("Estadística creada");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva estadística</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre-estadistica">Nombre</Label>
            <Input
              id="nombre-estadistica"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Causas en Federal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Campo a contar</Label>
            <Select value={campoId} onValueChange={(v) => { setCampoId(v); setValor(""); }}>
              <SelectTrigger><SelectValue placeholder="Elegí un campo" /></SelectTrigger>
              <SelectContent>
                {campos.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <Select value={valor} onValueChange={setValor} disabled={!campo || valores.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={!campo ? "Elegí primero un campo" : valores.length ? "Elegí un valor" : "Sin valores cargados"} />
              </SelectTrigger>
              <SelectContent>
                {valores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORES_TABLERO.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={c.nombre}
                  title={c.nombre}
                  onClick={() => setColor(c.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.id && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
