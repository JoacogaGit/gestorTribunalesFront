import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Causa } from "@/data/mockCausas";
import { criteriosDisponibles, opcionesCriterio } from "@/lib/estadisticasCustom";
import { COLORES_TABLERO } from "@/lib/tableroColores";
import { Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  esEstudio: boolean;
  causas: Causa[];
  subestados?: string[];
  estadosProcesales?: string[];
  fueros?: string[];
  onCrear: (input: { nombre: string; campo: string; valor: string; color: string | null }) => Promise<{ error?: string }>;
}

const DIAS_SUGERIDOS = ["7", "15", "30", "60", "90"];

export default function NuevaEstadisticaDialog({
  open, onOpenChange, esEstudio, causas, subestados, estadosProcesales, fueros, onCrear,
}: Props) {
  const criterios = criteriosDisponibles(esEstudio);
  const [nombre, setNombre] = useState("");
  const [criterioId, setCriterioId] = useState<string>("");
  const [valor, setValor] = useState<string>("");
  const [color, setColor] = useState<string>(COLORES_TABLERO[0].id);
  const [guardando, setGuardando] = useState(false);

  const criterio = criterios.find((c) => c.id === criterioId) ?? null;
  const opciones = useMemo(
    () => opcionesCriterio(criterio, { causas, subestados, estadosProcesales, fueros }),
    [criterio, causas, subestados, estadosProcesales, fueros],
  );

  const reset = () => { setNombre(""); setCriterioId(""); setValor(""); setColor(COLORES_TABLERO[0].id); };

  const guardar = async () => {
    if (!criterioId) { toast.error("Elegí un criterio."); return; }
    const esDias = criterio?.tipoValor === "dias";
    const valorFinal = esDias ? String(parseInt(valor, 10)) : valor;
    if (esDias && (!Number.isFinite(parseInt(valor, 10)) || parseInt(valor, 10) <= 0)) {
      toast.error("Ingresá una cantidad de días válida.");
      return;
    }
    if (!esDias && !valorFinal) { toast.error("Elegí un valor."); return; }
    const nombreFinal = nombre.trim() || `${criterio?.label ?? "Estadística"}: ${valorFinal}`;
    setGuardando(true);
    const { error } = await onCrear({ nombre: nombreFinal, campo: criterioId, valor: valorFinal, color });
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
              placeholder="Ej: Detenidos con vto. cercano"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Criterio</Label>
            <Select value={criterioId} onValueChange={(v) => { setCriterioId(v); setValor(""); }}>
              <SelectTrigger><SelectValue placeholder="Elegí un criterio" /></SelectTrigger>
              <SelectContent>
                {criterios.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {criterio?.descripcion && (
              <p className="text-[11px] text-muted-foreground">{criterio.descripcion}</p>
            )}
          </div>

          {criterio?.tipoValor === "dias" ? (
            <div className="space-y-1.5">
              <Label htmlFor="dias-estadistica">Cantidad de días</Label>
              <Input
                id="dias-estadistica"
                type="number"
                min={1}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ej: 30"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DIAS_SUGERIDOS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setValor(d)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                      valor === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Select value={valor} onValueChange={setValor} disabled={!criterio || opciones.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!criterio ? "Elegí primero un criterio" : opciones.length ? "Elegí un valor" : "Sin valores cargados"} />
                </SelectTrigger>
                <SelectContent>
                  {opciones.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

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
