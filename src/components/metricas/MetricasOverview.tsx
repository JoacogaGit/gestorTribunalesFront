import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarRange, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Metrica, MetricaDato } from "@/hooks/useMetricas";
import { resolverColor } from "@/lib/tableroColores";

type TipoPeriodo = "mensual" | "trimestral" | "rango";

interface Props {
  metricas: Metrica[];
  datos: MetricaDato[];
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseFecha = (value: string) => new Date(`${value}T00:00:00`);
const formatoNumero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function rangoPredeterminado(tipo: TipoPeriodo, fecha: Date) {
  if (tipo === "mensual") {
    return {
      inicio: iso(new Date(fecha.getFullYear(), fecha.getMonth(), 1)),
      fin: iso(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)),
    };
  }
  const inicioMes = Math.floor(fecha.getMonth() / 3) * 3;
  return {
    inicio: iso(new Date(fecha.getFullYear(), inicioMes, 1)),
    fin: iso(new Date(fecha.getFullYear(), inicioMes + 3, 0)),
  };
}

function rangoAnterior(inicio: string, fin: string) {
  const desde = parseFecha(inicio);
  const hasta = parseFecha(fin);
  const dias = Math.round((hasta.getTime() - desde.getTime()) / 86400000) + 1;
  const finAnterior = new Date(desde);
  finAnterior.setDate(finAnterior.getDate() - 1);
  const inicioAnterior = new Date(finAnterior);
  inicioAnterior.setDate(inicioAnterior.getDate() - dias + 1);
  return { inicio: iso(inicioAnterior), fin: iso(finAnterior) };
}

const enRango = (dato: MetricaDato, inicio: string, fin: string) =>
  dato.periodo_inicio <= fin && dato.periodo_fin >= inicio;

const tooltipStyle = {
  background: "hsl(var(--metrics-card))",
  border: "1px solid hsl(var(--metrics-border))",
  borderRadius: "6px",
  color: "hsl(var(--metrics-foreground))",
};

export default function MetricasOverview({ metricas, datos }: Props) {
  const hoy = useMemo(() => new Date(), []);
  const [tipo, setTipo] = useState<TipoPeriodo>("mensual");
  const mensual = rangoPredeterminado("mensual", hoy);
  const [inicio, setInicio] = useState(mensual.inicio);
  const [fin, setFin] = useState(mensual.fin);
  const [metricaLinea, setMetricaLinea] = useState("");
  const [bienvenidaVisible, setBienvenidaVisible] = useState(false);

  useEffect(() => {
    setMetricaLinea((actual) => actual || metricas[0]?.id || "");
  }, [metricas]);

  useEffect(() => {
    setBienvenidaVisible(localStorage.getItem("iustrack-metricas-bienvenida") !== "oculta");
  }, []);

  const cambiarTipo = (nuevo: TipoPeriodo) => {
    setTipo(nuevo);
    if (nuevo !== "rango") {
      const rango = rangoPredeterminado(nuevo, hoy);
      setInicio(rango.inicio);
      setFin(rango.fin);
    }
  };

  const datosPeriodo = useMemo(
    () => datos.filter((dato) => enRango(dato, inicio, fin)),
    [datos, inicio, fin],
  );
  const anterior = useMemo(() => rangoAnterior(inicio, fin), [inicio, fin]);

  const resumen = useMemo(() => metricas.map((metrica) => {
    const actuales = datosPeriodo.filter((dato) => dato.metrica_id === metrica.id);
    const previos = datos.filter((dato) => dato.metrica_id === metrica.id && enRango(dato, anterior.inicio, anterior.fin));
    const valor = actuales.reduce((suma, dato) => suma + Number(dato.valor), 0);
    const previo = previos.reduce((suma, dato) => suma + Number(dato.valor), 0);
    const variacion = previo === 0 ? null : ((valor - previo) / Math.abs(previo)) * 100;
    return { ...metrica, valor, previo, variacion, cantidad: actuales.length };
  }), [metricas, datos, datosPeriodo, anterior]);

  const linea = useMemo(() => datos
    .filter((dato) => dato.metrica_id === metricaLinea)
    .sort((a, b) => a.periodo_inicio.localeCompare(b.periodo_inicio))
    .map((dato) => ({
      periodo: `${MESES_CORTOS[parseFecha(dato.periodo_inicio).getMonth()]} ${String(parseFecha(dato.periodo_inicio).getFullYear()).slice(-2)}`,
      valor: Number(dato.valor),
    })), [datos, metricaLinea]);

  const barras = resumen.filter((item) => item.cantidad > 0).map((item) => ({ nombre: item.nombre, valor: item.valor }));
  const torta = resumen.filter((item) => item.valor > 0).map((item) => ({ nombre: item.nombre, valor: item.valor, color: resolverColor(item.color) }));
  const metricaActiva = metricas.find((metrica) => metrica.id === metricaLinea);

  const ocultarBienvenida = (persistir: boolean) => {
    if (persistir) localStorage.setItem("iustrack-metricas-bienvenida", "oculta");
    setBienvenidaVisible(false);
  };

  return (
    <div className="space-y-6">
      <header className="mx-auto max-w-3xl text-center">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md border border-metrics-gold/40 bg-metrics-gold/10 text-metrics-gold">
          <Activity className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-semibold text-metrics-foreground sm:text-4xl">Estadísticas y relevamientos</h1>
        <p className="mt-2 text-sm text-metrics-muted sm:text-base">Una mirada clara sobre la evolución y composición de los datos de tu espacio.</p>
      </header>

      {bienvenidaVisible && (
        <section className="rounded-md border border-metrics-gold/45 bg-metrics-gold/5 p-5 shadow-metrics-glow" aria-label="Bienvenida">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex max-w-3xl gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-metrics-gold" />
              <div>
                <h2 className="text-lg font-semibold text-metrics-foreground">Convertí la actividad diaria en información útil</h2>
                <p className="mt-1 text-sm leading-6 text-metrics-muted">Creá métricas, cargá valores por período y generá relevamientos. Algunas métricas también pueden alimentarse automáticamente desde las causas para mantener tus indicadores actualizados.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="ghost" className="text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground" onClick={() => ocultarBienvenida(false)}>Entendido</Button>
              <Button className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={() => ocultarBienvenida(true)}>No mostrar de nuevo</Button>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-md border border-metrics-border bg-metrics-card/70 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-metrics-foreground">
          <CalendarRange className="h-4 w-4 text-metrics-gold" /> Período de análisis
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-md border border-metrics-border bg-metrics-background p-1">
            {(["mensual", "trimestral", "rango"] as TipoPeriodo[]).map((opcion) => (
              <Button
                key={opcion}
                size="sm"
                variant="ghost"
                onClick={() => cambiarTipo(opcion)}
                className={tipo === opcion ? "bg-metrics-accent text-metrics-foreground hover:bg-metrics-accent" : "text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground"}
              >
                {opcion === "mensual" ? "Mensual" : opcion === "trimestral" ? "Trimestral" : "Rango libre"}
              </Button>
            ))}
          </div>
          {tipo === "rango" && (
            <div className="flex items-center gap-2">
              <Input aria-label="Desde" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="border-metrics-border bg-metrics-background text-metrics-foreground" />
              <span className="text-metrics-muted">—</span>
              <Input aria-label="Hasta" type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="border-metrics-border bg-metrics-background text-metrics-foreground" />
            </div>
          )}
          {tipo !== "rango" && <span className="px-2 text-xs text-metrics-muted">{inicio.split("-").reverse().join("/")} — {fin.split("-").reverse().join("/")}</span>}
        </div>
      </section>

      {metricas.length === 0 ? (
        <div className="rounded-md border border-dashed border-metrics-border bg-metrics-card/40 px-5 py-12 text-center text-sm text-metrics-muted">Creá tu primera métrica para comenzar a visualizar datos.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {resumen.map((item) => (
            <article key={item.id} className="group relative overflow-hidden rounded-md border border-metrics-border bg-metrics-card p-4 transition-colors hover:border-metrics-accent">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-metrics-gold opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase text-metrics-muted">{item.nombre}</p>
                  {item.origen === "auto" && <p className="mt-1 text-[11px] text-metrics-gold">auto · desde causas</p>}
                </div>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: resolverColor(item.color) ?? "hsl(var(--metrics-gold))" }} />
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tabular-nums text-metrics-foreground">{formatoNumero.format(item.valor)} <span className="text-sm font-normal text-metrics-muted">{item.unidad}</span></p>
                {item.variacion !== null && (
                  <span className={item.variacion >= 0 ? "flex items-center text-xs font-semibold text-metrics-positive" : "flex items-center text-xs font-semibold text-metrics-negative"}>
                    {item.variacion >= 0 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {Math.abs(item.variacion).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-metrics-muted">{item.cantidad ? `${item.cantidad} registro${item.cantidad === 1 ? "" : "s"} en el período` : "Sin datos en el período"}</p>
            </article>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-md border border-metrics-border bg-metrics-card p-4 xl:col-span-3">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-metrics-foreground">Evolución temporal</h2><p className="text-xs text-metrics-muted">Cambios de una métrica a través del tiempo</p></div>
            <Select value={metricaLinea} onValueChange={setMetricaLinea}>
              <SelectTrigger className="w-[210px] border-metrics-border bg-metrics-background text-metrics-foreground"><SelectValue placeholder="Elegí una métrica" /></SelectTrigger>
              <SelectContent>{metricas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="h-72">
            {linea.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={linea} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="hsl(var(--metrics-border))" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="periodo" tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="valor" name={metricaActiva?.nombre} stroke="hsl(var(--metrics-chart-line))" strokeWidth={2.5} dot={{ fill: "hsl(var(--metrics-card))", strokeWidth: 2 }} activeDot={{ fill: "hsl(var(--metrics-gold))", stroke: "hsl(var(--metrics-gold))", r: 5 }} /></LineChart></ResponsiveContainer> : <EstadoVacio />}
          </div>
        </section>

        <section className="rounded-md border border-metrics-border bg-metrics-card p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold text-metrics-foreground">Composición</h2><p className="mb-3 text-xs text-metrics-muted">Participación de cada métrica en el período</p>
          <div className="h-72">
            {torta.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={torta} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={88} paddingAngle={3}>{torta.map((item, i) => <Cell key={`${item.nombre}-${i}`} fill={item.color ?? `hsl(var(--metrics-chart-${(i % 4) + 1}))`} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatoNumero.format(value)} /></PieChart></ResponsiveContainer> : <EstadoVacio />}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-metrics-border bg-metrics-card p-4">
        <div className="mb-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-metrics-foreground"><BarChart3 className="h-4 w-4 text-metrics-gold" /> Comparación del período</h2><p className="text-xs text-metrics-muted">Valores acumulados para cada métrica</p></div>
        <div className="h-72">
          {barras.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={barras} margin={{ top: 5, right: 10, left: -18, bottom: 5 }}><CartesianGrid stroke="hsl(var(--metrics-border))" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="nombre" tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="valor" name="Valor" fill="hsl(var(--metrics-chart-bar))" radius={[4, 4, 0, 0]} maxBarSize={54} /></BarChart></ResponsiveContainer> : <EstadoVacio />}
        </div>
      </section>
    </div>
  );
}

function EstadoVacio() {
  return <div className="flex h-full items-center justify-center text-center text-sm text-metrics-muted">No hay datos suficientes para este gráfico.</div>;
}