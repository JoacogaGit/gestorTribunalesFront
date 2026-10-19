import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import OcultaDeSelector from "@/components/listas/OcultaDeSelector";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OpcionesLista, OPCIONES_LISTA_DEFAULT } from "@/hooks/useListasPersonalizadas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCrear: (nombre: string, ocultaDe: string[], opciones: OpcionesLista) => Promise<void>;
  /** Listas personalizadas que ya existen en el espacio. */
  listasExistentes?: { id: string; nombre: string }[];
}

export default function CrearListaDialog({ open, onOpenChange, onCrear, listasExistentes = [] }: Props) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [ocultaDe, setOcultaDe] = useState<string[]>([]);
  const [opciones, setOpciones] = useState<OpcionesLista>(OPCIONES_LISTA_DEFAULT);

  const setOpt = (k: keyof OpcionesLista, v: boolean) => setOpciones((o) => ({ ...o, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    setSaving(true);
    try {
      await onCrear(n, ocultaDe, opciones);
      toast.success("Lista creada");
      setNombre("");
      setOcultaDe([]);
      setOpciones(OPCIONES_LISTA_DEFAULT);
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
            <div>
              <Label>¿De qué otra(s) lista(s) desaparece la causa?</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Al agregar una causa a esta lista, deja de verse en las listas que marques. Dentro de esta lista se sigue viendo.
              </p>
              <OcultaDeSelector value={ocultaDe} onChange={setOcultaDe} disabled={saving} otrasListas={listasExistentes} />
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-3">
              <div>
                <Label htmlFor="opt-click-derecho">Seleccionable con click derecho</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Si está apagado, esta lista no aparece en el menú de click derecho de las causas.
                </p>
              </div>
              <Switch id="opt-click-derecho" checked={opciones.seleccionable_click_derecho} onCheckedChange={(v) => setOpt("seleccionable_click_derecho", v)} disabled={saving} />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="opt-calendario">Mostrar sus eventos en el calendario</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Si está apagado, los eventos con fecha de las causas de esta lista no aparecen en el calendario.
                </p>
              </div>
              <Switch id="opt-calendario" checked={opciones.mostrar_en_calendario} onCheckedChange={(v) => setOpt("mostrar_en_calendario", v)} disabled={saving} />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="opt-solo-admin">Visible solo para administradores</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Si está prendido, el resto de los roles no ve esta lista ni su contenido.
                </p>
              </div>
              <Switch id="opt-solo-admin" checked={opciones.solo_admin} onCheckedChange={(v) => setOpt("solo_admin", v)} disabled={saving} />
            </div>
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
