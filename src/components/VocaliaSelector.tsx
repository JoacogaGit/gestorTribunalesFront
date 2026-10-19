import { useEffect, useMemo, useState } from "react";
import { Scale, LogOut, Pencil, Check, X, RefreshCw, Inbox, Plus, Loader2, Trash2, Lock, KeyRound } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import WelcomeNoTribunal from "@/components/WelcomeNoTribunal";
import { supabase } from "@/integrations/supabase/client";
import PasswordEspacioFields from "@/components/forms/PasswordEspacioFields";
import { useCrearEspacio } from "@/hooks/useCrearEspacio";
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
  const espacioMuts = useCrearEspacio();
  const [createPassword, setCreatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [borrarTarget, setBorrarTarget] = useState<VocaliaRow | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [menuInicial, setMenuInicial] = useState(false);
  // Contraseña de espacio: candado al entrar + definición por el admin.
  const [conPassword, setConPassword] = useState<Set<string>>(new Set());
  const [passTarget, setPassTarget] = useState<VocaliaRow | null>(null);
  const [passValue, setPassValue] = useState("");
  const [passChecking, setPassChecking] = useState(false);
  const [passAdminTarget, setPassAdminTarget] = useState<VocaliaRow | null>(null);
  const [passAdminValue, setPassAdminValue] = useState("");
  const [passAdminSaving, setPassAdminSaving] = useState(false);

  const unlockKey = (id: string) => `iustrack_vocalia_unlock_${id}`;
  const estaDesbloqueada = (id: string) => {
    try { return sessionStorage.getItem(unlockKey(id)) === "1"; } catch { return false; }
  };

  const volverAlMenuInicial = () => {
    setMenuInicial(false);
    window.dispatchEvent(new Event("iustrack:membresias"));
    refetch();
  };

  const handleEliminarEspacio = async () => {
    if (!borrarTarget) return;
    setBorrando(true);
    const { error } = await supabase.rpc("eliminar_vocalia", { p_vocalia_id: borrarTarget.id });
    setBorrando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${borrarTarget.nombre} enviado a la papelera`);
    setBorrarTarget(null);
    refetch();
  };

  // Cargar tribunales donde el usuario es admin para mostrar la tarjeta "Crear espacio"
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

  // Lista de tribunales donde se puede crear espacio: cualquier oficina donde sea admin
  const tribunalesCreables = useMemo<CreatableTribunal[]>(() => {
    const map = new Map<string, CreatableTribunal>();
    vocalias.forEach((v) => {
      if (!adminTribunalIds.has(v.tribunal_id)) return;
      if (!map.has(v.tribunal_id)) map.set(v.tribunal_id, { id: v.tribunal_id, nombre: v.tribunal_nombre || "Oficina" });
    });
    return Array.from(map.values());
  }, [vocalias, adminTribunalIds]);

  // Cantidad de espacios por oficina (para no permitir borrar el último)
  const espaciosPorTribunal = useMemo(() => {
    const m = new Map<string, number>();
    vocalias.forEach((v) => m.set(v.tribunal_id, (m.get(v.tribunal_id) ?? 0) + 1));
    return m;
  }, [vocalias]);

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

  // Cuáles espacios tienen contraseña (para mostrar el candado).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (vocalias.length === 0) { setConPassword(new Set()); return; }
      const checks = await Promise.all(
        vocalias.map(async (v) => {
          const { data } = await supabase.rpc("vocalia_tiene_password", { p_vocalia_id: v.id });
          return { id: v.id, tiene: data === true };
        }),
      );
      if (cancelled) return;
      setConPassword(new Set(checks.filter((c) => c.tiene).map((c) => c.id)));
    })();
    return () => { cancelled = true; };
  }, [vocalias]);

  const entrar = (v: VocaliaRow) => onSelect({ id: v.id, nombre: v.nombre, tribunalId: v.tribunal_id });

  const handleSelect = (v: VocaliaRow) => {
    const esAdmin = adminTribunalIds.has(v.tribunal_id);
    if (conPassword.has(v.id) && !esAdmin && !estaDesbloqueada(v.id)) {
      setPassValue("");
      setPassTarget(v);
      return;
    }
    entrar(v);
  };

  const handleVerificarPassword = async () => {
    if (!passTarget) return;
    setPassChecking(true);
    const { data, error } = await supabase.rpc("verificar_password_vocalia", {
      p_vocalia_id: passTarget.id,
      p_password: passValue,
    });
    setPassChecking(false);
    if (error) { toast.error(error.message); return; }
    if (data !== true) { toast.error("Contraseña incorrecta"); return; }
    try { sessionStorage.setItem(unlockKey(passTarget.id), "1"); } catch { /* ignore */ }
    const v = passTarget;
    setPassTarget(null);
    entrar(v);
  };

  const handleDefinirPassword = async (quitar: boolean) => {
    if (!passAdminTarget) return;
    if (!quitar && !passAdminValue.trim()) { toast.error("Ingresá una contraseña"); return; }
    setPassAdminSaving(true);
    const { error } = await supabase.rpc("definir_password_vocalia", {
      p_vocalia_id: passAdminTarget.id,
      p_password: quitar ? "" : passAdminValue.trim(),
    });
    setPassAdminSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(quitar ? "Contraseña quitada" : "Contraseña guardada");
    setConPassword((prev) => {
      const next = new Set(prev);
      if (quitar) next.delete(passAdminTarget.id); else next.add(passAdminTarget.id);
      return next;
    });
    setPassAdminTarget(null);
    setPassAdminValue("");
  };

  // Oficina de espacio único: entrar directo, sin pasar por el selector.
  useEffect(() => {
    if (loading || error) return;
    if (vocalias.length !== 1) return;
    const v = vocalias[0];
    if (v.tribunal_modo !== "lista_unica") return;
    handleSelect(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, vocalias, conPassword]);

  const handleCrear = async () => {
    if (!createOpen || !adminTribunalIds.has(createOpen.id) || creating) return;
    setCreating(true);
    try {
      const data = await espacioMuts.crear(createOpen.id, nuevoNombre, createPassword ? newPassword : null);
      toast.success("Espacio creado");
      setCreateOpen(null);
      setNuevoNombre("");
      await refetch();
      onSelect({ id: data.id, nombre: data.nombre, tribunalId: data.tribunal_id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el espacio");
    } finally { setCreating(false); }
  };

  if (menuInicial) {
    return <WelcomeNoTribunal onCreated={volverAlMenuInicial} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="flex justify-end items-center gap-1 mb-4">
          <SuperadminLink />
          <RefreshButton onRefresh={refetch} loading={loading} label="Actualizar espacios" />
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-1.5" />
            Volver al inicio de sesión
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">IusTrack</h1>
          </div>
          <p className="text-muted-foreground text-lg">Elegí el espacio con la que querés trabajar</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron cargar los espacios</AlertTitle>
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
            <h3 className="font-display text-lg font-semibold text-foreground">No hay espacios disponibles</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Pedile a un administrador de la oficina que te dé acceso a un espacio, o empezá con una oficina propia.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setMenuInicial(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Crear oficina o unirme con código
              </Button>
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && vocalias.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6">
            {tribunalesCreables.map((t) => (
              <button
                key={`crear-${t.id}`}
                type="button"
                onClick={() => { espacioMuts.reset(); setCreatePassword(false); setNewPassword(""); setCreateOpen(t); setNuevoNombre(""); }}
                className="rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-card/30 hover:bg-card/60 p-8 text-center transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40 w-full md:w-[calc((100%-3rem)/3)] shrink-0 flex flex-col items-center justify-center min-h-[260px]"
              >
                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Plus className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-lg font-display font-semibold text-foreground mb-1">Crear espacio u oficina</h2>
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
              const canDelete = adminTribunalIds.has(v.tribunal_id) && (espaciosPorTribunal.get(v.tribunal_id) ?? 1) > 1;
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
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors relative">
                      <Scale className="w-7 h-7 text-primary" />
                      {conPassword.has(v.id) && (
                        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-muted p-1 border border-border" title="Espacio con contraseña">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    {!isEditing && (canEdit || canDelete || adminTribunalIds.has(v.tribunal_id)) && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {adminTribunalIds.has(v.tribunal_id) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPassAdminValue(""); setPassAdminTarget(v); }}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title={conPassword.has(v.id) ? "Cambiar o quitar contraseña" : "Definir contraseña"}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(v); }}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title="Editar nombre"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setBorrarTarget(v); }}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            title="Enviar a la papelera"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

        {!loading && !error && (
          <div className="mt-10 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setMenuInicial(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Crear otra oficina o unirme con un código
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!createOpen} onOpenChange={(o) => { if (!o && !creating) { espacioMuts.reset(); setCreateOpen(null); setNuevoNombre(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear espacio u oficina</DialogTitle>
            <DialogDescription className="text-xs">
              {createOpen ? `Se va a crear dentro de ${createOpen.nombre}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-vocalia">Nombre de el espacio u oficina</Label>
            <Input
              id="nuevo-vocalia"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Espacio 2"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCrear(); }}
            />
          </div>
          <PasswordEspacioFields enabled={createPassword} password={newPassword} onEnabledChange={setCreatePassword} onPasswordChange={setNewPassword} disabled={creating} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { espacioMuts.reset(); setCreateOpen(null); setNuevoNombre(""); }} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} disabled={creating || !nuevoNombre.trim() || (createPassword && !newPassword.trim())}>
              {creating && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!borrarTarget} onOpenChange={(o) => { if (!o && !borrando) setBorrarTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar “{borrarTarget?.nombre}” a la papelera?</AlertDialogTitle>
            <AlertDialogDescription>
              El espacio y sus datos dejan de verse, pero se pueden recuperar desde la papelera durante 30 días.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={borrando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleEliminarEspacio(); }} disabled={borrando}>
              {borrando && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Enviar a la papelera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!passTarget} onOpenChange={(o) => { if (!o && !passChecking) setPassTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Espacio con contraseña</DialogTitle>
            <DialogDescription>
              “{passTarget?.nombre}” está protegido. Ingresá la contraseña para entrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pass-vocalia">Contraseña</Label>
            <Input
              id="pass-vocalia"
              type="password"
              value={passValue}
              onChange={(e) => setPassValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleVerificarPassword(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassTarget(null)} disabled={passChecking}>Cancelar</Button>
            <Button onClick={handleVerificarPassword} disabled={passChecking || !passValue.trim()}>
              {passChecking && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!passAdminTarget} onOpenChange={(o) => { if (!o && !passAdminSaving) setPassAdminTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Contraseña de “{passAdminTarget?.nombre}”</DialogTitle>
            <DialogDescription>
              Quien no sea administrador va a necesitar esta contraseña para entrar al espacio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pass-admin-vocalia">Nueva contraseña</Label>
            <Input
              id="pass-admin-vocalia"
              type="password"
              value={passAdminValue}
              onChange={(e) => setPassAdminValue(e.target.value)}
              autoFocus
              placeholder={conPassword.has(passAdminTarget?.id ?? "") ? "Dejá igual o escribí una nueva" : "Escribí la contraseña"}
              onKeyDown={(e) => { if (e.key === "Enter") handleDefinirPassword(false); }}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {conPassword.has(passAdminTarget?.id ?? "") && (
              <Button variant="outline" onClick={() => handleDefinirPassword(true)} disabled={passAdminSaving}>
                Quitar contraseña
              </Button>
            )}
            <Button onClick={() => handleDefinirPassword(false)} disabled={passAdminSaving || !passAdminValue.trim()}>
              {passAdminSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
