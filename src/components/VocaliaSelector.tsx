import { useEffect, useMemo, useState } from "react";
import { Scale, LogOut, Pencil, Check, X, RefreshCw, Inbox, Plus, Loader2 } from "lucide-react";
import { useVocalias, VocaliaRow } from "@/hooks/useVocalias";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { VocaliaActual } from "@/context/VocaliaContext";
import RefreshButton from "@/components/RefreshButton";
import SuperadminLink from "@/components/SuperadminLink";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onSelect: (v: VocaliaActual) => void;
  onLogout: () => void;
}

interface CreatableTribunal {
  id: string;
  nombre: string;
}

export default function VocaliaSelector({ onSelect, onLogout }: Props) {
  const { user } = useAuth();
  const { vocalias, loading, error, refetch, renombrarVocalia } = useVocalias();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [adminTribunalIds, setAdminTribunalIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState<CreatableTribunal | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [creating, setCreating] = useState(false);

  // Cargar tribunales donde el usuario es admin para mostrar la tarjeta "Crear vocalía"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setAdminTribunalIds(new Set()); return; }
      const { data } = await supabase
        .from("miembros_tribunal")
        .select("tribunal_id, rol")
        .eq("usuario_id", user.id)
        .eq("rol", "admin");
      if (cancelled) return;
      setAdminTribunalIds(new Set((data ?? []).map((m) => m.tribunal_id)));
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Lista de tribunales donde se puede crear vocalía: admin + modo separado
  const tribunalesCreables = useMemo<CreatableTribunal[]>(() => {
    const map = new Map<string, CreatableTribunal>();
    vocalias.forEach((v) => {
      if (v.tribunal_modo !== "vocalias_separadas") return;
      if (!adminTribunalIds.has(v.tribunal_id)) return;
      if (!map.has(v.tribunal_id)) map.set(v.tribunal_id, { id: v.tribunal_id, nombre: v.tribunal_nombre || "Tribunal" });
    });
    return Array.from(map.values());
  }, [vocalias, adminTribunalIds]);

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

  const handleCrear = async () => {
    if (!createOpen) return;
    const limpio = nuevoNombre.trim();
    if (!limpio) { toast.error("Ingresá un nombre"); return; }
    setCreating(true);
    const { data, error: e } = await supabase
      .from("vocalias")
      .insert({ tribunal_id: createOpen.id, nombre: limpio })
      .select("id, nombre, tribunal_id")
      .single();
    setCreating(false);
    if (e || !data) { toast.error(e?.message || "No se pudo crear la vocalía"); return; }
    toast.success("Vocalía creada");
    setCreateOpen(null);
    setNuevoNombre("");
    await refetch();
    onSelect({ id: data.id, nombre: data.nombre, tribunalId: data.tribunal_id });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="flex justify-end items-center gap-1 mb-4">
          <SuperadminLink />
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
          <div className="flex flex-wrap justify-center gap-6">
            {tribunalesCreables.map((t) => (
              <button
                key={`crear-${t.id}`}
                type="button"
                onClick={() => { setCreateOpen(t); setNuevoNombre(""); }}
                className="rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-card/30 hover:bg-card/60 p-8 text-center transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40 w-full md:w-[calc((100%-3rem)/3)] shrink-0 flex flex-col items-center justify-center min-h-[260px]"
              >
                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Plus className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-lg font-display font-semibold text-foreground mb-1">Crear vocalía u oficina</h2>
                {tribunalesCreables.length > 1 && (
                  <p className="text-xs text-muted-foreground">en {t.nombre}</p>
                )}
              </button>
            ))}
            {vocalias.map((v) => {
              const isListaUnica = v.tribunal_modo === "lista_unica";
              const displayName = isListaUnica ? (v.tribunal_nombre || v.nombre) : v.nombre;
              const subtitle = isListaUnica ? "Listado único de causas" : "Listado de causas y seguimiento";
              const isEditing = editingId === v.id;
              const canEdit = !isListaUnica;
              const cardClick = () => { if (!isEditing) handleSelect(v); };
              const cardKey = (e: React.KeyboardEvent) => {
                if (isEditing) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(v); }
              };
              return (
              <div
                  key={v.id}
                  role="button"
                  tabIndex={isEditing ? -1 : 0}
                  onClick={cardClick}
                  onKeyDown={cardKey}
                  className={`glass-card rounded-xl p-8 text-left transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 group focus:outline-none focus:ring-2 focus:ring-primary/40 w-full md:w-[calc((100%-3rem)/3)] shrink-0 ${isEditing ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Scale className="w-7 h-7 text-primary" />
                    </div>
                    {!isEditing && canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(v); }}
                        className="p-2 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Editar nombre"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") confirmEdit(v);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-muted/50 text-foreground text-xl font-display font-bold px-2 py-1 rounded-md outline-none border border-border focus:border-primary"
                      />
                      <button onClick={(e) => { e.stopPropagation(); confirmEdit(v); }} className="p-1 text-alert-ok hover:opacity-80">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 text-alert-urgent hover:opacity-80">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-2xl font-display font-bold text-foreground mb-1 break-words">{displayName}</h2>
                  )}

                  <p className="text-muted-foreground text-sm mb-6">{subtitle}</p>

                  <Button
                    onClick={(e) => { e.stopPropagation(); handleSelect(v); }}
                    className="w-full"
                    disabled={isEditing}
                  >
                    Entrar
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(null); setNuevoNombre(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear vocalía u oficina</DialogTitle>
            <DialogDescription className="text-xs">
              {createOpen ? `Se va a crear dentro de ${createOpen.nombre}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-vocalia">Nombre de la vocalía u oficina</Label>
            <Input
              id="nuevo-vocalia"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Vocalía 2"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCrear(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(null); setNuevoNombre(""); }} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} disabled={creating || !nuevoNombre.trim()}>
              {creating && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
