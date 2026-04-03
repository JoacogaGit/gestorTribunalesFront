import { Causa } from "@/data/mockCausas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function CausaDetail({ causa, onClose }: { causa: Causa; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Causa N° {causa.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-1">{causa.caratula}</h4>
            <p className="text-muted-foreground">{causa.delito}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado" value={causa.estadoCausa} />
            <Field label="Libertad" value={causa.estadoLibertad} />
            {causa.lugarDetencion && <Field label="Lugar detención" value={causa.lugarDetencion} />}
            <Field label="Vocalía" value={causa.vocalia} />
            <Field label="Secretaría" value={causa.secretaria} />
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Imputados</p>
            <div className="flex flex-wrap gap-1">
              {causa.imputados.map((i) => (
                <Badge key={i} variant="secondary">{i}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Defensa</p>
            <p className="text-foreground">{causa.defensor.nombre} <span className="text-muted-foreground">({causa.defensor.tipo})</span></p>
            <p className="text-muted-foreground">{causa.defensor.contacto}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio" value={fmt(causa.fechaInicio)} />
            {causa.fechaElevacion && <Field label="Elevación" value={fmt(causa.fechaElevacion)} />}
            {causa.fechaRadicacion && <Field label="Radicación" value={fmt(causa.fechaRadicacion)} />}
            <Field label="Prescripción" value={fmt(causa.fechaPrescripcion)} />
            {causa.fechaVencimientoPP && <Field label="Vto. PP" value={fmt(causa.fechaVencimientoPP)} />}
            {causa.probation && <Field label="Vto. Probation" value={fmt(causa.probation.vencimiento)} />}
          </div>

          {causa.juicioFijado && (
            <div className="bg-alert-info/10 rounded-md p-3">
              <p className="text-xs font-semibold text-alert-info">Juicio fijado</p>
              <p className="text-foreground font-medium">{fmt(causa.juicioFijado.fecha)} — {causa.juicioFijado.hora} hs</p>
            </div>
          )}

          {causa.causasConexas && causa.causasConexas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Causas conexas</p>
              <div className="flex gap-1">
                {causa.causasConexas.map((n) => (
                  <Badge key={n} variant="outline">{n}</Badge>
                ))}
              </div>
            </div>
          )}

          {causa.notas && (
            <div className="bg-surface-sunken rounded-md p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Notas</p>
              <p className="text-sm text-foreground">{causa.notas}</p>
            </div>
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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}
