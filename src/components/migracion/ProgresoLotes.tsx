import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle, Trash2, RotateCcw, ArrowRight, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MIN_FILAS_LOTE } from "@/lib/dividirEnLotes";

export type EstadoLote = "pendiente" | "procesando" | "ok" | "error";
export interface LoteTrabajoVM {
  id: string;
  pestana: string;
  nro_lote: number;
  total_lotes: number;
  filas: number;
  estado: EstadoLote;
  errorCode?: string;
  errorMsg?: string;
}

interface Props {
  lotes: LoteTrabajoVM[];
  procesando: boolean;
  filename: string;
  completos: number;
  fallidos: number;
  onDescartar: () => void;
  onReintentar: () => void;
  onContinuar: () => void;
  labelError: (code?: string) => string;
}

const MENSAJES = [
  "Leyendo tus causas...",
  "Interpretando datos procesales...",
  "Identificando imputados y situaciones...",
  "Detectando fechas importantes...",
  "Organizando expedientes...",
  "Casi listo...",
];

function fmtTiempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function estadoPestana(lts: LoteTrabajoVM[]): EstadoLote {
  if (lts.some((l) => l.estado === "procesando")) return "procesando";
  const ok = lts.filter((l) => l.estado === "ok").length;
  const err = lts.filter((l) => l.estado === "error").length;
  if (ok + err === lts.length) return err > 0 ? "error" : "ok";
  return "pendiente";
}

export default function ProgresoLotes({
  lotes, procesando, filename, completos, fallidos,
  onDescartar, onReintentar, onContinuar, labelError,
}: Props) {
  const total = lotes.length;
  const procesados = completos + fallidos;
  const pct = total > 0 ? Math.round((procesados / total) * 100) : 0;
  const enCurso = lotes.find((l) => l.estado === "procesando");
  const terminado = !procesando;
  const todoOk = terminado && fallidos === 0 && completos > 0;

  // Tiempo transcurrido
  const [tInicio] = useState(() => Date.now());
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    if (terminado) return;
    const i = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(i);
  }, [terminado]);
  const segundos = Math.floor((ahora - tInicio) / 1000);

  // Mensaje rotativo
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    if (terminado) return;
    const i = setInterval(() => setMsgIdx((x) => (x + 1) % MENSAJES.length), 3500);
    return () => clearInterval(i);
  }, [terminado]);

  const porPestana = useMemo(() => {
    return lotes.reduce<Record<string, LoteTrabajoVM[]>>((acc, l) => {
      (acc[l.pestana] ??= []).push(l);
      return acc;
    }, {});
  }, [lotes]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Encabezado con icono y estado */}
        <div className="text-center mb-6 animate-fade-in">
          <div className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 border transition-all",
            todoOk
              ? "bg-alert-ok/10 border-alert-ok/30 shadow-[0_0_24px_hsl(var(--alert-ok)/0.25)]"
              : "bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20",
          )}>
            {todoOk ? (
              <CheckCircle2 className="w-8 h-8 text-alert-ok animate-scale-in" />
            ) : terminado ? (
              <AlertTriangle className="w-7 h-7 text-alert-warning" />
            ) : (
              <Sparkles className="w-7 h-7 text-accent animate-pulse" />
            )}
          </div>
          <h2 className="font-display text-2xl font-bold mb-1">
            {todoOk ? "¡Migración procesada!" : terminado ? "Procesamiento terminado" : "Procesando tu archivo"}
          </h2>
          {filename && (
            <p className="text-xs font-mono text-muted-foreground truncate">{filename}</p>
          )}
        </div>

        {/* Barra de progreso general */}
        <Card className="p-4 mb-4 elevated-card">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">
              {terminado
                ? `${completos} de ${total} lotes completados${fallidos > 0 ? ` · ${fallidos} con error` : ""}`
                : `Procesando ${procesados + 1 > total ? total : procesados + 1} de ${total} lotes...`}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Tiempo transcurrido: <span className="font-mono">{fmtTiempo(segundos)}</span>
            </span>
            {!terminado && (
              <span key={msgIdx} className="italic text-accent/90 animate-fade-in truncate ml-2">
                {MENSAJES[msgIdx]}
              </span>
            )}
          </div>
        </Card>

        {!terminado && (
          <p className="text-[11px] text-center text-muted-foreground mb-3">
            Tu progreso se guarda automáticamente. Si cerrás esta pestaña, vas a poder retomarlo.
          </p>
        )}

        {/* Cards por pestaña */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
          {Object.entries(porPestana).map(([pestana, lts]) => {
            const okPest = lts.filter((l) => l.estado === "ok").length;
            const errPest = lts.filter((l) => l.estado === "error").length;
            const est = estadoPestana(lts);
            const activa = est === "procesando";
            return (
              <Card
                key={pestana}
                className={cn(
                  "p-3.5 transition-all",
                  activa && "border-accent/60 shadow-[0_0_0_3px_hsl(var(--accent)/0.12)] animate-pulse-alert",
                  est === "ok" && "border-alert-ok/40",
                  est === "error" && "border-alert-urgent/40",
                )}
              >
                <div className="flex items-center justify-between mb-2.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {est === "ok" && <CheckCircle2 className="w-4 h-4 text-alert-ok shrink-0" />}
                    {est === "procesando" && <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />}
                    {est === "error" && <XCircle className="w-4 h-4 text-alert-urgent shrink-0" />}
                    {est === "pendiente" && <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />}
                    <p className="text-sm font-semibold truncate">{pestana}</p>
                  </div>
                  <Badge
                    variant={est === "error" ? "destructive" : est === "ok" ? "secondary" : "outline"}
                    className="text-[10px] shrink-0"
                  >
                    {okPest}/{lts.length}{errPest > 0 ? ` · ${errPest} err` : ""}
                  </Badge>
                </div>

                {/* Bullets por lote */}
                <div className="flex flex-wrap gap-1.5">
                  {lts.map((l) => (
                    <div
                      key={l.id}
                      title={`Lote ${l.nro_lote}/${l.total_lotes} · ${l.filas} filas${l.estado === "error" ? ` · ${labelError(l.errorCode)}` : ""}`}
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                        l.estado === "pendiente" && "bg-muted/60 border-border",
                        l.estado === "procesando" && "bg-accent/15 border-accent text-accent animate-pulse",
                        l.estado === "ok" && "bg-alert-ok/15 border-alert-ok/40 text-alert-ok",
                        l.estado === "error" && "bg-alert-urgent/15 border-alert-urgent/40 text-alert-urgent",
                      )}
                    >
                      {l.estado === "ok" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {l.estado === "error" && <XCircle className="w-3.5 h-3.5" />}
                      {l.estado === "procesando" && <Loader2 className="w-3 h-3 animate-spin" />}
                      {l.estado === "pendiente" && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
                    </div>
                  ))}
                </div>

                {/* Errores por lote */}
                {errPest > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-1">
                    {lts.filter((l) => l.estado === "error").map((l) => (
                      <p key={l.id} className="text-[11px] text-alert-urgent">
                        <span className="font-mono">Lote {l.nro_lote}/{l.total_lotes}</span>: {labelError(l.errorCode)}
                        {l.errorMsg && l.errorMsg !== l.errorCode ? ` — ${l.errorMsg}` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Banner de fallidos */}
        {terminado && fallidos > 0 && (
          <Alert className="mt-4 border-alert-urgent/30 bg-alert-urgent/5">
            <AlertTriangle className="w-4 h-4 text-alert-urgent" />
            <AlertTitle className="text-alert-urgent">
              {fallidos} {fallidos === 1 ? "lote falló" : "lotes fallaron"}
            </AlertTitle>
            <AlertDescription className="text-xs">
              Podés reintentar solo los lotes con error. Los que tuvieron timeout o exceso de recursos
              se van a dividir automáticamente en mitades (mínimo {MIN_FILAS_LOTE} filas por lote),
              o seguí adelante con los {completos} que sí se procesaron.
            </AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        {terminado && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onDescartar}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Descartar
            </Button>
            {fallidos > 0 && (
              <Button variant="default" onClick={onReintentar} className="bg-alert-urgent hover:bg-alert-urgent/90 text-alert-urgent-foreground">
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reintentar fallidos ({fallidos})
              </Button>
            )}
            {completos > 0 && (
              <Button onClick={onContinuar}>
                Continuar a revisión <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        )}

        {/* Mensaje de éxito breve antes de pasar a revisión: la revisión se monta cuando setResultado se llama */}
        {todoOk && (
          <p className="text-center text-sm text-alert-ok mt-4 animate-fade-in">
            Listo. Llevándote a la revisión...
          </p>
        )}

        {enCurso && !terminado && (
          <p className="text-center text-[11px] text-muted-foreground mt-3 animate-fade-in">
            Lote {enCurso.nro_lote}/{enCurso.total_lotes} de "{enCurso.pestana}" · {enCurso.filas} filas
          </p>
        )}
      </div>
    </div>
  );
}
