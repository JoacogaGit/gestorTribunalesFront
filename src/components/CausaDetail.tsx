import { useState } from "react";
import { Causa, getCaratula, getProximityColor, EstadoLibertad, EstadoCausa, AgendaItem } from "@/data/mockCausas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";

const libertadBadge: Record<string, string> = {
  Detenido: "bg-alert-urgent/15 text-alert-urgent",
  Excarcelado: "bg-alert-ok/15 text-alert-ok",
  Rebelde: "bg-alert-warning/15 text-alert-warning",
  SJP: "bg-alert-info/15 text-alert-info",
};

const estadosLibertad: EstadoLibertad[] = ["Detenido", "Excarcelado", "Rebelde", "SJP"];
const estadosCausa: EstadoCausa[] = ["En trámite", "En juicio", "Terminada", "Queja en Corte", "Casación", "REX"];

interface Props {
  causa: Causa;
  onClose: () => void;
  onUpdate?: (causa: Causa) => void;
}

export default function CausaDetail({ causa, onClose, onUpdate }: Props) {
  const [draft, setDraft] = useState<Causa>({ ...causa, imputados: causa.imputados.map((i) => ({ ...i })), agenda: causa.agenda ? [...causa.agenda.map((a) => ({ ...a }))] : [] });
  const [newAgendaTexto, setNewAgendaTexto] = useState("");
  const [newAgendaFecha, setNewAgendaFecha] = useState("");

  const save = () => {
    onUpdate?.(draft);
    onClose();
  };

  const setImputadoLibertad = (idx: number, val: EstadoLibertad) => {
    const imps = [...draft.imputados];
    imps[idx] = { ...imps[idx], estadoLibertad: val };
    if (val !== "Detenido") imps[idx].lugarDetencion = undefined;
    setDraft({ ...draft, imputados: imps });
  };

  const addAgendaItem = () => {
    if (!newAgendaTexto.trim() || !newAgendaFecha) return;
    const agenda = [...(draft.agenda || []), { texto: newAgendaTexto.trim(), fecha: newAgendaFecha }];
    setDraft({ ...draft, agenda });
    setNewAgendaTexto("");
    setNewAgendaFecha("");
  };

  const removeAgendaItem = (idx: number) => {
    const agenda = (draft.agenda || []).filter((_, i) => i !== idx);
    setDraft({ ...draft, agenda });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Causa N° {draft.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-1">{getCaratula(draft)}</h4>
            <p className="text-muted-foreground">{draft.delito}</p>
          </div>

          <Separator />

          {/* Estado de la causa */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Estado de la Causa</p>
            <Select value={draft.estadoCausa} onValueChange={(v) => setDraft({ ...draft, estadoCausa: v as EstadoCausa })}>
              <SelectTrigger className="w-full bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {estadosCausa.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Imputados */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Imputados ({draft.imputados.length})</p>
            <div className="space-y-2">
              {draft.imputados.map((imp, i) => (
                <div key={i} className="bg-muted/40 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-foreground font-medium flex-1">{imp.nombre}</span>
                    <Select value={imp.estadoLibertad} onValueChange={(v) => setImputadoLibertad(i, v as EstadoLibertad)}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {estadosLibertad.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {imp.lugarDetencion && (
                    <p className="text-xs text-alert-urgent">📍 {imp.lugarDetencion}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {imp.defensor.nombre} ({imp.defensor.tipo}) — {imp.defensor.contacto}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio" value={fmt(draft.fechaInicio)} />
            {draft.fechaElevacion && <Field label="Elevación" value={fmt(draft.fechaElevacion)} />}
            {draft.fechaRadicacion && <Field label="Radicación" value={fmt(draft.fechaRadicacion)} />}
            <FieldColored label="Prescripción" value={fmt(draft.fechaPrescripcion)} fecha={draft.fechaPrescripcion} />
            {draft.fechaVencimientoPP && <FieldColored label="Vto. PP" value={fmt(draft.fechaVencimientoPP)} fecha={draft.fechaVencimientoPP} />}
            {draft.probation && <FieldColored label="Vto. Probation" value={fmt(draft.probation.vencimiento)} fecha={draft.probation.vencimiento} />}
          </div>

          {draft.juicioFijado && (
            <div className="bg-alert-info/10 rounded-md p-3">
              <p className="text-xs font-semibold text-alert-info">Juicio fijado</p>
              <p className="text-foreground font-medium">{fmt(draft.juicioFijado.fecha)} — {draft.juicioFijado.hora} hs</p>
            </div>
          )}

          {draft.audiencias && draft.audiencias.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Audiencias</p>
              <div className="space-y-1">
                {draft.audiencias.map((a, i) => (
                  <div key={i} className="bg-accent/10 rounded-md px-3 py-2 text-xs">
                    <span className="font-semibold text-accent">{a.tipo}</span>
                    <span className="text-muted-foreground ml-2">{fmt(a.fecha)} {a.hora} hs</span>
                    {a.notas && <p className="text-muted-foreground mt-0.5 italic">{a.notas}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {draft.causasConexas && draft.causasConexas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Causas conexas</p>
              <div className="flex gap-1">
                {draft.causasConexas.map((n) => (
                  <Badge key={n} variant="outline">{n}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Anotaciones */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Anotaciones</p>
            <textarea
              value={draft.anotaciones || ""}
              onChange={(e) => setDraft({ ...draft, anotaciones: e.target.value })}
              placeholder="Escribí anotaciones sobre la causa..."
              className="w-full bg-muted/50 border border-border rounded-md p-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-y min-h-[60px]"
            />
          </div>

          <Separator />

          {/* Agenda */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Agenda (vinculada al calendario)</p>
            {(draft.agenda || []).length > 0 && (
              <div className="space-y-1 mb-2">
                {(draft.agenda || []).map((ag, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-1.5 text-xs">
                    <span className="flex-1 text-foreground">{ag.texto}</span>
                    <span className="text-muted-foreground shrink-0">{fmt(ag.fecha)}</span>
                    <button onClick={() => removeAgendaItem(i)} className="text-alert-urgent/60 hover:text-alert-urgent p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newAgendaTexto}
                onChange={(e) => setNewAgendaTexto(e.target.value)}
                placeholder="Texto del evento..."
                className="flex-1 bg-muted/50 border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="date"
                value={newAgendaFecha}
                onChange={(e) => setNewAgendaFecha(e.target.value)}
                className="bg-muted/50 border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={addAgendaItem} className="p-1.5 bg-primary/20 rounded-md text-primary hover:bg-primary/30">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <Separator />

          {/* Notas legado */}
          {draft.notas && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Notas</p>
              <p className="text-sm text-foreground">{draft.notas}</p>
            </div>
          )}

          {/* Save button */}
          {onUpdate && (
            <button
              onClick={save}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              Guardar cambios
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function FieldColored({ label, value, fecha }: { label: string; value: string; fecha: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className={getProximityColor(fecha)}>{value}</p>
    </div>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}
