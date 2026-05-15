import { useState } from "react";
import { Scale, LogOut, Pencil, Check, X, RefreshCw, Inbox } from "lucide-react";
import { useVocalias, VocaliaRow } from "@/hooks/useVocalias";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { VocaliaActual } from "@/context/VocaliaContext";
import RefreshButton from "@/components/RefreshButton";

interface Props {
  onSelect: (v: VocaliaActual) => void;
  onLogout: () => void;
}

export default function VocaliaSelector({ onSelect, onLogout }: Props) {
  const { vocalias, loading, error, refetch, renombrarVocalia } = useVocalias();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (v: VocaliaRow) => {
    setEditingId(v.id);
    setEditValue(v.nombre);
  };

  const confirmEdit = async (v: VocaliaRow) => {
    const limpio = editValue.trim();
    if (!limpio) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    if (limpio === v.nombre) { setEditingId(null); return; }
    try {
      await renombrarVocalia(v.id, limpio);
      toast.success("Nombre actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    }
    setEditingId(null);
  };

  const handleSelect = (v: VocaliaRow) => {
    onSelect({ id: v.id, nombre: v.nombre, tribunalId: v.tribunal_id });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="flex justify-end items-center gap-1 mb-4">
          <RefreshButton onRefresh={refetch} loading={loading} label="Actualizar vocalías" />
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-1.5" />
            Volver al inicio de sesión
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">JusTrack</h1>
          </div>
          <p className="text-muted-foreground text-lg">Elegí la vocalía con la que querés trabajar</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron cargar las vocalías</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-xs">{error}</span>
              <Button size="sm" variant="outline" onClick={refetch}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && vocalias.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">No hay vocalías disponibles</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Pedile a un administrador del tribunal que te dé acceso a una vocalía.
            </p>
          </div>
        )}

        {!loading && !error && vocalias.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vocalias.map((v) => (
              <div key={v.id} className="glass-card rounded-xl p-8 text-left transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Scale className="w-7 h-7 text-primary" />
                  </div>
                  {editingId !== v.id && (
                    <button
                      onClick={() => startEdit(v)}
                      className="p-2 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Editar nombre"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {editingId === v.id ? (
                  <div className="flex items-center gap-1 mb-2">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit(v);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-muted/50 text-foreground text-xl font-display font-bold px-2 py-1 rounded-md outline-none border border-border focus:border-primary"
                    />
                    <button onClick={() => confirmEdit(v)} className="p-1 text-alert-ok hover:opacity-80">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-alert-urgent hover:opacity-80">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <h2 className="text-2xl font-display font-bold text-foreground mb-1 break-words">{v.nombre}</h2>
                )}

                <p className="text-muted-foreground text-sm mb-6">Listado de causas y seguimiento</p>

                <Button onClick={() => handleSelect(v)} className="w-full" disabled={editingId === v.id}>
                  Entrar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
