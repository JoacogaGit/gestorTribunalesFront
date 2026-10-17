import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TableroLista } from "@/hooks/useTableroListas";

interface Miembro {
  usuario_id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lista: TableroLista;
  tribunalId: string;
  onGuardar: (editores: string[]) => Promise<void>;
}

/** El admin elige qué usuarios pueden editar esta lista; vacío = todos los miembros. */
export default function PermisosListaTableroDialog({ open, onOpenChange, lista, tribunalId, onGuardar }: Props) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>(lista.editores);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSeleccion(lista.editores);
    setLoading(true);
    supabase
      .from("miembros_tribunal")
      .select("usuario_id, perfiles(nombre_completo, email)")
      .eq("tribunal_id", tribunalId)
      .then(({ data, error }) => {
        if (error) { toast.error(error.message); setMiembros([]); }
        else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMiembros(((data ?? []) as any[]).map((m) => ({
            usuario_id: m.usuario_id,
            nombre: m.perfiles?.nombre_completo || m.perfiles?.email || "Usuario",
          })));
        }
        setLoading(false);
      });
  }, [open, lista.editores, tribunalId]);

  const toggle = (id: string, checked: boolean) =>
    setSeleccion((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const handleGuardar = async () => {
    setSaving(true);
    try {
      await onGuardar(seleccion);
      toast.success("Permisos actualizados");
      onOpenChange(false);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudieron guardar los permisos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quién puede editar "{lista.nombre}"</DialogTitle>
          <DialogDescription>
            Si no marcás a nadie, la lista la pueden editar todos los miembros. Si marcás algunos, solo ellos (y los administradores) pueden editarla; el resto la ve pero no la modifica.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando miembros…
            </div>
          ) : (
            <div className="space-y-2">
              {miembros.map((m) => (
                <label key={m.usuario_id} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2">
                  <Checkbox
                    checked={seleccion.includes(m.usuario_id)}
                    onCheckedChange={(c) => toggle(m.usuario_id, c === true)}
                    disabled={saving}
                  />
                  <span className="truncate">{m.nombre}</span>
                </label>
              ))}
              {miembros.length === 0 && (
                <p className="text-sm text-muted-foreground">No se encontraron miembros de la oficina.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar permisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
