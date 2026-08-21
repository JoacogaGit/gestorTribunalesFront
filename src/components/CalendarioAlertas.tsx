import { useState, useEffect, useMemo, Fragment } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Search, Clock, AlertTriangle, Calendar as CalIcon, FileCheck, X, RefreshCw, Inbox, Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCalendarioEventos } from "@/hooks/useCalendarioEventos";
import { LayoutDashboard } from "lucide-react";
import { CalendarEvento, CalendarTipo, CALENDAR_TIPO_LABEL, getSemaforoBg, getSemaforoDot } from "@/lib/eventoMapper";
import RefreshButton from "@/components/RefreshButton";
import EventoDetailDialog from "@/components/EventoDetailDialog";
import GoogleCalendarSection from "@/components/GoogleCalendarSection";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseLocalDate, parseLocalTime, formatLocalDate, toARDateString } from "@/lib/parseDate";


const tipoIcons: Record<CalendarTipo, typeof Clock> = {
  evento: CalIcon,
  vencimiento_pp: Clock,
  vencimiento_pena: FileCheck,
  prescripcion: AlertTriangle,
  tarjeta: LayoutDashboard,
};

function fmtDate(d: string) {
  return formatLocalDate(d);
}

function eventoKey(e: CalendarEvento) {
  return `${e.causaId}|${e.tipo}|${e.fecha}|${e.titulo}`;
}

const STORAGE_KEY = "calendario-dismissed-v2";
const FILTER_KEY = "calendario-tipos-ocultos-v2";
const TIPOS: CalendarTipo[] = ["evento", "vencimiento_pp", "vencimiento_pena", "prescripcion", "tarjeta"];

interface Props {
  vocaliaId: string | null;
  onOpenCausa?: (causaId: string) => void;
}

export default function CalendarioAlertas({ vocaliaId, onOpenCausa }: Props) {
  const { eventos, loading, error, refetch } = useCalendarioEventos(vocaliaId);
  const isMobile = useIsMobile();
  const [mobileVista, setMobileVista] = useState<"mes" | "agenda">("agenda");
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [openEvento, setOpenEvento] = useState<CalendarEvento | null>(null);

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

  const todayStr = toARDateString(new Date());
  const selectedDateStr = selectedDate ? toARDateString(selectedDate) : undefined;
  const todayDate = parseLocalDate(todayStr) ?? new Date();

  const matchesDate = (e: CalendarEvento) =>
    !selectedDateStr || toARDateString(parseLocalDate(e.fecha)) === selectedDateStr;

  const isEventActive = (e: CalendarEvento) => {
    const eventDateStr = toARDateString(parseLocalDate(e.fecha));
    return eventDateStr >= todayStr;
  };

  const futuros = visibles
    .filter((e) => isEventActive(e) && matchesSearch(e) && matchesDate(e))
    .sort((a, b) => parseLocalTime(a.fecha) - parseLocalTime(b.fecha));
  const pasadosTodos = visibles
    .filter((e) => !isEventActive(e) && matchesSearch(e) && matchesDate(e))
    .sort((a, b) => parseLocalTime(b.fecha) - parseLocalTime(a.fecha));
  // Si el usuario seleccionó una fecha pasada, mostramos sus eventos en el panel principal en gris.
  const selectedIsPast = !!selectedDateStr && selectedDateStr < todayStr;
  const pasadosDelDiaSeleccionado = selectedIsPast ? pasadosTodos : [];
  const pasados = pasadosTodos;

  const eventDates = new Set(visibles.map((e) => toARDateString(parseLocalDate(e.fecha))).filter(Boolean) as string[]);

  function grupoPasado(eventDate: Date): "ayer" | "anteayer" | "anteriores" {
    const diff = Math.floor((todayDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return "ayer";
    if (diff === 2) return "anteayer";
    return "anteriores";
  }
  const grupoLabel: Record<ReturnType<typeof grupoPasado>, string> = {
    ayer: "Ayer",
    anteayer: "Anteayer",
    anteriores: "Anteriores",
  };

  const renderEvento = (e: CalendarEvento, i: number, isPast = false) => {
    const Icon = isPast ? Clock : (tipoIcons[e.tipo] ?? Scale);
    return (
      <div
        key={e.id + i}
        onClick={() => setOpenEvento(e)}
        role="button"
        tabIndex={0}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setOpenEvento(e); }
        }}
        className={`rounded-md p-3 border-l-4 flex items-start gap-3 ${getSemaforoBg(e.fecha)} ${isPast ? "opacity-80 grayscale-[0.3]" : ""} cursor-pointer hover:brightness-110 transition`}
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${getSemaforoDot(e.fecha)}`} />
        <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">{e.titulo}</span>
            {e.hora && <span className="text-[10px] opacity-75">{e.hora} hs</span>}
            {isPast && <span className="text-[10px] font-bold bg-foreground/10 px-1.5 py-0.5 rounded">PASADO</span>}
          </div>
          <p className="text-xs opacity-80 break-words">
            {e.causaNumero} — {e.causaCaratula}
          </p>
          {e.descripcion && (
            <p className="text-[11px] opacity-75 mt-0.5 break-words">{e.descripcion}</p>
          )}
        </div>
        <span className="text-xs font-mono opacity-75 shrink-0 whitespace-nowrap">{fmtDate(e.fecha)}</span>
        <button
          onClick={(ev) => { ev.stopPropagation(); dismiss(e); }}
          className="p-1 opacity-60 hover:opacity-100 transition shrink-0"
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

  if (isMobile) {
    const delDia = selectedDate
      ? visibles
          .filter((e) => parseLocalDate(e.fecha)?.toDateString() === selectedDate.toDateString())
          .filter(matchesSearch)
          .sort((a, b) => parseLocalTime(a.fecha) - parseLocalTime(b.fecha))
      : [];
    const agenda = [...futuros].sort((a, b) => parseLocalTime(a.fecha) - parseLocalTime(b.fecha));

    return (
      <div className="space-y-4 h-full overflow-y-auto px-1 pb-24">
        <div className="glass-card rounded-lg p-3">
          <GoogleCalendarSection />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setMobileVista("mes")}
              className={`px-3 min-h-[44px] text-sm font-medium ${mobileVista === "mes" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}
            >
              Mes
            </button>
            <button
              onClick={() => setMobileVista("agenda")}
              className={`px-3 min-h-[44px] text-sm font-medium ${mobileVista === "agenda" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}
            >
              Agenda
            </button>
          </div>
          <RefreshButton onRefresh={refetch} loading={loading} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 min-h-[44px] text-base bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {mobileVista === "mes" ? (
          <div className="glass-card rounded-lg p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); if (d) setDaySheetOpen(true); }}
              className="pointer-events-auto w-full [&_table]:w-full [&_td]:h-11 [&_button]:h-11 [&_button]:w-11 [&_button]:text-base"
              modifiers={{ hasEvent: (date) => eventDates.has(date.toDateString()) }}
              modifiersClassNames={{ hasEvent: "relative font-bold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary" }}
            />
            <p className="text-xs text-muted-foreground text-center pb-2">
              Tocá un día para ver sus eventos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-base font-display font-semibold text-foreground px-1">
              Próximos eventos <span className="text-muted-foreground font-normal text-sm">({agenda.length})</span>
            </h2>
            {agenda.map((e, i) => renderEvento(e, i, false))}
            {agenda.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No hay eventos próximos</p>
            )}
            {pasadosTodos.length > 0 && (
              <>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground px-1 pt-4">Pasados ({pasadosTodos.length})</h3>
                {pasadosTodos.slice(0, 30).map((e, i) => renderEvento(e, i, true))}
              </>
            )}
          </div>
        )}

        <Sheet open={daySheetOpen} onOpenChange={setDaySheetOpen}>
          <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="text-base">
                {selectedDate?.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long" })}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-2 mt-3">
              {delDia.map((e, i) => renderEvento(e, i, toARDateString(parseLocalDate(e.fecha)) < todayStr))}
              {delDia.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Sin eventos este día</p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <EventoDetailDialog
          evento={openEvento}
          onClose={() => setOpenEvento(null)}
          onOpenCausa={(id) => { onOpenCausa?.(id); }}
          onMutated={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-1">
      <div className="glass-card rounded-lg p-4">
        <GoogleCalendarSection />
      </div>
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
              <RefreshButton onRefresh={refetch} loading={loading} />
            </div>
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {selectedIsPast && pasadosDelDiaSeleccionado.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-1">
                  Eventos del {selectedDate?.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} (pasados)
                </p>
                {pasadosDelDiaSeleccionado.map((e, i) => renderEvento(e, i, true))}
              </>
            )}
            {!selectedIsPast && futuros.map((e, i) => renderEvento(e, i, false))}
            {((selectedIsPast && pasadosDelDiaSeleccionado.length === 0) || (!selectedIsPast && futuros.length === 0)) && (
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
      <EventoDetailDialog
        evento={openEvento}
        onClose={() => setOpenEvento(null)}
        onOpenCausa={(id) => { onOpenCausa?.(id); }}
        onMutated={refetch}
      />
    </div>
  );
}
