import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Copy, BarChart3, Search, ChevronDown, ChevronUp, Hash, Sigma } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { COLORES_TABLERO, resolverColor } from "@/lib/tableroColores";
import { useMetricas, Metrica, MetricaDato } from "@/hooks/useMetricas";
import type { VocaliaRow } from "@/hooks/useVocalias";
import MetricasOverview from "@/components/metricas/MetricasOverview";

interface Props {
  vocaliaId: string;
  vocaliasTribunal: VocaliaRow[];
}

/* -------------------- helpers de período -------------------- */

type TipoPeriodo = "puntual" | "mensual" | "trimestral" | "rango";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const ultimoDia = (y: number, m: number) => new Date(y, m, 0).getDate();

function rangoMensual(anio: number, mes: number) {
  return { inicio: iso(anio, mes, 1), fin: iso(anio, mes, ultimoDia(anio, mes)) };
}
function rangoTrimestral(anio: number, trim: number) {
  const mesInicio = (trim - 1) * 3 + 1;
  const mesFin = mesInicio + 2;
  return { inicio: iso(anio, mesInicio, 1), fin: iso(anio, mesFin, ultimoDia(anio, mesFin)) };
}

function formatearPeriodo(inicio: string, fin: string) {
  const f = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };
  return `${f(inicio)} – ${f(fin)}`;
}

/* -------------------- buscador de causas -------------------- */

interface CausaMini { id: string; expediente_nro: string; caratula: string | null }

function BuscadorCausa({
  vocaliaId, value, onChange,
}: { vocaliaId: string; value: CausaMini | null; onChange: (c: CausaMini | null) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<CausaMini[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setRes([]); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("causas")
        .select("id,expediente_nro,caratula")
        .eq("vocalia_id", vocaliaId)
        .is("borrado_en", null)
        .or(`expediente_nro.ilike.%${term}%,caratula.ilike.%${term}%`)
        .limit(6);
      if (!cancel) setRes((data ?? []) as CausaMini[]);
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, vocaliaId]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <span className="truncate">{value.expediente_nro}{value.caratula ? ` — ${value.caratula}` : ""}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Quitar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por expediente o carátula" className="pl-8" />
      </div>
      {res.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-border">
          {res.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c); setQ(""); setRes([]); }}
              className="block w-full truncate px-3 py-1.5 text-left text-xs hover:bg-accent"
            >
              <span className="font-medium">{c.expediente_nro}</span>{c.caratula ? ` — ${c.caratula}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- panel -------------------- */

export default function MetricasPanel({ vocaliaId, vocaliasTribunal }: Props) {
  const {
    metricas, datos, loading,
    crearMetrica, actualizarMetrica, eliminarMetrica,
    crearDato, actualizarDato, eliminarDato, copiarDesdeVocalia,
  } = useMetricas(vocaliaId);

  /* --- diálogo métrica --- */
  const [metricaOpen, setMetricaOpen] = useState(false);
  const [editandoMetrica, setEditandoMetrica] = useState<Metrica | null>(null);
  const [mNombre, setMNombre] = useState("");
  const [mUnidad, setMUnidad] = useState("");
  const [mColor, setMColor] = useState<string>(COLORES_TABLERO[0].id);
  const [mTipo, setMTipo] = useState<"conteo" | "suma">("conteo");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  const abrirNuevaMetrica = () => {
    setEditandoMetrica(null); setMNombre(""); setMUnidad(""); setMColor(COLORES_TABLERO[0].id); setMTipo("conteo"); setMetricaOpen(true);
  };
  const abrirEditarMetrica = (m: Metrica) => {
    setEditandoMetrica(m); setMNombre(m.nombre); setMUnidad(m.unidad ?? ""); setMColor(m.color ?? COLORES_TABLERO[0].id); setMTipo(m.tipo_conteo); setMetricaOpen(true);
  };

  const guardarMetrica = async () => {
    if (!mNombre.trim()) { toast.error("Poné un nombre."); return; }
    setGuardando(true);
    const input = { nombre: mNombre.trim(), unidad: mTipo === "suma" ? mUnidad.trim() || null : null, color: mColor, tipo_conteo: mTipo };
    const { error } = editandoMetrica
      ? await actualizarMetrica(editandoMetrica.id, input)
      : await crearMetrica(input);
    setGuardando(false);
    if (error) { toast.error(error); return; }
    toast.success(editandoMetrica ? "Métrica actualizada" : "Métrica creada");
    setMetricaOpen(false);
  };

  /* --- diálogo dato --- */
  const hoy = useMemo(() => new Date(), []);
  const [datoOpen, setDatoOpen] = useState(false);
  const [editandoDato, setEditandoDato] = useState<MetricaDato | null>(null);
  const [dMetrica, setDMetrica] = useState("");
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("mensual");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [trim, setTrim] = useState(Math.floor(hoy.getMonth() / 3) + 1);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [valor, setValor] = useState("");
  const [causa, setCausa] = useState<CausaMini | null>(null);
  const [nota, setNota] = useState("");

  const anios = useMemo(() => {
    const y = hoy.getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3, y - 4];
  }, [hoy]);

  const abrirNuevoDato = (metricaId?: string) => {
    setEditandoDato(null);
    setDMetrica(metricaId ?? metricas[0]?.id ?? "");
    setTipoPeriodo("puntual"); setAnio(hoy.getFullYear()); setMes(hoy.getMonth() + 1);
    setTrim(Math.floor(hoy.getMonth() / 3) + 1);
    setDesde(""); setHasta(""); setValor(""); setCausa(null); setNota("");
    setDatoOpen(true);
  };

  const abrirEditarDato = (d: MetricaDato) => {
    setEditandoDato(d);
    setDMetrica(d.metrica_id);
    setTipoPeriodo("rango");
    setDesde(d.periodo_inicio); setHasta(d.periodo_fin);
    setValor(String(d.valor));
    setCausa(d.causa ? { id: d.causa.id, expediente_nro: d.causa.expediente_nro, caratula: d.causa.caratula } : null);
    setNota(d.nota ?? "");
    setDatoOpen(true);
  };

  const guardarDato = async () => {
    if (!dMetrica) { toast.error("Elegí una métrica."); return; }
    const metricaSeleccionada = metricas.find((m) => m.id === dMetrica);
    const num = metricaSeleccionada?.tipo_conteo === "conteo" ? 1 : Number(valor.replace(",", "."));
    if (!Number.isFinite(num)) { toast.error("Ingresá un valor numérico."); return; }
    let inicio = "", fin = "";
    if (tipoPeriodo === "puntual") {
      if (!desde) { toast.error("Elegí la fecha del registro."); return; }
      inicio = desde; fin = desde;
    }
    else if (tipoPeriodo === "mensual") ({ inicio, fin } = rangoMensual(anio, mes));
    else if (tipoPeriodo === "trimestral") ({ inicio, fin } = rangoTrimestral(anio, trim));
    else {
      if (!desde || !hasta) { toast.error("Elegí las dos fechas del rango."); return; }
      if (desde > hasta) { toast.error("La fecha de inicio no puede ser posterior al fin."); return; }
      inicio = desde; fin = hasta;
    }
    const input = {
      metrica_id: dMetrica, periodo_inicio: inicio, periodo_fin: fin,
      valor: num, causa_id: causa?.id ?? null, nota: nota.trim() || null,
    };
    setGuardando(true);
    const { error } = editandoDato ? await actualizarDato(editandoDato.id, input) : await crearDato(input);
    setGuardando(false);
    if (error) { toast.error(error); return; }
    toast.success(editandoDato ? "Dato actualizado" : "Dato cargado");
    setDatoOpen(false);
  };

  /* --- copiar configuración --- */
  const otrasVocalias = vocaliasTribunal.filter((v) => v.id !== vocaliaId);
  const [copiarOpen, setCopiarOpen] = useState(false);
  const [origen, setOrigen] = useState("");

  const confirmarCopia = async () => {
    if (!origen) { toast.error("Elegí un espacio."); return; }
    setGuardando(true);
    const r = await copiarDesdeVocalia(origen);
    setGuardando(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(`${r.copiadas} métrica(s) copiada(s)`);
    setCopiarOpen(false); setOrigen("");
  };

  const metricaDatoActual = metricas.find((m) => m.id === dMetrica);
  const alternarExpansion = (id: string) => setExpandidas((actual) => {
    const siguiente = new Set(actual);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    return siguiente;
  });

  return (
    <div className="metrics-panel flex-1 min-h-0 overflow-y-auto bg-metrics-background p-4 text-metrics-foreground sm:p-6 lg:p-8">
      <section className="mb-8 space-y-3 rounded-md border border-metrics-gold/45 bg-metrics-card p-4 shadow-metrics-glow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 className="h-5 w-5 text-metrics-gold" /> Configurá tus relevamientos</h2><p className="mt-1 text-xs text-metrics-muted">Creá una métrica y luego agregá sus registros en contexto.</p></div>
          <div className="flex gap-2">
            {otrasVocalias.length > 0 && (
              <Button variant="outline" size="sm" className="border-metrics-border bg-metrics-background text-metrics-foreground hover:bg-metrics-accent" onClick={() => setCopiarOpen(true)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar métricas de otro espacio
              </Button>
            )}
            <Button size="sm" className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={abrirNuevaMetrica}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva métrica
            </Button>
          </div>
        </div>

      </section>

      <MetricasOverview metricas={metricas} datos={datos} />

      <section className="mt-8 space-y-3"><div><h2 className="text-xl font-semibold">Métricas y registros</h2><p className="text-sm text-metrics-muted">Abrí una métrica para consultar y administrar sus registros.</p></div>
        {loading && !metricas.length ? <p className="text-sm text-metrics-muted">Cargando…</p> : metricas.map((m) => { const registros = datos.filter((d) => d.metrica_id === m.id); const abierta = expandidas.has(m.id); return <article key={m.id} className="overflow-hidden rounded-md border border-metrics-border bg-metrics-card">
          <div className="flex flex-wrap items-center gap-3 p-4"><span className="h-10 w-1 rounded-full" style={{ backgroundColor: resolverColor(m.color) ?? "hsl(var(--metrics-gold))" }} /><Button variant="ghost" className="min-w-0 flex-1 justify-start gap-3 p-0 text-left hover:bg-transparent" onClick={() => alternarExpansion(m.id)}>{m.tipo_conteo === "conteo" ? <Hash className="h-4 w-4 text-metrics-gold" /> : <Sigma className="h-4 w-4 text-metrics-gold" />}<span className="min-w-0"><span className="block truncate font-semibold text-metrics-foreground">{m.nombre}</span><span className="block text-xs text-metrics-muted">{m.tipo_conteo === "conteo" ? "Cuenta registros" : `Suma valores${m.unidad ? ` · ${m.unidad}` : ""}`} · {registros.length} registro{registros.length === 1 ? "" : "s"}</span></span>{abierta ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}</Button>
            <Button size="sm" className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={() => abrirNuevoDato(m.id)}><Plus className="mr-1 h-3.5 w-3.5" /> Agregar registro</Button><Button size="icon" variant="ghost" aria-label="Editar métrica" className="text-metrics-muted hover:bg-metrics-accent hover:text-metrics-foreground" onClick={() => abrirEditarMetrica(m)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Eliminar métrica" className="text-metrics-muted hover:bg-metrics-accent hover:text-metrics-negative" onClick={async () => { if (!confirm(`¿Eliminar la métrica "${m.nombre}" y sus registros?`)) return; const r = await eliminarMetrica(m.id); if (r.error) toast.error(r.error); else toast.success("Métrica eliminada"); }}><Trash2 className="h-4 w-4" /></Button></div>
          {abierta && <div className="border-t border-metrics-border bg-metrics-background/35 p-4">{registros.length === 0 ? <p className="py-5 text-center text-sm text-metrics-muted">Todavía no hay registros en esta métrica.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-metrics-muted"><tr><th className="px-3 py-2 text-left">Fecha o período</th>{m.tipo_conteo === "suma" && <th className="px-3 py-2 text-right">Valor</th>}<th className="px-3 py-2 text-left">Causa</th><th className="px-3 py-2 text-left">Nota</th><th className="w-20" /></tr></thead><tbody>{registros.map((d) => <tr key={d.id} className="border-t border-metrics-border/70"><td className="px-3 py-2 text-metrics-muted">{formatearPeriodo(d.periodo_inicio, d.periodo_fin)}</td>{m.tipo_conteo === "suma" && <td className="px-3 py-2 text-right tabular-nums">{d.valor} {m.unidad}</td>}<td className="max-w-[260px] truncate px-3 py-2">{d.causa ? `${d.causa.expediente_nro}${d.causa.caratula ? ` — ${d.causa.caratula}` : ""}` : "—"}</td><td className="max-w-[240px] truncate px-3 py-2 text-metrics-muted">{d.nota ?? "—"}</td><td className="whitespace-nowrap text-right"><Button size="icon" variant="ghost" aria-label="Editar registro" className="text-metrics-muted hover:text-metrics-foreground" onClick={() => abrirEditarDato(d)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" aria-label="Borrar registro" className="text-metrics-muted hover:text-metrics-negative" onClick={async () => { if (!confirm("¿Borrar este registro?")) return; const r = await eliminarDato(d.id); if (r.error) toast.error(r.error); else toast.success("Registro borrado"); }}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>)}</tbody></table></div>}</div>}
        </article>; })}
      </section>

      {/* Dialogo métrica */}
      <Dialog open={metricaOpen} onOpenChange={setMetricaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoMetrica ? "Editar métrica" : "Nueva métrica"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="metrica-nombre">Nombre</Label>
              <Input id="metrica-nombre" value={mNombre} onChange={(e) => setMNombre(e.target.value)} placeholder="Ej: Audiencias realizadas" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de conteo</Label>
              <Select value={mTipo} onValueChange={(v) => setMTipo(v as "conteo" | "suma")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="conteo">Conteo</SelectItem><SelectItem value="suma">Suma</SelectItem></SelectContent></Select>
              <p className="text-xs text-muted-foreground">{mTipo === "conteo" ? "Cada registro suma 1 automáticamente." : "Cada registro aporta un valor numérico que se acumula."}</p>
            </div>
            {mTipo === "suma" && <div className="space-y-1.5"><Label htmlFor="metrica-unidad">Unidad (opcional)</Label><Input id="metrica-unidad" value={mUnidad} onChange={(e) => setMUnidad(e.target.value)} placeholder="Ej: pesos, días, expedientes" /></div>}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES_TABLERO.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.nombre}
                    title={c.nombre}
                    onClick={() => setMColor(c.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    style={{ backgroundColor: c.hex }}
                  >
                    {mColor === c.id && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetricaOpen(false)}>Cancelar</Button>
            <Button onClick={guardarMetrica} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo dato */}
      <Dialog open={datoOpen} onOpenChange={setDatoOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoDato ? "Editar registro" : "Agregar registro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Métrica</Label>
              <Select value={dMetrica} onValueChange={setDMetrica}>
                <SelectTrigger><SelectValue placeholder="Elegí una métrica" /></SelectTrigger>
                <SelectContent>
                  {metricas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select value={tipoPeriodo} onValueChange={(v) => setTipoPeriodo(v as TipoPeriodo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="puntual">Fecha puntual</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="rango">Rango de fechas libre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoPeriodo === "puntual" && (
              <div className="space-y-1.5">
                <Label htmlFor="dato-fecha">Fecha</Label>
                <Input id="dato-fecha" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
            )}

            {tipoPeriodo === "mensual" && (
              <div className="grid grid-cols-2 gap-2">
                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((nombre, i) => <SelectItem key={nombre} value={String(i + 1)}>{nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anios.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoPeriodo === "trimestral" && (
              <div className="grid grid-cols-2 gap-2">
                <Select value={String(trim)} onValueChange={(v) => setTrim(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1° trimestre (Ene–Mar)</SelectItem>
                    <SelectItem value="2">2° trimestre (Abr–Jun)</SelectItem>
                    <SelectItem value="3">3° trimestre (Jul–Sep)</SelectItem>
                    <SelectItem value="4">4° trimestre (Oct–Dic)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anios.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoPeriodo === "rango" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dato-desde" className="text-xs">Desde</Label>
                  <Input id="dato-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dato-hasta" className="text-xs">Hasta</Label>
                  <Input id="dato-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
              </div>
            )}

            {metricaDatoActual?.tipo_conteo === "suma" && <div className="space-y-1.5">
              <Label htmlFor="dato-valor">Valor</Label>
              <Input id="dato-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej: 12" />
            </div>}

            <div className="space-y-1.5">
              <Label>Causa vinculada (opcional)</Label>
              <BuscadorCausa vocaliaId={vocaliaId} value={causa} onChange={setCausa} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dato-nota">Nota (opcional)</Label>
              <Textarea id="dato-nota" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDatoOpen(false)}>Cancelar</Button>
            <Button onClick={guardarDato} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo copiar */}
      <Dialog open={copiarOpen} onOpenChange={setCopiarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar métricas de otro espacio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Se copian solo las métricas (no los datos cargados).</p>
            <Select value={origen} onValueChange={setOrigen}>
              <SelectTrigger><SelectValue placeholder="Elegí un espacio" /></SelectTrigger>
              <SelectContent>
                {otrasVocalias.map((v) => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopiarOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarCopia} disabled={guardando}>{guardando ? "Copiando…" : "Copiar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  );
}
