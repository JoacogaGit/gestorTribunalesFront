import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, FolderOpen, Lock, LockOpen, Plus, Sparkles, Trash2, Loader2 } from "lucide-react";
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

interface Props { vocaliaId: string; tribunalId: string | null; vocaliasTribunal: VocaliaRow[] }

interface Config { modos?: Partial<Record<BloqueId, ModoBloque>> }
interface Datos { manual?: Partial<Record<BloqueId, Valores>>; snapshot?: Partial<Record<BloqueId, Valores>> }
interface Relevamiento {
  id: string; nombre: string; periodo_inicio: string; periodo_fin: string; estado: string; alcance: string;
  vocalia_id: string | null; tribunal_id: string | null; config: Config; datos: Datos; cerrado_at: string | null;
}

const fmt = (s: string) => s.split("-").reverse().join("/");
const campo = "border-metrics-border bg-metrics-background text-metrics-foreground";

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
    <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
  const valoresDe = (b: BloqueDef): Valores | null => {
    if (modo(b) === "manual") return rel.datos.manual?.[b.id] ?? {};
    if (cerrado) return rel.datos.snapshot?.[b.id] ?? {};
    return auto ? auto[b.id] : null;
  };

  const cerrar = () => {
    if (!auto) return toast.error("Esperá a que terminen de calcularse los datos.");
    const snapshot = Object.fromEntries(BLOQUES.map((b) => [b.id, auto[b.id]]));
    guardar({ estado: "cerrado", cerrado_at: new Date().toISOString(), datos: { ...rel.datos, snapshot } });
    toast.success("Relevamiento cerrado: los datos quedaron congelados.");
  };
  const reabrir = () => guardar({ estado: "borrador", cerrado_at: null });

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
        {cerrado
          ? <Button variant="outline" className="border-metrics-border bg-transparent text-metrics-foreground hover:bg-metrics-card" onClick={reabrir}><LockOpen className="mr-1 h-4 w-4" /> Reabrir a borrador</Button>
          : <Button className="bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" onClick={cerrar}><Lock className="mr-1 h-4 w-4" /> Cerrar relevamiento</Button>}
      </div>
      {error && <p className="text-sm text-metrics-negative">No se pudieron leer las causas para el cálculo automático.</p>}

      {BLOQUES.map((b) => (
        <BloqueTabla key={b.id} def={b} modo={modo(b)} cerrado={cerrado} valores={valoresDe(b)}
          onModo={(m) => guardar({ config: { ...rel.config, modos: { ...rel.config.modos, [b.id]: m } } })}
          onValor={(k, v) => guardar({ datos: { ...rel.datos, manual: { ...rel.datos.manual, [b.id]: { ...(rel.datos.manual?.[b.id] ?? {}), [k]: v } } } })} />
      ))}
    </section>
  );
}

function BloqueTabla({ def, modo, cerrado, valores, onModo, onValor }: {
  def: BloqueDef; modo: ModoBloque; cerrado: boolean; valores: Valores | null;
  onModo: (m: ModoBloque) => void; onValor: (k: string, v: number) => void;
}) {
  const editable = modo === "manual" && !cerrado;
  const v = (f: string, c: string) => valores?.[`${f}|${c}`] ?? 0;
  const filaTotal = (f: string) => def.columnas.reduce((s, c) => s + v(f, c.id), 0);
  const filasSuma = def.filas.filter((f) => !def.excluirDeTotal?.includes(f.id));
  const colTotal = (c: string) => filasSuma.reduce((s, f) => s + v(f.id, c), 0);
  const granTotal = filasSuma.reduce((s, f) => s + filaTotal(f.id), 0);
  const celda = "px-3 py-2 text-right tabular-nums";

  return (
    <article className="overflow-hidden rounded-md border border-metrics-border bg-metrics-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-metrics-border px-4 py-3">
        <div><h3 className="font-semibold text-metrics-foreground">{def.titulo}</h3>{def.subtitulo && <p className="text-xs text-metrics-muted">{def.subtitulo}</p>}</div>
        <label className="flex items-center gap-2 text-xs text-metrics-muted">
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
                      {editable
                        ? <Input type="number" min={0} defaultValue={v(f.id, c.id) || ""} key={`${f.id}|${c.id}|${v(f.id, c.id)}`}
                            onBlur={(e) => { const n = Math.max(0, Number(e.target.value) || 0); if (n !== v(f.id, c.id)) onValor(`${f.id}|${c.id}`, n); }}
                            className={`ml-auto h-8 w-20 text-right ${campo}`} />
                        : v(f.id, c.id)}
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
