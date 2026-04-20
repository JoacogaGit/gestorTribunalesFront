import { useState } from "react";
import { Causa, getCaratula, getProximityColor, EstadoLibertad, EstadoCausa } from "@/data/mockCausas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Link2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

const estadosLibertad: EstadoLibertad[] = ["Detenido", "Excarcelado", "Rebelde", "SJP"];
const estadosCausa: EstadoCausa[] = ["En trámite", "En juicio", "Terminada", "Queja en Corte", "Casación", "REX"];

interface Props {
  causa: Causa;
  onClose: () => void;
  onUpdate?: (causa: Causa) => void;
  onDelete?: (id: string) => void;
}

export default function CausaDetail({ causa, onClose, onUpdate, onDelete }: Props) {
  const [draft, setDraft] = useState<Causa>(() => JSON.parse(JSON.stringify(causa)));

  const save = () => {
    onUpdate?.(draft);
    onClose();
  };

  const updateImputado = (idx: number, patch: Partial<Causa["imputados"][number]>) => {
    const imps = [...draft.imputados];
    imps[idx] = { ...imps[idx], ...patch };
    if (patch.estadoLibertad && patch.estadoLibertad !== "Detenido") imps[idx].lugarDetencion = undefined;
    setDraft({ ...draft, imputados: imps });
  };

  const updateDefensor = (idx: number, patch: Partial<Causa["imputados"][number]["defensor"]>) => {
    const imps = [...draft.imputados];
    imps[idx] = { ...imps[idx], defensor: { ...imps[idx].defensor, ...patch } };
    setDraft({ ...draft, imputados: imps });
  };

  const addImputado = () => {
    setDraft({
      ...draft,
      imputados: [
        ...draft.imputados,
        { nombre: "", estadoLibertad: "Excarcelado", defensor: { nombre: "", tipo: "DPO", contacto: "" } },
      ],
    });
  };

  const removeImputado = (idx: number) => {
    if (draft.imputados.length === 1) return;
    setDraft({ ...draft, imputados: draft.imputados.filter((_, i) => i !== idx) });
  };

  const addAudiencia = () => {
    setDraft({ ...draft, audiencias: [...(draft.audiencias || []), { tipo: "", fecha: "", hora: "" }] });
  };

  const updateAudiencia = (idx: number, patch: Partial<Causa["audiencias"][number]>) => {
    const auds = [...(draft.audiencias || [])];
    auds[idx] = { ...auds[idx], ...patch };
    setDraft({ ...draft, audiencias: auds });
  };

  const removeAudiencia = (idx: number) => {
    setDraft({ ...draft, audiencias: (draft.audiencias || []).filter((_, i) => i !== idx) });
  };

  const addAgenda = () => {
    setDraft({ ...draft, agenda: [...(draft.agenda || []), { texto: "", fecha: "" }] });
  };

  const updateAgenda = (idx: number, patch: Partial<Causa["agenda"][number]>) => {
    const ag = [...(draft.agenda || [])];
    ag[idx] = { ...ag[idx], ...patch };
    setDraft({ ...draft, agenda: ag });
  };

  const removeAgenda = (idx: number) => {
    setDraft({ ...draft, agenda: (draft.agenda || []).filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                {draft.link ? (
                  <a href={draft.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Causa N° {draft.numero || "(sin número)"}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span>Causa N° {draft.numero || "(sin número)"}</span>
                )}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{getCaratula(draft) || "(sin imputado)"}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-md px-2 py-1.5">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                value={draft.link || ""}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                placeholder="Pegar link…"
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-44"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="N° Causa">
              <Input value={draft.numero} onChange={(e) => setDraft({ ...draft, numero: e.target.value })} />
            </Labeled>
            <Labeled label="Estado de la Causa">
              <Select value={draft.estadoCausa} onValueChange={(v) => setDraft({ ...draft, estadoCausa: v as EstadoCausa })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {estadosCausa.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </Labeled>
          </div>

          <Labeled label="Delito">
            <Input value={draft.delito} onChange={(e) => setDraft({ ...draft, delito: e.target.value })} />
          </Labeled>

          <Separator />

          {/* Imputados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Imputados ({draft.imputados.length})</p>
              <button onClick={addImputado} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80">
                <Plus className="w-3 h-3" /> Imputado
              </button>
            </div>
            <div className="space-y-3">
              {draft.imputados.map((imp, i) => (
                <div key={i} className="bg-muted/40 rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={imp.nombre}
                      onChange={(e) => updateImputado(i, { nombre: e.target.value })}
                      placeholder="Nombre del imputado"
                      className="flex-1 h-8"
                    />
                    <Select value={imp.estadoLibertad} onValueChange={(v) => updateImputado(i, { estadoLibertad: v as EstadoLibertad })}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {estadosLibertad.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {draft.imputados.length > 1 && (
                      <button onClick={() => removeImputado(i)} className="text-alert-urgent/60 hover:text-alert-urgent p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {imp.estadoLibertad === "Detenido" && (
                    <Input
                      value={imp.lugarDetencion || ""}
                      onChange={(e) => updateImputado(i, { lugarDetencion: e.target.value })}
                      placeholder="Lugar de detención"
                      className="h-8 text-xs"
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Labeled label="Vto. Pena (opcional)">
                      <Input
                        type="date"
                        value={imp.fechaVencimientoPena || ""}
                        onChange={(e) => updateImputado(i, { fechaVencimientoPena: e.target.value || undefined })}
                        className="h-8 text-xs"
                      />
                    </Labeled>
                    <Labeled label="Tipo defensor">
                      <Select value={imp.defensor.tipo} onValueChange={(v) => updateDefensor(i, { tipo: v as "DPO" | "Particular" })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DPO">DPO</SelectItem>
                          <SelectItem value="Particular">Particular</SelectItem>
                        </SelectContent>
                      </Select>
                    </Labeled>
                  </div>
                  <Input
                    value={imp.defensor.nombre}
                    onChange={(e) => updateDefensor(i, { nombre: e.target.value })}
                    placeholder="Nombre defensor"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={imp.defensor.contacto}
                    onChange={(e) => updateDefensor(i, { contacto: e.target.value })}
                    placeholder="Contacto"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Inicio">
              <Input type="date" value={draft.fechaInicio} onChange={(e) => setDraft({ ...draft, fechaInicio: e.target.value })} className="h-8" />
            </Labeled>
            <Labeled label="Elevación">
              <Input type="date" value={draft.fechaElevacion || ""} onChange={(e) => setDraft({ ...draft, fechaElevacion: e.target.value || undefined })} className="h-8" />
            </Labeled>
            <Labeled label="Radicación">
              <Input type="date" value={draft.fechaRadicacion || ""} onChange={(e) => setDraft({ ...draft, fechaRadicacion: e.target.value || undefined })} className="h-8" />
            </Labeled>
            <Labeled label="Vto. PP">
              <Input type="date" value={draft.fechaVencimientoPP || ""} onChange={(e) => setDraft({ ...draft, fechaVencimientoPP: e.target.value || undefined })} className={`h-8 ${draft.fechaVencimientoPP ? getProximityColor(draft.fechaVencimientoPP) : ""}`} />
            </Labeled>
            <Labeled label="Vto. Probation">
              <Input
                type="date"
                value={draft.probation?.vencimiento || ""}
                onChange={(e) => setDraft({ ...draft, probation: e.target.value ? { vencimiento: e.target.value } : undefined })}
                className={`h-8 ${draft.probation ? getProximityColor(draft.probation.vencimiento) : ""}`}
              />
            </Labeled>
          </div>

          <Separator />

          {/* Prescripciones (múltiples) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Fechas de prescripción</p>
              <button
                onClick={() => setDraft({ ...draft, fechasPrescripcionExtra: [...(draft.fechasPrescripcionExtra || []), { fecha: "", label: "" }] })}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
              >
                <Plus className="w-3 h-3" /> Prescripción
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-muted/40 rounded-md p-2">
                <Input value="Principal" disabled className="flex-1 h-8 text-xs" />
                <Input
                  type="date"
                  value={draft.fechaPrescripcion}
                  onChange={(e) => setDraft({ ...draft, fechaPrescripcion: e.target.value })}
                  className={`h-8 text-xs w-44 ${getProximityColor(draft.fechaPrescripcion)}`}
                />
                <span className="w-7" />
              </div>
              {(draft.fechasPrescripcionExtra || []).map((fp, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-md p-2">
                  <Input
                    value={fp.label || ""}
                    onChange={(e) => {
                      const arr = [...(draft.fechasPrescripcionExtra || [])];
                      arr[i] = { ...arr[i], label: e.target.value };
                      setDraft({ ...draft, fechasPrescripcionExtra: arr });
                    }}
                    placeholder="Etiqueta (imputado, hecho…)"
                    className="flex-1 h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={fp.fecha}
                    onChange={(e) => {
                      const arr = [...(draft.fechasPrescripcionExtra || [])];
                      arr[i] = { ...arr[i], fecha: e.target.value };
                      setDraft({ ...draft, fechasPrescripcionExtra: arr });
                    }}
                    className={`h-8 text-xs w-44 ${fp.fecha ? getProximityColor(fp.fecha) : ""}`}
                  />
                  <button
                    onClick={() => setDraft({ ...draft, fechasPrescripcionExtra: (draft.fechasPrescripcionExtra || []).filter((_, j) => j !== i) })}
                    className="text-alert-urgent/60 hover:text-alert-urgent p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Juicio */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Juicio fijado</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={draft.juicioFijado?.fecha || ""}
                onChange={(e) => setDraft({ ...draft, juicioFijado: e.target.value ? { fecha: e.target.value, hora: draft.juicioFijado?.hora || "09:00" } : undefined })}
                className="h-8"
              />
              <Input
                type="time"
                value={draft.juicioFijado?.hora || ""}
                onChange={(e) => draft.juicioFijado && setDraft({ ...draft, juicioFijado: { ...draft.juicioFijado, hora: e.target.value } })}
                disabled={!draft.juicioFijado}
                className="h-8"
              />
            </div>
          </div>

          <Separator />

          {/* Audiencias */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Audiencias (vinculadas al calendario)</p>
              <button onClick={addAudiencia} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80">
                <Plus className="w-3 h-3" /> Audiencia
              </button>
            </div>
            <div className="space-y-2">
              {(draft.audiencias || []).map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-md p-2">
                  <Input value={a.tipo} onChange={(e) => updateAudiencia(i, { tipo: e.target.value })} placeholder="Tipo (Cesura, Art. 454...)" className="flex-1 h-8 text-xs" />
                  <Input type="date" value={a.fecha} onChange={(e) => updateAudiencia(i, { fecha: e.target.value })} className={`h-8 text-xs w-36 ${a.fecha ? getProximityColor(a.fecha) : ""}`} />
                  <Input type="time" value={a.hora} onChange={(e) => updateAudiencia(i, { hora: e.target.value })} className="h-8 text-xs w-24" />
                  <button onClick={() => removeAudiencia(i)} className="text-alert-urgent/60 hover:text-alert-urgent p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Anotaciones */}
          <Labeled label="Anotaciones">
            <textarea
              value={draft.anotaciones || ""}
              onChange={(e) => setDraft({ ...draft, anotaciones: e.target.value })}
              placeholder="Escribí anotaciones sobre la causa..."
              className="w-full bg-muted/50 border border-border rounded-md p-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-y min-h-[60px]"
            />
          </Labeled>

          <Separator />

          {/* Agenda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Agenda (vinculada al calendario)</p>
              <button onClick={addAgenda} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80">
                <Plus className="w-3 h-3" /> Item
              </button>
            </div>
            <div className="space-y-2">
              {(draft.agenda || []).map((ag, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-md p-2">
                  <Input value={ag.texto} onChange={(e) => updateAgenda(i, { texto: e.target.value })} placeholder="Texto del evento" className="flex-1 h-8 text-xs" />
                  <Input type="date" value={ag.fecha} onChange={(e) => updateAgenda(i, { fecha: e.target.value })} className={`h-8 text-xs w-36 ${ag.fecha ? getProximityColor(ag.fecha) : ""}`} />
                  <button onClick={() => removeAgenda(i)} className="text-alert-urgent/60 hover:text-alert-urgent p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <Labeled label="Notas">
            <textarea
              value={draft.notas || ""}
              onChange={(e) => setDraft({ ...draft, notas: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-md p-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary resize-y min-h-[50px]"
            />
          </Labeled>

          <div className="flex items-center gap-2 pt-2">
            {onDelete && (
              <button
                onClick={() => { if (confirm("¿Eliminar causa?")) { onDelete(draft.id); onClose(); } }}
                className="px-3 py-2.5 bg-alert-urgent/15 text-alert-urgent rounded-md text-sm font-semibold hover:bg-alert-urgent/25"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {onUpdate && (
              <button
                onClick={save}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar cambios
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  );
}
