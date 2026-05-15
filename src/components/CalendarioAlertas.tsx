import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Search, Clock, AlertTriangle, Calendar as CalIcon, FileCheck, X, RefreshCw, Inbox, Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCalendarioEventos } from "@/hooks/useCalendarioEventos";
import { CalendarEvento, CalendarTipo, CALENDAR_TIPO_LABEL, getSemaforoBg, getSemaforoDot } from "@/lib/eventoMapper";
import RefreshButton from "@/components/RefreshButton";

const tipoIcons: Record<CalendarTipo, typeof Clock> = {
  evento: CalIcon,
  vencimiento_pp: Clock,
  vencimiento_pena: FileCheck,
  prescripcion: AlertTriangle,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}

function eventoKey(e: CalendarEvento) {
  return `${e.causaId}|${e.tipo}|${e.fecha}|${e.titulo}`;
}

const STORAGE_KEY = "calendario-dismissed-v2";
const FILTER_KEY = "calendario-tipos-ocultos-v2";
const TIPOS: CalendarTipo[] = ["evento", "vencimiento_pp", "vencimiento_pena", "prescripcion"];

export default function CalendarioAlertas({ vocaliaId }: { vocaliaId: string | null }) {
  const { eventos, loading, error, refetch } = useCalendarioEventos(vocaliaId);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
  });
  const [hiddenTipos, setHiddenTipos] = useState<Set<CalendarTipo>>(() => {
    try { return new Set<CalendarTipo>(JSON.parse(localStorage.getItem(FILTER_KEY) || "[]")); } catch { return new Set(); }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed])); }, [dismissed]);
  useEffect(() => { localStorage.setItem(FILTER_KEY, JSON.stringify([...hiddenTipos])); }, [hiddenTipos]);

  const visibles = useMemo(() => eventos
    .filter((e) => !dismissed.has(eventoKey(e)))
    .filter((e) => !hiddenTipos.has(e.tipo)),
    [eventos, dismissed, hiddenTipos]);

  const dismiss = (e: CalendarEvento) => setDismissed((prev) => new Set(prev).add(eventoKey(e)));
  const restoreAll = () => setDismissed(new Set());
  const toggleTipo = (t: CalendarTipo) => setHiddenTipos((prev) => {
    const next = new Set(prev);
    if (next.has(t)) next.delete(t); else next.add(t);
    return next;
  });

  const matchesSearch = (e: CalendarEvento) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.causaNumero.toLowerCase().includes(q) ||
      e.causaCaratula.toLowerCase().includes(q) ||
      e.titulo.toLowerCase().includes(q) ||
      (e.descripcion ?? "").toLowerCase().includes(q)
    );
  };

  const matchesDate = (e: CalendarEvento) =>
    !selectedDate || new Date(e.fecha).toDateString() === selectedDate.toDateString();

  const now = Date.now();
  const futuros = visibles.filter((e) => new Date(e.fecha).getTime() >= now && matchesSearch(e) && matchesDate(e));
  const pasados = visibles.filter((e) => new Date(e.fecha).getTime() < now && matchesSearch(e) && matchesDate(e))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const eventDates = new Set(visibles.map((e) => new Date(e.fecha).toDateString()));

  const renderEvento = (e: CalendarEvento, i: number, isPast = false) => {
    const Icon = tipoIcons[e.tipo] ?? Scale;
    return (
      <div
        key={e.id + i}
        className={`rounded-md p-3 border-l-4 flex items-center gap-3 ${getSemaforoBg(e.fecha)} ${isPast ? "opacity-70" : ""}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getSemaforoDot(e.fecha)}`} />
        <Icon className="w-4 h-4 shrink-0 text-foreground/70" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate">{e.titulo}</span>
            {e.hora && <span className="text-[10px] text-muted-foreground">{e.hora} hs</span>}
            {isPast && <span className="text-[10px] font-bold text-alert-urgent">VENCIDO</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {e.causaNumero} — {e.causaCaratula}
            {e.descripcion ? ` — ${e.descripcion}` : ""}
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">{fmtDate(e.fecha)}</span>
        <button
          onClick={() => dismiss(e)}
          className="p-1 text-muted-foreground hover:text-alert-urgent transition-colors shrink-0"
          title="Descartar alerta"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar el calendario</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-xs">{error}</span>
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        {/* Left column */}
        <div className="shrink-0 w-[320px] space-y-4">
          <div className="glass-card rounded-lg p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="pointer-events-auto"
              modifiers={{ hasEvent: (date) => eventDates.has(date.toDateString()) }}
              modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold text-primary" }}
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(undefined)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                Mostrar todos
              </button>
            )}
          </div>

          <div className="glass-card rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">
              Tipos de fecha
            </h3>
            {TIPOS.map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
                <Checkbox
                  checked={!hiddenTipos.has(t)}
                  onCheckedChange={() => toggleTipo(t)}
                />
                <span className={`w-2 h-2 rounded-full ${
                  t === "evento" ? "bg-primary" :
                  t === "vencimiento_pp" ? "bg-alert-warning" :
                  t === "vencimiento_pena" ? "bg-alert-info" :
                  "bg-alert-urgent"
                }`} />
                {CALENDAR_TIPO_LABEL[t]}
              </label>
            ))}
          </div>

          <div className="glass-card rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">
                Eventos pasados
                <span className="font-normal ml-1.5">({pasados.length})</span>
              </h3>
              {dismissed.size > 0 && (
                <button onClick={restoreAll} className="text-[10px] text-primary hover:underline">
                  Restaurar descartadas ({dismissed.size})
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {pasados.map((e, i) => renderEvento(e, i, true))}
              {pasados.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Sin eventos pasados</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Próximos Eventos
              <span className="text-muted-foreground font-normal text-sm ml-2">({futuros.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-9 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary w-48"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {futuros.map((e, i) => renderEvento(e, i, false))}
            {futuros.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                  <Inbox className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {search || selectedDate || hiddenTipos.size > 0
                    ? "Sin resultados con los filtros actuales"
                    : "No hay eventos en los próximos 30 días"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
