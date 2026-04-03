import { Scale, Users, AlertTriangle, Shield } from "lucide-react";
import { mockCausas } from "@/data/mockCausas";

interface Props {
  onSelect: (vocalia: number) => void;
}

function getStats(vocalia: number) {
  const causas = mockCausas.filter((c) => c.vocalia === vocalia);
  const detenidos = causas.flatMap((c) => c.imputados).filter((i) => i.estadoLibertad === "Detenido").length;
  const rebeldes = causas.flatMap((c) => c.imputados).filter((i) => i.estadoLibertad === "Rebelde").length;
  return { total: causas.length, detenidos, rebeldes };
}

export default function VocaliaSelector({ onSelect }: Props) {
  const vocalias = [1, 2, 3];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">JusTrack</h1>
          </div>
          <p className="text-muted-foreground text-lg">Sistema de gestión de causas penales — TOCC 26</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vocalias.map((v) => {
            const stats = getStats(v);
            return (
              <button
                key={v}
                onClick={() => onSelect(v)}
                className="glass-card rounded-xl p-8 text-left transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <Scale className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-1">Vocalía {v}</h2>
                <p className="text-muted-foreground text-sm mb-6">Listado de causas y seguimiento</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">{stats.total}</span>
                    <span className="text-muted-foreground">causas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-alert-urgent" />
                    <span className="text-foreground font-medium">{stats.detenidos}</span>
                    <span className="text-muted-foreground">detenidos</span>
                  </div>
                  {stats.rebeldes > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-alert-warning" />
                      <span className="text-foreground font-medium">{stats.rebeldes}</span>
                      <span className="text-muted-foreground">rebeldes</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
