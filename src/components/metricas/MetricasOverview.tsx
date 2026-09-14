import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarRange, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Metrica, MetricaDato } from "@/hooks/useMetricas";
import { resolverColor } from "@/lib/tableroColores";

type TipoPeriodo = "mensual" | "trimestral" | "rango";
interface Props { metricas: Metrica[]; datos: MetricaDato[] }

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fecha = (value: string) => new Date(`${value}T00:00:00`);
const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const enRango = (dato: MetricaDato, inicio: string, fin: string) => dato.periodo_inicio <= fin && dato.periodo_fin >= inicio;
const total = (metrica: Metrica, registros: MetricaDato[]) => metrica.tipo_conteo === "conteo" ? registros.length : registros.reduce((s, d) => s + Number(d.valor), 0);

function rangoBase(tipo: Exclude<TipoPeriodo, "rango">, hoy: Date) {
  if (tipo === "mensual") return { inicio: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
  const mes = Math.floor(hoy.getMonth() / 3) * 3;
  return { inicio: iso(new Date(hoy.getFullYear(), mes, 1)), fin: iso(new Date(hoy.getFullYear(), mes + 3, 0)) };
}

function rangoAnterior(inicio: string, fin: string) {
  const desde = fecha(inicio); const hasta = fecha(fin);
  const dias = Math.round((hasta.getTime() - desde.getTime()) / 86400000) + 1;
  const anteriorFin = new Date(desde); anteriorFin.setDate(anteriorFin.getDate() - 1);
  const anteriorInicio = new Date(anteriorFin); anteriorInicio.setDate(anteriorInicio.getDate() - dias + 1);
  return { inicio: iso(anteriorInicio), fin: iso(anteriorFin) };
}

const tooltipStyle = { background: "hsl(var(--metrics-card))", border: "1px solid hsl(var(--metrics-border))", borderRadius: "6px", color: "hsl(var(--metrics-foreground))" };

export default function MetricasOverview({ metricas, datos }: Props) {
  const hoy = useMemo(() => new Date(), []);
  const inicial = useMemo(() => rangoBase("mensual", hoy), [hoy]);
  const [tipo, setTipo] = useState<TipoPeriodo>("mensual");
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fin, setFin] = useState(inicial.fin);
  const [aislada, setAislada] = useState("todas");
  const [metricaLinea, setMetricaLinea] = useState("");
  const [bienvenida, setBienvenida] = useState(false);

  useEffect(() => setBienvenida(localStorage.getItem("iustrack-metricas-bienvenida") !== "oculta"), []);
  useEffect(() => {
    if (!metricas.some((m) => m.id === metricaLinea)) setMetricaLinea(metricas[0]?.id ?? "");
    if (aislada !== "todas" && !metricas.some((m) => m.id === aislada)) setAislada("todas");
  }, [metricas, metricaLinea, aislada]);

  const cambiarPeriodo = (nuevo: TipoPeriodo) => {
    setTipo(nuevo);
    if (nuevo !== "rango") { const r = rangoBase(nuevo, hoy); setInicio(r.inicio); setFin(r.fin); }
  };
  const visibles = useMemo(() => aislada === "todas" ? metricas : metricas.filter((m) => m.id === aislada), [metricas, aislada]);
  const anterior = useMemo(() => rangoAnterior(inicio, fin), [inicio, fin]);
  const resumen = useMemo(() => visibles.map((metrica) => {
    const actuales = datos.filter((d) => d.metrica_id === metrica.id && enRango(d, inicio, fin));
    const previos = datos.filter((d) => d.metrica_id === metrica.id && enRango(d, anterior.inicio, anterior.fin));
    const valor = total(metrica, actuales); const previo = total(metrica, previos);
    return { ...metrica, valor, cantidad: actuales.length, variacion: previo === 0 ? null : ((valor - previo) / Math.abs(previo)) * 100 };
  }), [visibles, datos, inicio, fin, anterior]);
  const lineaId = aislada === "todas" ? metricaLinea : aislada;
  const lineaMetrica = metricas.find((m) => m.id === lineaId);
  const linea = useMemo(() => {
    if (!lineaMetrica) return [];
    const agrupados = new Map<string, MetricaDato[]>();
    datos.filter((d) => d.metrica_id === lineaId && enRango(d, inicio, fin)).forEach((d) => {
      const clave = d.periodo_inicio; agrupados.set(clave, [...(agrupados.get(clave) ?? []), d]);
    });
    return [...agrupados.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, registros]) => ({ periodo: `${MESES[fecha(dia).getMonth()]} ${fecha(dia).getDate()}`, valor: total(lineaMetrica, registros) }));
  }, [datos, lineaId, lineaMetrica, inicio, fin]);
  const barras = resumen.filter((r) => r.cantidad).map((r) => ({ nombre: r.nombre, valor: r.valor }));
  const torta = resumen.filter((r) => r.valor > 0).map((r) => ({ nombre: r.nombre, valor: r.valor, color: resolverColor(r.color) }));

  return <div className="space-y-6">
    <header className="mx-auto max-w-3xl text-center">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md border border-metrics-gold/40 bg-metrics-gold/10 text-metrics-gold"><Activity className="h-5 w-5" /></div>
      <h1 className="text-3xl font-semibold text-metrics-foreground sm:text-4xl">Estadísticas y relevamientos</h1>
      <p className="mt-2 text-sm text-metrics-muted sm:text-base">Registrá, compará y seguí la evolución de los datos de tu espacio.</p>
    </header>
    {bienvenida && <section className="rounded-md border border-metrics-gold/45 bg-metrics-gold/5 p-5 shadow-metrics-glow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex max-w-3xl gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-metrics-gold" /><div><h2 className="text-lg font-semibold">Convertí la actividad diaria en información útil</h2><p className="mt-1 text-sm leading-6 text-metrics-muted">Creá métricas de conteo o suma, agregá registros y generá relevamientos. Algunas métricas también pueden alimentarse automáticamente desde las causas.</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="ghost" className="text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground" onClick={() => setBienvenida(false)}>Entendido</Button><Button className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={() => { localStorage.setItem("iustrack-metricas-bienvenida", "oculta"); setBienvenida(false); }}>No mostrar de nuevo</Button></div></div>
    </section>}
    <section className="flex flex-col gap-3 rounded-md border border-metrics-border bg-metrics-card/70 p-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium"><CalendarRange className="h-4 w-4 text-metrics-gold" /> Período de análisis</div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Select value={aislada} onValueChange={setAislada}><SelectTrigger className="w-full border-metrics-border bg-metrics-background text-metrics-foreground md:w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas las métricas</SelectItem>{metricas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent></Select>
        <div className="flex rounded-md border border-metrics-border bg-metrics-background p-1">{(["mensual", "trimestral", "rango"] as TipoPeriodo[]).map((p) => <Button key={p} size="sm" variant="ghost" onClick={() => cambiarPeriodo(p)} className={tipo === p ? "bg-metrics-accent text-metrics-foreground hover:bg-metrics-accent" : "text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground"}>{p === "mensual" ? "Mensual" : p === "trimestral" ? "Trimestral" : "Rango libre"}</Button>)}</div>
        {tipo === "rango" ? <div className="flex gap-2"><Input aria-label="Desde" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="border-metrics-border bg-metrics-background text-metrics-foreground" /><Input aria-label="Hasta" type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="border-metrics-border bg-metrics-background text-metrics-foreground" /></div> : <span className="px-2 text-xs text-metrics-muted">{inicio.split("-").reverse().join("/")} — {fin.split("-").reverse().join("/")}</span>}
      </div>
    </section>
    {resumen.length === 0 ? <div className="rounded-md border border-dashed border-metrics-border px-5 py-10 text-center text-sm text-metrics-muted">Creá una métrica para comenzar.</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{resumen.map((item) => <article key={item.id} onClick={() => setAislada(aislada === item.id ? "todas" : item.id)} className={`relative cursor-pointer overflow-hidden rounded-md border bg-metrics-card p-4 transition-colors ${aislada === item.id ? "border-metrics-gold shadow-metrics-glow" : "border-metrics-border hover:border-metrics-accent"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-metrics-muted">{item.nombre}</p><p className="mt-1 text-[11px] text-metrics-gold">{item.origen === "auto" ? "auto · desde causas" : item.tipo_conteo === "conteo" ? "conteo de registros" : "suma de valores"}</p></div><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: resolverColor(item.color) ?? "hsl(var(--metrics-gold))" }} /></div>
      <div className="mt-5 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tabular-nums">{numero.format(item.valor)} {item.tipo_conteo === "suma" && <span className="text-sm font-normal text-metrics-muted">{item.unidad}</span>}</p>{item.variacion !== null && <span className={item.variacion >= 0 ? "flex items-center text-xs font-semibold text-metrics-positive" : "flex items-center text-xs font-semibold text-metrics-negative"}>{item.variacion >= 0 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{Math.abs(item.variacion).toFixed(1)}%</span>}</div><p className="mt-2 text-[11px] text-metrics-muted">{item.cantidad} registro{item.cantidad === 1 ? "" : "s"} en el período</p>
    </article>)}</div>}
    <div className="grid gap-4 xl:grid-cols-5"><section className="rounded-md border border-metrics-border bg-metrics-card p-4 xl:col-span-3"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Evolución temporal</h2><p className="text-xs text-metrics-muted">Registros dentro del período seleccionado</p></div>{aislada === "todas" && <Select value={metricaLinea} onValueChange={setMetricaLinea}><SelectTrigger className="w-[210px] border-metrics-border bg-metrics-background text-metrics-foreground"><SelectValue placeholder="Elegí una métrica" /></SelectTrigger><SelectContent>{metricas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent></Select>}</div><div className="h-72">{linea.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={linea} margin={{ top: 10, right: 12, left: -18 }}><CartesianGrid stroke="hsl(var(--metrics-border))" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="periodo" tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="valor" name={lineaMetrica?.nombre} stroke="hsl(var(--metrics-chart-line))" strokeWidth={2.5} activeDot={{ fill: "hsl(var(--metrics-gold))", stroke: "hsl(var(--metrics-gold))", r: 5 }} /></LineChart></ResponsiveContainer> : <Vacio />}</div></section>
      <section className="rounded-md border border-metrics-border bg-metrics-card p-4 xl:col-span-2"><h2 className="text-lg font-semibold">Composición</h2><p className="mb-3 text-xs text-metrics-muted">Participación en el período</p><div className="h-72">{torta.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={torta} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={88} paddingAngle={3}>{torta.map((item, i) => <Cell key={item.nombre} fill={item.color ?? `hsl(var(--metrics-chart-${(i % 4) + 1}))`} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer> : <Vacio />}</div></section></div>
    <section className="rounded-md border border-metrics-border bg-metrics-card p-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 className="h-4 w-4 text-metrics-gold" /> Comparación del período</h2><p className="mb-4 text-xs text-metrics-muted">Totales calculados para cada métrica</p><div className="h-72">{barras.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={barras} margin={{ top: 5, right: 10, left: -18 }}><CartesianGrid stroke="hsl(var(--metrics-border))" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="nombre" tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "hsl(var(--metrics-muted))", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="valor" fill="hsl(var(--metrics-chart-bar))" radius={[4, 4, 0, 0]} maxBarSize={54} /></BarChart></ResponsiveContainer> : <Vacio />}</div></section>
  </div>;
}

function Vacio() { return <div className="flex h-full items-center justify-center text-center text-sm text-metrics-muted">No hay registros para este gráfico.</div>; }