import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, Download, FolderOpen, Lock, LockOpen, Minus, Plus, Sparkles, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VocaliaRow } from "@/hooks/useVocalias";
import { BLOQUES, BloqueDef, BloqueId, CausaRel, ModoBloque, Valores, calcularAuto } from "@/lib/relevamientos";
import { hoyArgentina } from "@/lib/terminacion";
import { exportarRelevamientoExcel, type EncabezadoRelevamiento } from "@/lib/exportRelevamientoExcel";
import { resolucionesPorTipo } from "@/lib/relevamientos";
import RelevamientoGraficos3D from "@/components/metricas/RelevamientoGraficos3D";

interface Props { vocaliaId: string; tribunalId: string | null; vocaliasTribunal: VocaliaRow[] }

interface Config { modos?: Partial<Record<BloqueId, ModoBloque>>; encabezado?: EncabezadoRelevamiento }
interface Datos {
  manual?: Partial<Record<BloqueId, Valores>>;
  ajustes?: Partial<Record<BloqueId, Valores>>;
  snapshot?: Partial<Record<BloqueId, Valores>>;
  snapshotBase?: Partial<Record<BloqueId, Valores>>;
}
interface Relevamiento {
  id: string; nombre: string; periodo_inicio: string; periodo_fin: string; estado: string; alcance: string;
  vocalia_id: string | null; tribunal_id: string | null; config: Config; datos: Datos; cerrado_at: string | null;
}

const fmt = (s: string) => s.split("-").reverse().join("/");
export default function RelevamientosPanel({ vocaliaId, tribunalId, vocaliasTribunal }: Props) {
  const [lista, setLista] = useState<Relevamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [bienvenida, setBienvenida] = useState(() => localStorage.getItem("iustrack-metricas-bienvenida") !== "oculta");

  const cargar = useCallback(async () => {
    setCargando(true);
    let q = supabase.from("relevamientos").select("*").order("created_at", { ascending: false });
    q = tribunalId ? q.or(`vocalia_id.eq.${vocaliaId},and(alcance.eq.oficina,tribunal_id.eq.${tribunalId})`) : q.eq("vocalia_id", vocaliaId);
    const { data, error } = await q;
    if (error) toast.error("No se pudieron cargar los relevamientos.");
    setLista(((data ?? []) as unknown as Relevamiento[]).map((r) => ({ ...r, config: r.config ?? {}, datos: r.datos ?? {} })));
    setCargando(false);
  }, [vocaliaId, tribunalId]);
  useEffect(() => { cargar(); }, [cargar]);

  const actual = lista.find((r) => r.id === abierto) ?? null;
  const actualizarLocal = (r: Relevamiento) => setLista((l) => l.map((x) => (x.id === r.id ? r : x)));

  const borrar = async (r: Relevamiento) => {
    if (!confirm(`¿Borrar el relevamiento "${r.nombre}"?`)) return;
    const { error } = await supabase.from("relevamientos").delete().eq("id", r.id);
    if (error) return toast.error("No se pudo borrar.");
    setLista((l) => l.filter((x) => x.id !== r.id));
  };

  return (
    <div className="metrics-section h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md border border-metrics-gold/40 bg-metrics-gold/10 text-metrics-gold"><Activity className="h-5 w-5" /></div>
          <h1 className="text-3xl font-semibold text-metrics-foreground sm:text-4xl">Estadísticas y relevamientos</h1>
          <p className="mt-2 text-sm text-metrics-muted sm:text-base">Armá relevamientos por período, calculados desde tus causas o cargados a mano.</p>
        </header>

        {bienvenida && (
          <section className="rounded-md border border-metrics-gold/45 bg-metrics-gold/5 p-5 shadow-metrics-glow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex max-w-3xl gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-metrics-gold" />
                <div><h2 className="text-lg font-semibold text-metrics-foreground">Convertí la actividad diaria en información útil</h2>
                  <p className="mt-1 text-sm leading-6 text-metrics-muted">Cada relevamiento es una carpeta con un período. Mientras está en borrador, los números automáticos se actualizan solos; al cerrarlo quedan congelados.</p></div></div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="ghost" className="text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground" onClick={() => setBienvenida(false)}>Entendido</Button>
                <Button className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={() => { localStorage.setItem("iustrack-metricas-bienvenida", "oculta"); setBienvenida(false); }}>No mostrar de nuevo</Button>
              </div>
            </div>
          </section>
        )}

        {actual ? (
          <DetalleRelevamiento rel={actual} vocaliaId={vocaliaId} vocaliasTribunal={vocaliasTribunal} onVolver={() => setAbierto(null)} onCambio={actualizarLocal} />
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-metrics-foreground">Relevamientos guardados</h2>
              <Button className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={() => setNuevo(true)}><Plus className="mr-1 h-4 w-4" /> Nuevo relevamiento</Button>
            </div>
            {cargando ? <div className="flex justify-center py-10 text-metrics-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : lista.length === 0 ? <div className="rounded-md border border-dashed border-metrics-border px-5 py-10 text-center text-sm text-metrics-muted">Todavía no hay relevamientos. Creá el primero.</div>
              : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lista.map((r) => (
                  <article key={r.id} onClick={() => setAbierto(r.id)} className="group cursor-pointer rounded-md border border-metrics-border bg-metrics-card p-4 transition-colors hover:border-metrics-gold">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-metrics-gold" /><h3 className="font-semibold text-metrics-foreground">{r.nombre}</h3></div>
                      <button aria-label="Borrar" className="text-metrics-muted opacity-0 hover:text-metrics-negative group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); borrar(r); }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-2 text-sm text-metrics-muted">{fmt(r.periodo_inicio)} — {fmt(r.periodo_fin)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className={`rounded-full border px-2 py-0.5 ${r.estado === "cerrado" ? "border-metrics-gold/60 text-metrics-gold" : "border-metrics-accent text-metrics-foreground"}`}>{r.estado === "cerrado" ? "Cerrado" : "Borrador"}</span>
                      <span className="rounded-full border border-metrics-border px-2 py-0.5 text-metrics-muted">{r.alcance === "oficina" ? "Toda la oficina" : "Este espacio"}</span>
                    </div>
                  </article>
                ))}
              </div>}
          </section>
        )}
      </div>
      <NuevoDialog open={nuevo} onOpenChange={setNuevo} vocaliaId={vocaliaId} tribunalId={tribunalId} onCreado={(r) => { setLista((l) => [r, ...l]); setAbierto(r.id); }} />
    </div>
  );
}

function NuevoDialog({ open, onOpenChange, vocaliaId, tribunalId, onCreado }: {
  open: boolean; onOpenChange: (v: boolean) => void; vocaliaId: string; tribunalId: string | null; onCreado: (r: Relevamiento) => void;
}) {
  const hoy = hoyArgentina();
  const [nombre, setNombre] = useState("");
  const [inicio, setInicio] = useState(hoy.slice(0, 8) + "01");
  const [fin, setFin] = useState(hoy);
  const [alcance, setAlcance] = useState("vocalia");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!nombre.trim()) return toast.error("Poné un nombre.");
    if (!inicio || !fin || inicio > fin) return toast.error("Revisá el período.");
    setGuardando(true);
    const { data: ses } = await supabase.auth.getSession();
    const modos = Object.fromEntries(BLOQUES.map((b) => [b.id, b.modoDefault]));
    const { data, error } = await supabase.from("relevamientos").insert({
      nombre: nombre.trim(), periodo_inicio: inicio, periodo_fin: fin, alcance, estado: "borrador",
      vocalia_id: vocaliaId, tribunal_id: tribunalId, config: { modos }, datos: {}, creado_por: ses.session?.user.id ?? null,
    } as never).select("*").single();
    setGuardando(false);
    if (error || !data) return toast.error("No se pudo crear el relevamiento.");
    onCreado({ ...(data as unknown as Relevamiento), config: { modos }, datos: {} });
    setNombre("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo relevamiento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Primer semestre 2026" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Desde</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></div>
          </div>
          <div><Label>Alcance</Label>
            <Select value={alcance} onValueChange={setAlcance}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="vocalia">Este espacio</SelectItem>{tribunalId && <SelectItem value="oficina">Toda la oficina</SelectItem>}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={crear} disabled={guardando}>Crear</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function traerCausas(vocaliaIds: string[]): Promise<CausaRel[]> {
  const out: CausaRel[] = [];
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    const { data, error } = await supabase.from("causas")
      .select("id,estado_causa,flagrancia,delegada,art196bis,fecha_ingreso,created_at,fecha_terminacion,modo_terminacion,violencia_genero,tipo_violencia_genero,sujetos(situacion_libertad,borrado_en)")
      .in("vocalia_id", vocaliaIds).is("borrado_en", null).order("id").range(desde, desde + paso - 1);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as CausaRel[]));
    if (!data || data.length < paso) break;
  }
  return out;
}

function DetalleRelevamiento({ rel, vocaliaId, vocaliasTribunal, onVolver, onCambio }: {
  rel: Relevamiento; vocaliaId: string; vocaliasTribunal: VocaliaRow[]; onVolver: () => void; onCambio: (r: Relevamiento) => void;
}) {
  const cerrado = rel.estado === "cerrado";
  const [causas, setCausas] = useState<CausaRel[] | null>(null);
  const [error, setError] = useState(false);
  const [graficos, setGraficos] = useState(false);

  const ids = useMemo(() => (rel.alcance === "oficina" && vocaliasTribunal.length ? vocaliasTribunal.map((v) => v.id) : [rel.vocalia_id ?? vocaliaId]), [rel.alcance, rel.vocalia_id, vocaliaId, vocaliasTribunal]);
  useEffect(() => {
    if (cerrado) return;
    setCausas(null); setError(false);
    traerCausas(ids).then(setCausas).catch(() => setError(true));
  }, [ids, cerrado]);

  const auto = useMemo(() => (causas ? calcularAuto(causas, rel.periodo_inicio, rel.periodo_fin) : null), [causas, rel.periodo_inicio, rel.periodo_fin]);

  const guardar = async (patch: Partial<Relevamiento>) => {
    const nuevo = { ...rel, ...patch };
    onCambio(nuevo);
    const { error: e } = await supabase.from("relevamientos").update(patch as never).eq("id", rel.id);
    if (e) toast.error("No se pudo guardar el cambio.");
  };

  const modo = (b: BloqueDef): ModoBloque => rel.config.modos?.[b.id] ?? b.modoDefault;
  const baseDe = (b: BloqueDef): Valores | null => {
    if (cerrado) return rel.datos.snapshotBase?.[b.id] ?? rel.datos.snapshot?.[b.id] ?? {};
    if (modo(b) === "manual") return rel.datos.manual?.[b.id] ?? {};
    return auto ? auto[b.id] : null;
  };
  const ajusteDe = (b: BloqueDef): Valores => modo(b) === "auto" ? (rel.datos.ajustes?.[b.id] ?? {}) : {};
  const finalesDe = (b: BloqueDef): Valores | null => {
    if (cerrado) return rel.datos.snapshot?.[b.id] ?? {};
    const base = baseDe(b);
    if (!base) return null;
    if (modo(b) === "manual") return base;
    const ajustes = ajusteDe(b);
    return Object.fromEntries(b.filas.flatMap((f) => b.columnas.map((c) => {
      const k = `${f.id}|${c.id}`;
      return [k, Math.max(0, (base[k] ?? 0) + (ajustes[k] ?? 0))];
    })));
  };
  const finales = Object.fromEntries(BLOQUES.map((b) => [b.id, finalesDe(b) ?? {}])) as Record<BloqueId, Valores>;
  const bases = Object.fromEntries(BLOQUES.map((b) => [b.id, baseDe(b) ?? {}])) as Record<BloqueId, Valores>;

  const cerrar = () => {
    if (!auto) return toast.error("Esperá a que terminen de calcularse los datos.");
    guardar({ estado: "cerrado", cerrado_at: new Date().toISOString(), datos: { ...rel.datos, snapshot: finales, snapshotBase: bases } });
    toast.success("Relevamiento cerrado: los datos quedaron congelados.");
  };
  const reabrir = () => guardar({ estado: "borrador", cerrado_at: null });
  const exportar = async () => {
    try {
      const cerradoSinCambios = cerrado && rel.config.modos?.resoluciones === "manual";
      await exportarRelevamientoExcel({
        nombre: rel.nombre, encabezado: rel.config.encabezado ?? {}, finales, bases,
        resolPorTipo: causas && !cerradoSinCambios ? resolucionesPorTipo(causas, rel.periodo_inicio, rel.periodo_fin) : null,
      });
      toast.success("Planilla oficial exportada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo exportar la planilla.");
    }
  };
  const [enc, setEnc] = useState<EncabezadoRelevamiento>(rel.config.encabezado ?? {});
  const guardarEnc = () => guardar({ config: { ...rel.config, encabezado: enc } });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-metrics-border bg-metrics-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" aria-label="Volver" className="text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground" onClick={onVolver}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-xl font-semibold text-metrics-foreground">{rel.nombre}</h2>
            <p className="text-xs text-metrics-muted">{fmt(rel.periodo_inicio)} — {fmt(rel.periodo_fin)} · {rel.alcance === "oficina" ? "Toda la oficina" : "Este espacio"} · {cerrado ? "Cerrado (datos congelados)" : "Borrador (se actualiza en vivo)"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="border-metrics-border bg-transparent text-metrics-foreground hover:bg-metrics-card" onClick={() => setGraficos(true)}><BarChart3 className="mr-1.5 h-4 w-4" /> Ver gráficos</Button>
          <Button variant="outline" className="border-metrics-border bg-transparent text-metrics-foreground hover:bg-metrics-card" onClick={exportar}><Download className="mr-1.5 h-4 w-4" /> Exportar a Excel</Button>
          {cerrado
            ? <Button variant="outline" className="border-metrics-border bg-transparent text-metrics-foreground hover:bg-metrics-card" onClick={reabrir}><LockOpen className="mr-1 h-4 w-4" /> Reabrir a borrador</Button>
            : <Button className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={cerrar}><Lock className="mr-1 h-4 w-4" /> Cerrar relevamiento</Button>}
        </div>
      </div>
      <div className="grid gap-3 rounded-md border border-metrics-border bg-metrics-card/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {([["juzgado", "Número de juzgado", "Ej: 23"], ["fiscalia", "Fiscalía de turno en el semestre", "Ej: 53"], ["defensoria", "Defensoría/s de turno", "Ej: 19/18"], ["distritos", "Distritos de turno", "Ej: 06/05/07"]] as const).map(([k, l, ph]) => (
          <div key={k}><Label className="text-metrics-muted">{l}</Label>
            <Input value={enc[k] ?? ""} placeholder={ph} disabled={cerrado} onChange={(e) => setEnc((p) => ({ ...p, [k]: e.target.value }))} onBlur={guardarEnc} /></div>
        ))}
      </div>
      {error && <p className="text-sm text-metrics-negative">No se pudieron leer las causas para el cálculo automático.</p>}

      {BLOQUES.map((b) => (
        <BloqueTabla key={b.id} def={b} modo={modo(b)} cerrado={cerrado} base={baseDe(b)} ajustes={ajusteDe(b)} valores={finalesDe(b)}
          onModo={(m) => guardar({ config: { ...rel.config, modos: { ...rel.config.modos, [b.id]: m } } })}
          onValor={(k, v) => guardar({ datos: { ...rel.datos, manual: { ...rel.datos.manual, [b.id]: { ...(rel.datos.manual?.[b.id] ?? {}), [k]: v } } } })}
          onAjuste={(k, v) => guardar({ datos: { ...rel.datos, ajustes: { ...rel.datos.ajustes, [b.id]: { ...(rel.datos.ajustes?.[b.id] ?? {}), [k]: v } } } })} />
      ))}
      <RelevamientoGraficos3D open={graficos} onOpenChange={setGraficos} nombre={rel.nombre} valores={finales} />
    </section>
  );
}

function NumericStepper({ value, min, onChange, label }: { value: number; min?: number; onChange: (value: number) => void; label: string }) {
  const ajustar = (n: number) => onChange(min === undefined ? n : Math.max(min, n));
  return (
    <div className="ml-auto flex h-9 w-[116px] overflow-hidden rounded-md border border-metrics-border bg-metrics-background shadow-sm focus-within:ring-2 focus-within:ring-metrics-gold/45">
      <Button type="button" size="icon" variant="ghost" aria-label={`Restar uno a ${label}`} onClick={() => ajustar(value - 1)} className="h-9 w-8 shrink-0 rounded-none border-r border-metrics-border text-metrics-muted hover:bg-metrics-card hover:text-metrics-gold"><Minus className="h-3.5 w-3.5" /></Button>
      <Input type="number" value={value} onChange={(e) => ajustar(Number(e.target.value) || 0)} aria-label={label} className="h-9 min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-1 text-center tabular-nums text-metrics-foreground shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <Button type="button" size="icon" variant="ghost" aria-label={`Sumar uno a ${label}`} onClick={() => ajustar(value + 1)} className="h-9 w-8 shrink-0 rounded-none border-l border-metrics-border text-metrics-muted hover:bg-metrics-card hover:text-metrics-gold"><Plus className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function BloqueTabla({ def, modo, cerrado, base, ajustes, valores, onModo, onValor, onAjuste }: {
  def: BloqueDef; modo: ModoBloque; cerrado: boolean; base: Valores | null; ajustes: Valores; valores: Valores | null;
  onModo: (m: ModoBloque) => void; onValor: (k: string, v: number) => void; onAjuste: (k: string, v: number) => void;
}) {
  const editable = modo === "manual" && !cerrado;
  const ajustable = modo === "auto" && !cerrado;
  const v = (f: string, c: string) => valores?.[`${f}|${c}`] ?? 0;
  const baseV = (f: string, c: string) => base?.[`${f}|${c}`] ?? 0;
  const ajusteV = (f: string, c: string) => ajustes[`${f}|${c}`] ?? 0;
  const filaTotal = (f: string) => def.columnas.reduce((s, c) => s + v(f, c.id), 0);
  const filasSuma = def.filas.filter((f) => !def.excluirDeTotal?.includes(f.id));
  const colTotal = (c: string) => filasSuma.reduce((s, f) => s + v(f.id, c), 0);
  const granTotal = filasSuma.reduce((s, f) => s + filaTotal(f.id), 0);
  const celda = "px-3 py-2 text-right tabular-nums";

  return (
    <article className="overflow-hidden rounded-md border border-metrics-border bg-metrics-card">
      <div className="grid gap-3 border-b border-metrics-border px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="hidden sm:block" />
        <div className="text-center"><h3 className="font-sans text-lg font-semibold text-metrics-foreground">{def.titulo}</h3>{def.subtitulo && <p className="text-xs text-metrics-muted">{def.subtitulo}</p>}</div>
        <label className="flex items-center justify-center gap-2 text-xs text-metrics-muted sm:justify-self-end">
          <span className={modo === "manual" ? "text-metrics-foreground" : ""}>Manual</span>
          <Switch checked={modo === "auto"} disabled={cerrado} onCheckedChange={(on) => onModo(on ? "auto" : "manual")} aria-label="Automático" />
          <span className={modo === "auto" ? "text-metrics-gold" : ""}>Automático</span>
        </label>
      </div>
      {valores === null ? <div className="flex justify-center py-6 text-metrics-muted"><Loader2 className="h-4 w-4 animate-spin" /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-metrics-foreground">
            <thead><tr className="text-xs uppercase text-metrics-muted">
              <th className="px-3 py-2 text-left font-medium"></th>
              {def.columnas.map((c) => <th key={c.id} className="px-3 py-2 text-right font-medium">{c.label}</th>)}
              {def.totalColumna && <th className="px-3 py-2 text-right font-medium text-metrics-gold">Total</th>}
            </tr></thead>
            <tbody>
              {def.filas.map((f) => (
                <tr key={f.id} className="border-t border-metrics-border/60">
                  <td className="px-3 py-2">{f.label}</td>
                  {def.columnas.map((c) => (
                    <td key={c.id} className={celda}>
                      {editable ? <NumericStepper value={v(f.id, c.id)} min={0} label={`${f.label}, ${c.label}`} onChange={(n) => onValor(`${f.id}|${c.id}`, n)} />
                        : ajustable ? <div className="min-w-[140px]"><div className="font-semibold text-metrics-foreground">{v(f.id, c.id)}</div><NumericStepper value={ajusteV(f.id, c.id)} label={`Ajuste de ${f.label}, ${c.label}`} onChange={(n) => onAjuste(`${f.id}|${c.id}`, n)} /><p className={`mt-1 whitespace-nowrap text-[10px] ${ajusteV(f.id, c.id) ? "font-medium text-metrics-gold" : "text-metrics-muted"}`}>Calculado {baseV(f.id, c.id)} · ajuste {ajusteV(f.id, c.id) > 0 ? "+" : ""}{ajusteV(f.id, c.id)}</p></div>
                          : <div><span>{v(f.id, c.id)}</span>{ajusteV(f.id, c.id) !== 0 && <p className="mt-0.5 whitespace-nowrap text-[10px] text-metrics-gold">Incluye ajuste {ajusteV(f.id, c.id) > 0 ? "+" : ""}{ajusteV(f.id, c.id)}</p>}</div>}
                    </td>
                  ))}
                  {def.totalColumna && <td className={`${celda} font-semibold text-metrics-gold`}>{filaTotal(f.id)}</td>}
                </tr>
              ))}
              {def.totalFila && (
                <tr className="border-t border-metrics-gold/40 bg-metrics-gold/5 font-semibold">
                  <td className="px-3 py-2 text-metrics-gold">Total{def.excluirDeTotal?.length ? " de resultados" : ""}</td>
                  {def.columnas.map((c) => <td key={c.id} className={celda}>{colTotal(c.id)}</td>)}
                  {def.totalColumna && <td className={`${celda} text-metrics-gold`}>{granTotal}</td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
