import { useState, useEffect } from "react";
import { Causa, getAllEventos, getProximityBg, getProximityDot, getCaratula, Evento } from "@/data/mockCausas";
import { Calendar } from "@/components/ui/calendar";
import { Search, Scale, Clock, AlertTriangle, Gavel, Calendar as CalIcon, FileCheck, BookOpen, X } from "lucide-react";

const tipoIcons: Record<string, typeof Clock> = {
  Juicio: Gavel,
  Prescripción: AlertTriangle,
  "Vto. PP": Clock,
  Audiencia: CalIcon,
  "Vto. Probation": FileCheck,
  Agenda: BookOpen,
  "Vto. Pena": Clock,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}

function eventoKey(e: Evento) {
  return `${e.causa.id}|${e.tipo}|${e.fecha}|${e.descripcion}`;
}

const STORAGE_KEY = "calendario-dismissed";

export default function CalendarioAlertas({ causas }: { causas: Causa[] }) {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  }, [dismissed]);

  const dismiss = (e: Evento) => {
    const next = new Set(dismissed);
    next.add(eventoKey(e));
    setDismissed(next);
  };

  const restoreAll = () => setDismissed(new Set());

  const allEventos = getAllEventos(causas).filter((e) => !dismissed.has(eventoKey(e)));

  const matchesSearch = (e: Evento) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.causa.numero.toLowerCase().includes(q) ||
      getCaratula(e.causa).toLowerCase().includes(q) ||
      e.tipo.toLowerCase().includes(q) ||
      e.descripcion.toLowerCase().includes(q)
    );
  };

  const matchesDate = (e: Evento) =>
    !selectedDate || new Date(e.fecha).toDateString() === selectedDate.toDateString();

  const now = Date.now();
  const futuros = allEventos.filter((e) => new Date(e.fecha).getTime() >= now && matchesSearch(e) && matchesDate(e));
  const pasados = allEventos.filter((e) => new Date(e.fecha).getTime() < now && matchesSearch(e) && matchesDate(e))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const eventDates = new Set(allEventos.map((e) => new Date(e.fecha).toDateString()));

  const renderEvento = (e: Evento, i: number, isPast = false) => {
    const Icon = tipoIcons[e.tipo] || Scale;
    return (
      <div
        key={i}
        className={`rounded-md p-3 border-l-4 flex items-center gap-3 ${getProximityBg(e.fecha)} ${isPast ? "opacity-70" : ""}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getProximityDot(e.fecha)}`} />
        <Icon className="w-4 h-4 shrink-0 text-foreground/70" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{e.tipo}</span>
            {e.hora && <span className="text-[10px] text-muted-foreground">{e.hora} hs</span>}
            {isPast && <span className="text-[10px] font-bold text-alert-urgent">VENCIDO</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {e.causa.numero} — {getCaratula(e.causa)}
            {(e.tipo === "Agenda" || e.tipo === "Audiencia") && ` — ${e.descripcion}`}
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

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        {/* Left column: Calendar + Past Events */}
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

          {/* Past events panel */}
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

        {/* Right column: Upcoming events */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Próximos Eventos
              <span className="text-muted-foreground font-normal text-sm ml-2">({futuros.length})</span>
            </h2>
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

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {futuros.map((e, i) => renderEvento(e, i, false))}
            {futuros.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {search || selectedDate ? "Sin resultados" : "Sin eventos próximos"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
