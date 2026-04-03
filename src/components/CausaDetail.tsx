import { Causa, getCaratula, getProximityColor } from "@/data/mockCausas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const libertadBadge: Record<string, string> = {
  Detenido: "bg-alert-urgent/15 text-alert-urgent",
  Excarcelado: "bg-alert-ok/15 text-alert-ok",
  Rebelde: "bg-alert-warning/15 text-alert-warning",
  SJP: "bg-alert-info/15 text-alert-info",
};

export default function CausaDetail({ causa, onClose }: { causa: Causa; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Causa N° {causa.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-1">{getCaratula(causa)}</h4>
            <p className="text-muted-foreground">{causa.delito}</p>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Imputados ({causa.imputados.length})</p>
            <div className="space-y-2">
              {causa.imputados.map((imp, i) => (
                <div key={i} className="bg-muted/40 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-foreground font-medium">{imp.nombre}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${libertadBadge[imp.estadoLibertad]}`}>
                      {imp.estadoLibertad}
                    </span>
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
            <Field label="Estado" value={causa.estadoCausa} />
            <Field label="Vocalía" value={`Vocalía ${causa.vocalia}`} />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio" value={fmt(causa.fechaInicio)} />
            {causa.fechaElevacion && <Field label="Elevación" value={fmt(causa.fechaElevacion)} />}
            {causa.fechaRadicacion && <Field label="Radicación" value={fmt(causa.fechaRadicacion)} />}
            <FieldColored label="Prescripción" value={fmt(causa.fechaPrescripcion)} fecha={causa.fechaPrescripcion} />
            {causa.fechaVencimientoPP && <FieldColored label="Vto. PP" value={fmt(causa.fechaVencimientoPP)} fecha={causa.fechaVencimientoPP} />}
            {causa.probation && <FieldColored label="Vto. Probation" value={fmt(causa.probation.vencimiento)} fecha={causa.probation.vencimiento} />}
          </div>

          {causa.juicioFijado && (
            <div className="bg-alert-info/10 rounded-md p-3">
              <p className="text-xs font-semibold text-alert-info">Juicio fijado</p>
              <p className="text-foreground font-medium">{fmt(causa.juicioFijado.fecha)} — {causa.juicioFijado.hora} hs</p>
            </div>
          )}

          {causa.audiencias && causa.audiencias.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Audiencias</p>
              <div className="space-y-1">
                {causa.audiencias.map((a, i) => (
                  <div key={i} className="bg-accent/10 rounded-md px-3 py-2 text-xs">
                    <span className="font-semibold text-accent">{a.tipo}</span>
                    <span className="text-muted-foreground ml-2">{fmt(a.fecha)} {a.hora} hs</span>
                    {a.notas && <p className="text-muted-foreground mt-0.5 italic">{a.notas}</p>}
                  </div>
                ))}
              </div>
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
            <div className="bg-muted/50 rounded-md p-3">
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
