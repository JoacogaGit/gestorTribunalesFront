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
import { ChevronDown, ExternalLink, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCausaMutations, CausaInput, SujetoInput } from "@/hooks/useCausaMutations";
import { fetchPrescripcionesDeSujetos, syncPrescripcionesSujeto, PrescripcionDraft } from "@/hooks/usePrescripciones";
import {
  DbEstadoCausa, DbSituacionLibertad, DbTipoRecurso,
  ESTADOS_CAUSA_DB, SITUACIONES_LIBERTAD, TIPOS_RECURSO,
  labelEstadoCausa, labelSituacionLibertad, labelTipoRecurso,
} from "@/lib/causaMapper";
import CausaConexaInput from "./CausaConexaInput";
import AnotacionesSection from "./AnotacionesSection";

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

interface PrescripcionDraftUI {
  _key: string;
  id?: string;
  fecha: string;
  descripcion: string;
}

interface SujetoState extends SujetoInput {
  _localKey: string;
  /** marca para borrar al guardar (sólo modo editar) */
  _markedForDelete?: boolean;
  /** Fechas de prescripción adicionales (tabla prescripciones). */
  prescripciones?: PrescripcionDraftUI[];
}

function emptyCausa(): CausaInput {
  return {
    expediente_nro: "",
    caratula: "",
    estado_causa: "tramite",
    tipo_recurso: null,
    tipo_proceso: null,
    fecha_ingreso: null,
    querella: "",
    actor_civil: "",
    otros_intervinientes: "",
    causa_conexa_texto: "",
    causa_conexa_id: null,
    link_externo: "",
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
    prescripciones: [],
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
          .is("sujetos.borrado_en", null)
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tipo_proceso: ((data as any).tipo_proceso ?? null) as "unipersonal" | "colegiado" | null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fecha_ingreso: (data as any).fecha_ingreso ?? null,
            querella: data.querella ?? "",
            actor_civil: data.actor_civil ?? "",
            otros_intervinientes: data.otros_intervinientes ?? "",
            causa_conexa_texto: data.causa_conexa_texto ?? "",
            causa_conexa_id: data.causa_conexa_id ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            link_externo: (data as any).link_externo ?? "",
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list: any[] = (data.sujetos ?? []).slice().sort((a: any, b: any) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
          });
          // Traer prescripciones de todos los sujetos persistidos
          const sujetoIds = list.map((s) => s.id).filter(Boolean);
          let prescByID: Record<string, PrescripcionDraftUI[]> = {};
          if (sujetoIds.length > 0) {
            try {
              const rows = await fetchPrescripcionesDeSujetos(sujetoIds);
              prescByID = rows.reduce<Record<string, PrescripcionDraftUI[]>>((acc, r) => {
                (acc[r.sujeto_id] ||= []).push({
                  _key: r.id, id: r.id, fecha: r.fecha, descripcion: r.descripcion ?? "",
                });
                return acc;
              }, {});
            } catch { /* noop: si falla, dejamos vacío */ }
          }
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
            prescripciones: prescByID[s.id] ?? [],
          })));
        }
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }
  }, [open, mode, causaId, initialSujetoSituacion]);

  const visibleSujetos = useMemo(() => sujetos.filter((s) => !s._markedForDelete), [sujetos]);

  const updateCausa = (patch: Partial<CausaInput>) => setCausa((c) => ({ ...c, ...patch }));
  const updateSujeto = (key: string, patch: Partial<SujetoState>) =>
    setSujetos((arr) => arr.map((s) => s._localKey === key ? { ...s, ...patch } : s));

  const addSujeto = () => setSujetos((arr) => [emptySujeto(), ...arr]);

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
      && !s.vencimiento_pena && !s.observaciones && s.situacion_libertad === "libre"
      && (s.prescripciones?.length ?? 0) === 0;
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
      const { _localKey, _markedForDelete, prescripciones: _p, ...rest } = s;
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
      // Sync prescripciones para cada sujeto recién creado.
      const sujetosToSync = visibleSujetos.filter((s) => !isSujetoEmpty(s));
      for (let i = 0; i < sujetosToSync.length; i++) {
        const newId = res.sujetoIds[i];
        const drafts = (sujetosToSync[i].prescripciones ?? []).filter((p) => p.fecha).map<PrescripcionDraft>((p) => ({
          fecha: p.fecha, descripcion: p.descripcion?.trim() || null,
        }));
        if (newId && drafts.length > 0) await syncPrescripcionesSujeto(newId, drafts);
      }
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
      if (r.ok !== true) {
        const msg = `Error al borrar imputado: ${r.error}`;
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
    }
    // Procesar visibles no vacíos (alineados con sujetosP)
    const sujetosToSync = visibleSujetos.filter((s) => !isSujetoEmpty(s));
    for (let i = 0; i < sujetosToSync.length; i++) {
      const draft = sujetosToSync[i];
      const payload = sujetosP[i];
      let sujetoId: string | undefined = draft.id;
      if (draft.id) {
        const r = await muts.actualizarSujeto(draft.id, payload);
        if (r.ok !== true) { setErrorMsg(`Error al guardar imputado: ${r.error}`); return; }
      } else {
        const r = await muts.crearSujeto(causaId, payload);
        if (r.ok !== true) { setErrorMsg(`Error al crear imputado: ${r.error}`); return; }
        sujetoId = r.id;
      }
      // Sincronizar prescripciones de este sujeto
      if (sujetoId) {
        const drafts = (draft.prescripciones ?? []).filter((p) => p.fecha).map<PrescripcionDraft>((p) => ({
          id: p.id, fecha: p.fecha, descripcion: p.descripcion?.trim() || null,
        }));
        const psync = await syncPrescripcionesSujeto(sujetoId, drafts);
        if (psync.ok !== true) { setErrorMsg(`Error al guardar prescripciones: ${psync.error}`); return; }
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
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-card border-border p-0">
          <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between gap-3">
            <DialogHeader className="flex-1 min-w-0">
              <DialogTitle className="font-display text-lg truncate">
                {mode === "crear" ? "Nueva causa" : "Editar causa"}
                {causa.expediente_nro && mode === "editar" && (
                  <span className="ml-2 text-sm font-mono text-muted-foreground">N° {causa.expediente_nro}</span>
                )}
              </DialogTitle>
            </DialogHeader>
            {mode === "editar" && !loading && (
              <Button type="button" size="sm" onClick={handleSubmit} disabled={muts.saving}>
                {muts.saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                Guardar cambios
              </Button>
            )}
          </div>
          <div className="px-6 pb-6 pt-2">

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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de proceso</Label>
                    <Select
                      value={causa.tipo_proceso ?? "__none__"}
                      onValueChange={(v) => updateCausa({ tipo_proceso: v === "__none__" ? null : (v as "unipersonal" | "colegiado") })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="unipersonal">Unipersonal (UNIP)</SelectItem>
                        <SelectItem value="colegiado">Colegiado (COL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha de ingreso (354)</Label>
                    <Input
                      type="date"
                      value={causa.fecha_ingreso ?? ""}
                      onChange={(e) => updateCausa({ fecha_ingreso: e.target.value || null })}
                    />
                  </div>
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
                    <CausaConexaInput
                      value={{ id: causa.causa_conexa_id ?? null, texto: causa.causa_conexa_texto ?? "" }}
                      onChange={(v) => updateCausa({ causa_conexa_id: v.id, causa_conexa_texto: v.texto })}
                      excludeCausaId={causaId}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Buscá por N° de expediente. Elegí una sugerencia para vincular o dejá texto libre.
                    </p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3" /> Link externo (expediente / drive / etc.)
                    </Label>
                    <Input
                      type="url"
                      value={causa.link_externo ?? ""}
                      onChange={(e) => updateCausa({ link_externo: e.target.value })}
                      placeholder="https://..."
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
                      onPrescripcionesChange={(prescripciones) => updateSujeto(s._localKey, { prescripciones })}
                      onRemove={() => confirmRemoveSujeto(s)}
                    />
                  ))}
                </div>
              </section>

              {mode === "editar" && causaId && (
                <>
                  <Separator />
                  <AnotacionesSection causaId={causaId} />
                </>
              )}

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
          </div>
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

      {/* Confirmar descartar imputados vacíos */}
      <AlertDialog open={confirmDiscardEmpty} onOpenChange={setConfirmDiscardEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay un imputado sin datos</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Querés descartarlo y crear la causa, o completar sus datos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Completar datos</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                setConfirmDiscardEmpty(false);
                await doSubmit();
              }}
            >
              Descartar y crear
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
  onPrescripcionesChange: (prescripciones: PrescripcionDraftUI[]) => void;
  onRemove: () => void;
}

function SujetoCard({ sujeto, onChange, onPrescripcionesChange, onRemove }: SujetoCardProps) {
  const prescripciones = sujeto.prescripciones ?? [];
  const addPrescripcion = () => {
    onPrescripcionesChange([
      ...prescripciones,
      { _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, fecha: "", descripcion: "" },
    ]);
  };
  const updatePrescripcion = (key: string, patch: Partial<PrescripcionDraftUI>) => {
    onPrescripcionesChange(prescripciones.map((p) => p._key === key ? { ...p, ...patch } : p));
  };
  const removePrescripcion = (key: string) => {
    onPrescripcionesChange(prescripciones.filter((p) => p._key !== key));
  };

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
            <Label className="text-xs">Prescripción principal</Label>
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

          {/* Prescripciones adicionales */}
          <div className="col-span-2 space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Otras prescripciones ({prescripciones.length})
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addPrescripcion} className="h-7 px-2 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Agregar
              </Button>
            </div>
            {prescripciones.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic">Sin prescripciones adicionales.</p>
            )}
            {prescripciones.map((p) => (
              <div key={p._key} className="grid grid-cols-[140px_1fr_auto] gap-2 items-start">
                <Input
                  type="date"
                  value={p.fecha}
                  onChange={(e) => updatePrescripcion(p._key, { fecha: e.target.value })}
                />
                <Input
                  value={p.descripcion}
                  onChange={(e) => updatePrescripcion(p._key, { descripcion: e.target.value })}
                  placeholder="Descripción (opcional)"
                />
                <button
                  type="button"
                  onClick={() => removePrescripcion(p._key)}
                  className="text-muted-foreground hover:text-destructive p-2"
                  title="Quitar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
