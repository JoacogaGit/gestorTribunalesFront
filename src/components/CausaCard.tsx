import { Causa, getAlertSeverity } from "@/data/mockCausas";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Calendar, Link2, FileText } from "lucide-react";

const libertadColors: Record<string, string> = {
  Detenido: "bg-alert-urgent/15 text-alert-urgent border-alert-urgent/30",
  Excarcelado: "bg-alert-ok/15 text-alert-ok border-alert-ok/30",
  Rebelde: "bg-alert-warning/15 text-alert-warning border-alert-warning/30",
  SJP: "bg-alert-info/15 text-alert-info border-alert-info/30",
};

export default function CausaCard({ causa, onClick }: { causa: Causa; onClick?: () => void }) {
  const ppLevel = causa.fechaVencimientoPP ? getAlertSeverity(causa.fechaVencimientoPP) : null;

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-lg p-4 text-left w-full hover:shadow-md transition-all hover:border-primary/40 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-semibold text-primary">{causa.numero}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${libertadColors[causa.estadoLibertad]}`}>
          {causa.estadoLibertad}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
        {causa.caratula}
      </h4>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{causa.delito}</p>

      {causa.lugarDetencion && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <MapPin className="w-3 h-3" />
          <span>{causa.lugarDetencion}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <User className="w-3 h-3" />
        <span>{causa.defensor.nombre} ({causa.defensor.tipo})</span>
      </div>

      {causa.juicioFijado && (
        <div className="flex items-center gap-1.5 text-xs text-alert-info mt-2">
          <Calendar className="w-3 h-3" />
          <span className="font-medium">
            Juicio: {new Date(causa.juicioFijado.fecha).toLocaleDateString("es-AR")} {causa.juicioFijado.hora}
          </span>
        </div>
      )}

      {ppLevel && ppLevel !== "ok" && (
        <div className={`flex items-center gap-1.5 text-xs mt-1 ${ppLevel === "critical" || ppLevel === "urgent" ? "text-alert-urgent animate-pulse-alert" : "text-alert-warning"}`}>
          <FileText className="w-3 h-3" />
          <span className="font-medium">PP vence: {new Date(causa.fechaVencimientoPP!).toLocaleDateString("es-AR")}</span>
        </div>
      )}

      {causa.causasConexas && causa.causasConexas.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <Link2 className="w-3 h-3" />
          <span>Conexa: {causa.causasConexas.join(", ")}</span>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Badge variant="secondary" className="text-[10px]">{causa.vocalia}</Badge>
        <Badge variant="outline" className="text-[10px]">{causa.secretaria}</Badge>
      </div>

      {causa.notas && (
        <p className="text-[11px] text-muted-foreground mt-2 italic border-t border-border/50 pt-2">
          {causa.notas}
        </p>
      )}
    </button>
  );
}
