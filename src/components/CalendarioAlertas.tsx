import { useState } from "react";
import { Causa, getAllEventos, getProximityBg, getProximityDot, getCaratula } from "@/data/mockCausas";
import { Calendar } from "@/components/ui/calendar";
import { Search, Scale, Clock, AlertTriangle, Gavel, Calendar as CalIcon, FileCheck, BookOpen } from "lucide-react";

const tipoIcons: Record<string, typeof Clock> = {
  Juicio: Gavel,
  Prescripción: AlertTriangle,
  "Vto. PP": Clock,
  Audiencia: CalIcon,
  "Vto. Probation": FileCheck,
  Agenda: BookOpen,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR");
}

export default function CalendarioAlertas({ causas }: { causas: Causa[] }) {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const allEventos = getAllEventos(causas);

  // Search filter
  const filtered = allEventos.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.causa.numero.toLowerCase().includes(q) ||
      getCaratula(e.causa).toLowerCase().includes(q) ||
      e.tipo.toLowerCase().includes(q) ||
      e.descripcion.toLowerCase().includes(q)
    );
  });

  // Date filter
  const displayed = selectedDate
    ? filtered.filter((e) => {
        const ed = new Date(e.fecha);
        return ed.toDateString() === selectedDate.toDateString();
      })
    : filtered;

  // Dates with events for the calendar
  const eventDates = new Set(allEventos.map((e) => new Date(e.fecha).toDateString()));
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        {/* Calendar */}
        <div className="glass-card rounded-lg p-2 shrink-0">
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

        {/* Event list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Todos los Eventos
              <span className="text-muted-foreground font-normal text-sm ml-2">({displayed.length})</span>
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

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {displayed.map((e, i) => {
              const Icon = tipoIcons[e.tipo] || Scale;
              const isPast = new Date(e.fecha).getTime() < now;
              return (
                <div
                  key={i}
                  className={`rounded-md p-3 border-l-4 flex items-center gap-3 ${getProximityBg(e.fecha)} ${isPast ? "opacity-60" : ""}`}
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
                      {e.tipo === "Agenda" && ` — ${e.descripcion}`}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {fmtDate(e.fecha)}
                  </span>
                </div>
              );
            })}
            {displayed.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {search || selectedDate ? "Sin resultados" : "Sin eventos"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
