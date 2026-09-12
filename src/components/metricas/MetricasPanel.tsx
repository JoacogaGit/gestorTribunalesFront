import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Copy, BarChart3, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { COLORES_TABLERO, colorSoftBg, resolverColor } from "@/lib/tableroColores";
import { useMetricas, Metrica, MetricaDato } from "@/hooks/useMetricas";
import type { VocaliaRow } from "@/hooks/useVocalias";
import MetricasOverview from "@/components/metricas/MetricasOverview";

interface Props {
  vocaliaId: string;
  vocaliasTribunal: VocaliaRow[];
}

/* -------------------- helpers de período -------------------- */

type TipoPeriodo = "mensual" | "trimestral" | "rango";

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
  const [guardando, setGuardando] = useState(false);

  const abrirNuevaMetrica = () => {
    setEditandoMetrica(null); setMNombre(""); setMUnidad(""); setMColor(COLORES_TABLERO[0].id); setMetricaOpen(true);
  };
  const abrirEditarMetrica = (m: Metrica) => {
    setEditandoMetrica(m); setMNombre(m.nombre); setMUnidad(m.unidad ?? ""); setMColor(m.color ?? COLORES_TABLERO[0].id); setMetricaOpen(true);
  };

  const guardarMetrica = async () => {
    if (!mNombre.trim()) { toast.error("Poné un nombre."); return; }
    setGuardando(true);
    const input = { nombre: mNombre.trim(), unidad: mUnidad.trim() || null, color: mColor };
    const { error } = editandoMetrica
      ? await actualizarMetrica(editandoMetrica.id, input)
      : await crearMetrica(input);
    setGuardando(false);
    if (error) { toast.error(error); return; }
    toast.success(editandoMetrica ? "Métrica actualizada" : "Métrica creada");
    setMetricaOpen(false);
  };

  /* --- diálogo dato --- */
  const hoy = new Date();
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
    setTipoPeriodo("mensual"); setAnio(hoy.getFullYear()); setMes(hoy.getMonth() + 1);
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
    const num = Number(valor.replace(",", "."));
    if (!Number.isFinite(num)) { toast.error("Ingresá un valor numérico."); return; }
    let inicio = "", fin = "";
    if (tipoPeriodo === "mensual") ({ inicio, fin } = rangoMensual(anio, mes));
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

  const metricaPorId = useMemo(() => new Map(metricas.map((m) => [m.id, m])), [metricas]);

  return (
    <div className="metrics-panel flex-1 min-h-0 overflow-y-auto rounded-md bg-metrics-background p-4 text-metrics-foreground sm:p-6 lg:p-8">
      <MetricasOverview metricas={metricas} datos={datos} />

      <div className="mt-8 space-y-8">
      {/* Métricas */}
      <section className="space-y-3 rounded-md border border-metrics-border bg-metrics-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-metrics-foreground">
            <BarChart3 className="h-4 w-4 text-metrics-gold" /> Gestión de métricas
          </h3>
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

        {loading && metricas.length === 0 ? (
          <p className="text-xs text-metrics-muted">Cargando…</p>
        ) : metricas.length === 0 ? (
          <p className="rounded-md border border-dashed border-metrics-border px-4 py-6 text-center text-xs text-metrics-muted">
            Todavía no hay métricas. Creá la primera para empezar a relevar datos.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {metricas.map((m) => (
              <div
                key={m.id}
                 className="flex items-center gap-3 rounded-md border border-metrics-border bg-metrics-background/55 px-3 py-2.5"
              >
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: resolverColor(m.color) ?? "hsl(var(--muted-foreground))" }} />
                <div className="min-w-0 flex-1">
                   <p className="truncate text-sm font-medium text-metrics-foreground">{m.nombre}</p>
                   <p className="text-[11px] text-metrics-muted">
                    {m.unidad ? m.unidad : "sin unidad"} · {datos.filter((d) => d.metrica_id === m.id).length} dato(s)
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-metrics-gold hover:bg-metrics-accent" onClick={() => abrirNuevoDato(m.id)}>
                  Cargar
                </Button>
                <button type="button" aria-label="Editar" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => abrirEditarMetrica(m)}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Eliminar"
                  className="p-1 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar la métrica "${m.nombre}" y sus datos cargados?`)) return;
                    const { error } = await eliminarMetrica(m.id);
                    if (error) toast.error(error); else toast.success("Métrica eliminada");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Datos cargados */}
      <section className="space-y-3 rounded-md border border-metrics-border bg-metrics-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-metrics-foreground">Datos cargados</h3>
          <Button size="sm" variant="outline" className="border-metrics-border bg-metrics-background text-metrics-foreground hover:bg-metrics-accent" onClick={() => abrirNuevoDato()} disabled={metricas.length === 0}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Cargar dato
          </Button>
        </div>

        {datos.length === 0 ? (
          <p className="rounded-md border border-dashed border-metrics-border px-4 py-6 text-center text-xs text-metrics-muted">
            Sin datos cargados todavía.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-metrics-border">
            <table className="w-full text-sm">
              <thead className="bg-metrics-background text-[11px] uppercase text-metrics-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Métrica</th>
                  <th className="px-3 py-2 text-left font-semibold">Período</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2 text-left font-semibold">Causa</th>
                  <th className="px-3 py-2 text-left font-semibold">Nota</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {datos.map((d) => {
                  const m = metricaPorId.get(d.metrica_id);
                  return (
                    <tr key={d.id} className="border-t border-metrics-border/70 hover:bg-metrics-background/40">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: resolverColor(m?.color) ?? "hsl(var(--muted-foreground))" }} />
                          {m?.nombre ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-metrics-muted">{formatearPeriodo(d.periodo_inicio, d.periodo_fin)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {d.valor}{m?.unidad ? ` ${m.unidad}` : ""}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-xs">
                        {d.causa ? `${d.causa.expediente_nro}${d.causa.caratula ? ` — ${d.causa.caratula}` : ""}` : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-xs text-metrics-muted">{d.nota ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button type="button" aria-label="Editar dato" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => abrirEditarDato(d)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Borrar dato"
                          className="p-1 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            if (!confirm("¿Borrar este dato?")) return;
                            const { error } = await eliminarDato(d.id);
                            if (error) toast.error(error); else toast.success("Dato borrado");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>

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
              <Label htmlFor="metrica-unidad">Unidad (opcional)</Label>
              <Input id="metrica-unidad" value={mUnidad} onChange={(e) => setMUnidad(e.target.value)} placeholder="Ej: audiencias, días, %" />
            </div>
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
            <DialogTitle>{editandoDato ? "Editar dato" : "Cargar dato"}</DialogTitle>
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
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="rango">Rango de fechas libre</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <div className="space-y-1.5">
              <Label htmlFor="dato-valor">Valor</Label>
              <Input id="dato-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej: 12" />
            </div>

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
