import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tag, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCategoriasVocalia, CategoriaVocalia } from "@/hooks/useCategoriasVocalia";

interface Props {
  vocaliaId: string;
}

export default function CategoriasManager({ vocaliaId }: Props) {
  const { categorias, loading, crear, borrar, contarUso } = useCategoriasVocalia(vocaliaId);
  const [showCreate, setShowCreate] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CategoriaVocalia | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{ eventos: number; causas: number } | null>(null);

  const handleCreate = async () => {
    const n = nombre.trim();
    if (!n) { toast.error("El nombre no puede estar vacío"); return; }
    setSaving(true);
    const r = await crear(n);
    setSaving(false);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success(`Categoría "${n}" creada en todas las causas activas`);
    setNombre("");
    setShowCreate(false);
  };

  const askDelete = async (cat: CategoriaVocalia) => {
    setConfirmDelete(cat);
    setDeleteInfo(null);
    const info = await contarUso(cat.id);
    setDeleteInfo(info);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    const r = await borrar(confirmDelete.id);
    setSaving(false);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Categoría eliminada");
    setConfirmDelete(null);
  };

  return (
    <div className="elevated-card rounded-xl p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Categorías personalizadas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Al crear una categoría, se agrega una entrada vacía a cada causa activa de la vocalía.
            Cada causa puede completarla con descripción y fecha (opcional), y agregar varias entradas.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Crear categoría
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…
        </div>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 italic py-6 text-center">
          Aún no hay categorías. Creá la primera para empezar.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{c.nombre_categoria}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => askDelete(c)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Borrar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setNombre(""); setShowCreate(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cat-nombre">Nombre de la categoría</Label>
            <Input
              id="cat-nombre"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Audiencia preliminar"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <p className="text-[11px] text-muted-foreground">
              Se agregará una anotación vacía con este nombre en cada causa activa de la vocalía.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !nombre.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar categoría "{confirmDelete?.nombre_categoria}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInfo
                ? <>Se borrarán <b>{deleteInfo.eventos}</b> anotaciones de <b>{deleteInfo.causas}</b> causas. No se puede deshacer.</>
                : "Calculando impacto…"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
