import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCausaMutations, CausaInput, SujetoInput } from "@/hooks/useCausaMutations";
import {
  DbEstadoCausa, DbSituacionLibertad, DbTipoRecurso,
  ESTADOS_CAUSA_DB, SITUACIONES_LIBERTAD, TIPOS_RECURSO,
  labelEstadoCausa, labelSituacionLibertad, labelTipoRecurso,
} from "@/lib/causaMapper";
import CausaConexaInput from "./CausaConexaInput";

type Mode = "crear" | "editar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  causaId?: string | null;
  /** Pre-rellenos sólo para modo "crear" (ej. detenidos pre-fija situación). */
  initialSujetoSituacion?: DbSituacionLibertad;
  onMutated?: () => void;
}

interface SujetoState extends SujetoInput {
  _localKey: string;
  /** marca para borrar al guardar (sólo modo editar) */
  _markedForDelete?: boolean;
}

function emptyCausa(): CausaInput {
  return {
    expediente_nro: "",
    caratula: "",
    estado_causa: "tramite",
    tipo_recurso: null,
    querella: "",
    actor_civil: "",
    otros_intervinientes: "",
    causa_conexa_texto: "",
    causa_conexa_id: null,
  };
}

function emptySujeto(situacion: DbSituacionLibertad = "libre"): SujetoState {
  return {
    _localKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre_completo: "",
    delito: "",
    situacion_libertad: situacion,
    defensor: "",
    fecha_detencion: null,
    lugar_alojamiento: "",
    prescripcion_fecha: null,
    vencimiento_pp: null,
    vencimiento_pena: null,
    observaciones: "",
  };
}

function nullify<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "string" && v.trim() === "") out[k] = null;
  }
  return out as T;
}

export default function CausaFormDialog({
  open, onOpenChange, mode, causaId, initialSujetoSituacion, onMutated,
}: Props) {
  const muts = useCausaMutations();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteCausa, setConfirmDeleteCausa] = useState(false);
  const [confirmDeleteSujeto, setConfirmDeleteSujeto] = useState<SujetoState | null>(null);

  const [causa, setCausa] = useState<CausaInput>(emptyCausa());
  const [sujetos, setSujetos] = useState<SujetoState[]>(() =>
    mode === "crear" && initialSujetoSituacion ? [emptySujeto(initialSujetoSituacion)] : []
  );
  const [openExtras, setOpenExtras] = useState(false);
  const [confirmDiscardEmpty, setConfirmDiscardEmpty] = useState(false);

  // Cargar datos en modo editar
  useEffect(() => {
    if (!open) return;
    if (mode === "crear") {
      setCausa(emptyCausa());
      setSujetos(initialSujetoSituacion ? [emptySujeto(initialSujetoSituacion)] : []);
      setErrorMsg(null);
      return;
    }
    if (mode === "editar" && causaId) {
      let cancelled = false;
      setLoading(true);
      (async () => {
        const { data, error } = await supabase
          .from("causas")
          .select("*, sujetos(*)")
          .eq("id", causaId)
          .single();
        if (cancelled) return;
        if (error || !data) {
          setErrorMsg(error?.message || "No se pudo cargar la causa.");
        } else {
          setCausa({
            expediente_nro: data.expediente_nro ?? "",
            caratula: data.caratula ?? "",
            estado_causa: data.estado_causa as DbEstadoCausa,
            tipo_recurso: (data.tipo_recurso as DbTipoRecurso) ?? null,
            querella: data.querella ?? "",
            actor_civil: data.actor_civil ?? "",
            otros_intervinientes: data.otros_intervinientes ?? "",
            causa_conexa_texto: data.causa_conexa_texto ?? "",
            causa_conexa_id: data.causa_conexa_id ?? null,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list: any[] = data.sujetos ?? [];
          setSujetos(list.map((s) => ({
            _localKey: s.id,
            id: s.id,
            nombre_completo: s.nombre_completo ?? "",
            delito: s.delito ?? "",
            situacion_libertad: s.situacion_libertad as DbSituacionLibertad,
            defensor: s.defensor ?? "",
            fecha_detencion: s.fecha_detencion ?? null,
            lugar_alojamiento: s.lugar_alojamiento ?? "",
            prescripcion_fecha: s.prescripcion_fecha ?? null,
            vencimiento_pp: s.vencimiento_pp ?? null,
            vencimiento_pena: s.vencimiento_pena ?? null,
            observaciones: s.observaciones ?? "",
          })));
        }
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }
  }, [open, mode, causaId, initialSujetoSituacion]);

  const visibleSujetos = useMemo(() => sujetos.filter((s) => !s._markedForDelete), [sujetos]);

  const updateCausa = (patch: Partial<CausaInput>) => setCausa((c) => ({ ...c, ...patch }));
  const updateSujeto = (key: string, patch: Partial<SujetoInput>) =>
    setSujetos((arr) => arr.map((s) => s._localKey === key ? { ...s, ...patch } : s));

  const addSujeto = () => setSujetos((arr) => [...arr, emptySujeto()]);

  const removeSujetoLocal = (key: string) => {
    setSujetos((arr) => {
      const target = arr.find((s) => s._localKey === key);
      // En modo editar, los persistidos se marcan; los nuevos se eliminan directo.
      if (target?.id) {
        return arr.map((s) => s._localKey === key ? { ...s, _markedForDelete: true } : s);
      }
      return arr.filter((s) => s._localKey !== key);
    });
  };

  const isSujetoEmpty = (s: SujetoState) => {
    return !s.nombre_completo.trim() && !s.delito && !s.defensor && !s.fecha_detencion
      && !s.lugar_alojamiento && !s.prescripcion_fecha && !s.vencimiento_pp
      && !s.vencimiento_pena && !s.observaciones && s.situacion_libertad === "libre";
  };

  const validate = (): string | null => {
    if (!causa.expediente_nro.trim()) return "El N° de expediente es obligatorio.";
    if (causa.estado_causa === "recurso" && !causa.tipo_recurso) {
      return 'Si el estado es "Recurso", elegí el tipo de recurso.';
    }
    // Solo exigir nombre a sujetos con algún dato pero sin nombre.
    for (const s of visibleSujetos) {
      if (!isSujetoEmpty(s) && !s.nombre_completo.trim()) {
        return "Cada imputado con datos cargados necesita un nombre.";
      }
    }
    return null;
  };

  const buildPayload = (): { causa: CausaInput; sujetos: SujetoInput[] } => {
    const baseCausa = nullify({ ...causa } as unknown as Record<string, unknown>) as unknown as CausaInput;
    const causaPayload: CausaInput = {
      ...baseCausa,
      expediente_nro: causa.expediente_nro.trim(),
      estado_causa: causa.estado_causa,
      tipo_recurso: causa.estado_causa === "recurso" ? causa.tipo_recurso : null,
      causa_conexa_id: causa.causa_conexa_texto?.trim() ? (causa.causa_conexa_id ?? null) : null,
    };
    // Filtrar sujetos completamente vacíos (no se persisten).
    const sujetosFiltrados = visibleSujetos.filter((s) => !isSujetoEmpty(s));
    const sujetosPayload: SujetoInput[] = sujetosFiltrados.map((s) => {
      const { _localKey, _markedForDelete, ...rest } = s;
      const cleaned = nullify({
        ...rest,
        nombre_completo: rest.nombre_completo.trim(),
        lugar_alojamiento: rest.situacion_libertad === "detenido" ? rest.lugar_alojamiento : null,
      } as unknown as Record<string, unknown>) as unknown as SujetoInput;
      return cleaned;
    });
    return { causa: causaPayload, sujetos: sujetosPayload };
  };

  const doSubmit = async () => {
    setErrorMsg(null);
    const { causa: causaP, sujetos: sujetosP } = buildPayload();

    if (mode === "crear") {
      const res = await muts.crearCausa(causaP, sujetosP);
      if (res.ok !== true) { setErrorMsg(res.error); return; }
      toast.success("Causa creada");
      onMutated?.();
      onOpenChange(false);
      return;
    }

    // editar: causa + diferencias de sujetos
    if (!causaId) return;
    const resCausa = await muts.actualizarCausa(causaId, causaP);
    if (resCausa.ok !== true) { setErrorMsg(resCausa.error); return; }

    // Borrar marcados (persistidos)
    const toDelete = sujetos.filter((s) => s._markedForDelete && s.id);
    for (const s of toDelete) {
      const r = await muts.borrarSujeto(s.id!);
      if (r.ok !== true) { setErrorMsg(`Error al borrar imputado: ${r.error}`); return; }
    }
    // Procesar visibles no vacíos (alineados con sujetosP)
    const sujetosToSync = visibleSujetos.filter((s) => !isSujetoEmpty(s));
    for (let i = 0; i < sujetosToSync.length; i++) {
      const draft = sujetosToSync[i];
      const payload = sujetosP[i];
      if (draft.id) {
        const r = await muts.actualizarSujeto(draft.id, payload);
        if (r.ok !== true) { setErrorMsg(`Error al guardar imputado: ${r.error}`); return; }
      } else {
        const r = await muts.crearSujeto(causaId, payload);
        if (r.ok !== true) { setErrorMsg(`Error al crear imputado: ${r.error}`); return; }
      }
    }
    toast.success("Cambios guardados");
    onMutated?.();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    const v = validate();
    if (v) { setErrorMsg(v); return; }
    // Si hay sujetos completamente vacíos, ofrecer descartarlos.
    const hasEmpty = visibleSujetos.some((s) => isSujetoEmpty(s) && !s.id);
    if (hasEmpty) {
      setConfirmDiscardEmpty(true);
      return;
    }
    await doSubmit();
  };

  const handleDeleteCausa = async () => {
    if (!causaId) return;
    const r = await muts.borrarCausa(causaId);
    if (r.ok !== true) { toast.error(r.error); return; }
    toast.success("Causa eliminada");
    setConfirmDeleteCausa(false);
    onMutated?.();
    onOpenChange(false);
  };

  const confirmRemoveSujeto = (s: SujetoState) => {
    if (!s.id) {
      // nuevo, eliminar sin pedir confirmación
      removeSujetoLocal(s._localKey);
      return;
    }
    setConfirmDeleteSujeto(s);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {mode === "crear" ? "Nueva causa" : "Editar causa"}
              {causa.expediente_nro && mode === "editar" && (
                <span className="ml-2 text-sm font-mono text-muted-foreground">N° {causa.expediente_nro}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <div className="space-y-5 text-sm">
              {/* Datos generales */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos generales</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">N° Expediente *</Label>
                    <Input
                      value={causa.expediente_nro}
                      onChange={(e) => updateCausa({ expediente_nro: e.target.value })}
                      placeholder="Ej. 12345/2024"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Carátula</Label>
                    <Input
                      value={causa.caratula ?? ""}
                      onChange={(e) => updateCausa({ caratula: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado *</Label>
                    <Select
                      value={causa.estado_causa}
                      onValueChange={(v) => updateCausa({
                        estado_causa: v as DbEstadoCausa,
                        tipo_recurso: v === "recurso" ? causa.tipo_recurso : null,
                      })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ESTADOS_CAUSA_DB.map((e) => (
                          <SelectItem key={e} value={e}>{labelEstadoCausa[e]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {causa.estado_causa === "recurso" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de recurso *</Label>
                      <Select
                        value={causa.tipo_recurso ?? ""}
                        onValueChange={(v) => updateCausa({ tipo_recurso: v as DbTipoRecurso })}
                      >
                        <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_RECURSO.map((t) => (
                            <SelectItem key={t} value={t}>{labelTipoRecurso[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>

              {/* Datos complementarios */}
              <Collapsible open={openExtras} onOpenChange={setOpenExtras}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openExtras ? "rotate-180" : ""}`} />
                  Datos complementarios
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Querella</Label>
                    <Input value={causa.querella ?? ""} onChange={(e) => updateCausa({ querella: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Actor civil</Label>
                    <Input value={causa.actor_civil ?? ""} onChange={(e) => updateCausa({ actor_civil: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Otros intervinientes</Label>
                    <Input value={causa.otros_intervinientes ?? ""} onChange={(e) => updateCausa({ otros_intervinientes: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Causa conexa</Label>
                    <Input
                      value={causa.causa_conexa_texto ?? ""}
                      onChange={(e) => updateCausa({ causa_conexa_texto: e.target.value })}
                      placeholder="N° de causa conexa o referencia"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Imputados */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Imputados ({visibleSujetos.length})
                  </h3>
                  <Button type="button" size="sm" variant="outline" onClick={addSujeto}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar imputado
                  </Button>
                </div>

                {visibleSujetos.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sin imputados cargados.</p>
                )}

                <div className="space-y-3">
                  {visibleSujetos.map((s) => (
                    <SujetoCard
                      key={s._localKey}
                      sujeto={s}
                      onChange={(patch) => updateSujeto(s._localKey, patch)}
                      onRemove={() => confirmRemoveSujeto(s)}
                    />
                  ))}
                </div>
              </section>

              {errorMsg && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
                  {errorMsg}
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                {mode === "editar" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDeleteCausa(true)}
                    disabled={muts.saving}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Borrar causa
                  </Button>
                ) : <span />}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={muts.saving}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleSubmit} disabled={muts.saving}>
                    {muts.saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {mode === "crear" ? "Crear causa" : "Guardar cambios"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar borrar causa */}
      <AlertDialog open={confirmDeleteCausa} onOpenChange={setConfirmDeleteCausa}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta causa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto borrará la causa, todos sus imputados y todos sus eventos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={muts.saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteCausa(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={muts.saving}
            >
              {muts.saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar borrar sujeto persistido */}
      <AlertDialog open={!!confirmDeleteSujeto} onOpenChange={(o) => !o && setConfirmDeleteSujeto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar a este imputado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{confirmDeleteSujeto?.nombre_completo || "(sin nombre)"}". Esta acción no se puede deshacer.
              {confirmDeleteSujeto?.id && " El cambio se confirma al guardar la causa."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDeleteSujeto) removeSujetoLocal(confirmDeleteSujeto._localKey);
                setConfirmDeleteSujeto(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SujetoCardProps {
  sujeto: SujetoState;
  onChange: (patch: Partial<SujetoInput>) => void;
  onRemove: () => void;
}

function SujetoCard({ sujeto, onChange, onRemove }: SujetoCardProps) {
  return (
    <div className="bg-muted/40 rounded-md p-3 space-y-3 border border-border/60">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Nombre completo *</Label>
            <Input
              value={sujeto.nombre_completo}
              onChange={(e) => onChange({ nombre_completo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delito</Label>
            <Input value={sujeto.delito ?? ""} onChange={(e) => onChange({ delito: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Situación de libertad</Label>
            <Select
              value={sujeto.situacion_libertad}
              onValueChange={(v) => onChange({ situacion_libertad: v as DbSituacionLibertad })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SITUACIONES_LIBERTAD.map((s) => (
                  <SelectItem key={s} value={s}>{labelSituacionLibertad[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Defensor</Label>
            <Input value={sujeto.defensor ?? ""} onChange={(e) => onChange({ defensor: e.target.value })} />
          </div>
          {sujeto.situacion_libertad === "detenido" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Lugar de alojamiento</Label>
              <Input
                value={sujeto.lugar_alojamiento ?? ""}
                onChange={(e) => onChange({ lugar_alojamiento: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de detención</Label>
            <Input
              type="date"
              value={sujeto.fecha_detencion ?? ""}
              onChange={(e) => onChange({ fecha_detencion: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vto. Prisión Preventiva</Label>
            <Input
              type="date"
              value={sujeto.vencimiento_pp ?? ""}
              onChange={(e) => onChange({ vencimiento_pp: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vto. Pena</Label>
            <Input
              type="date"
              value={sujeto.vencimiento_pena ?? ""}
              onChange={(e) => onChange({ vencimiento_pena: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prescripción</Label>
            <Input
              type="date"
              value={sujeto.prescripcion_fecha ?? ""}
              onChange={(e) => onChange({ prescripcion_fecha: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              value={sujeto.observaciones ?? ""}
              onChange={(e) => onChange({ observaciones: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-1 -mr-1"
          title="Quitar imputado"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
