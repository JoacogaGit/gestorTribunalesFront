import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, FileWarning, CheckCircle2, AlertTriangle, XCircle, Trash2, ArrowRight, Sparkles, FileSpreadsheet, FileText, Wand2, ShieldCheck, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { parseMigracionFile, ArchivoParseado, PestanaParseada } from "@/lib/parseMigracionFile";
import { CausaIA, ResultadoIA, ResultadoIADirecto, ResultadoIAMapeo, useMigracion } from "@/hooks/useMigracion";
import { deduplicarCausas } from "@/lib/deduplicarCausas";
import { dividirPestanaEnLotes, dividirLoteEnMitades, MIN_FILAS_LOTE } from "@/lib/dividirEnLotes";
import ProgresoLotes from "@/components/migracion/ProgresoLotes";

type EstadoLote = "pendiente" | "procesando" | "ok" | "error";
interface LoteTrabajo {
  id: string;
  pestana: string;
  nro_lote: number;
  total_lotes: number;
  contenido: string[][];
  filas: number;
  estado: EstadoLote;
  errorCode?: string;
  errorMsg?: string;
}

const ADAPTIVE_ERRORS = new Set(["worker_resource_limit", "anthropic_timeout"]);
const ERROR_LABELS: Record<string, string> = {
  anthropic_timeout: "timeout de Anthropic",
  worker_resource_limit: "límite de recursos",
  payload_too_large: "payload demasiado grande",
  no_api_key: "falta API key",
  forbidden: "sin permisos",
  json_invalido: "respuesta inválida de la IA",
  ai_error: "error de IA",
  mapeo_requerido: "requiere mapeo asistido",
  unknown: "error desconocido",
};
const labelError = (code?: string) => ERROR_LABELS[code || "unknown"] || code || "error";
const lsKey = (vocaliaId: string) => `migracion_v1_${vocaliaId}`;

export interface MigracionStatus {
  activa: boolean;
  procesando: boolean;
  totalLotes: number;
  lotesOk: number;
  lotesError: number;
  hasResultado: boolean;
  hasExito: boolean;
}

interface Props {
  vocaliaId: string | null;
  vocaliaNombre: string;
  onDone?: () => void;
  onStatusChange?: (s: MigracionStatus) => void;
}

const ACCEPT = ".xlsx,.xls,.csv,.docx,.txt";

export default function WizardMigracion({ vocaliaId, vocaliaNombre, onDone, onStatusChange }: Props) {
  const { loading, error, procesar, procesarUnLote, cargarEnBD } = useMigracion();
  const [resultado, setResultado] = useState<ResultadoIADirecto | null>(null);
  const [mapeo, setMapeo] = useState<ResultadoIAMapeo | null>(null);
  const [archivoCache, setArchivoCache] = useState<ArchivoParseado | null>(null);
  const [seleccionMapeo, setSeleccionMapeo] = useState<Record<number, string>>({});
  const [filename, setFilename] = useState<string>("");
  const [editable, setEditable] = useState<CausaIA[]>([]);
  const [incluir, setIncluir] = useState<Record<string, boolean>>({});
  const [exito, setExito] = useState<{ causas: number; sujetos: number; eventos: number } | null>(null);
  // Multi-pestaña / multi-lote
  const [pestanasDetectadas, setPestanasDetectadas] = useState<{ nombre: string; filas: number }[]>([]);
  const [seleccionPestanas, setSeleccionPestanas] = useState<Record<string, boolean>>({});
  const [lotes, setLotes] = useState<LoteTrabajo[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [resultadosOk, setResultadosOk] = useState<{ pestana: string; resultado: ResultadoIADirecto }[]>([]);
  // Resume desde localStorage
  const [pendingResume, setPendingResume] = useState<{ filename: string; timestamp: number; resultadosOk: { pestana: string; resultado: ResultadoIADirecto }[] } | null>(null);
  const cancelarRef = useRef(false);

  // Cargar estado pendiente de localStorage al montar
  useEffect(() => {
    if (!vocaliaId) return;
    try {
      const raw = localStorage.getItem(lsKey(vocaliaId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.resultadosOk?.length > 0) setPendingResume(parsed);
    } catch { /* noop */ }
  }, [vocaliaId]);

  // Reportar status al padre
  useEffect(() => {
    if (!onStatusChange) return;
    const lotesOk = lotes.filter((l) => l.estado === "ok").length;
    const lotesError = lotes.filter((l) => l.estado === "error").length;
    const activa = procesando || lotes.length > 0 || !!resultado || !!exito;
    onStatusChange({
      activa,
      procesando,
      totalLotes: lotes.length,
      lotesOk,
      lotesError,
      hasResultado: !!resultado,
      hasExito: !!exito,
    });
  }, [procesando, lotes, resultado, exito, onStatusChange]);

  if (!vocaliaId) {
    return (
      <Alert>
        <AlertTitle>Seleccioná una vocalía</AlertTitle>
        <AlertDescription>Para migrar causas necesitás tener una vocalía activa.</AlertDescription>
      </Alert>
    );
  }

  const guardarLS = (ok: { pestana: string; resultado: ResultadoIADirecto }[], fn: string) => {
    try { localStorage.setItem(lsKey(vocaliaId), JSON.stringify({ filename: fn, timestamp: Date.now(), resultadosOk: ok })); } catch { /* noop */ }
  };
  const limpiarLS = () => { try { localStorage.removeItem(lsKey(vocaliaId)); } catch { /* noop */ } };

  const contarFilas = (p: ArchivoParseado["pestanas"][number]): number => {
    if (typeof p.contenido === "string") return p.contenido.split("\n").filter((l) => l.trim()).length;
    return p.contenido.filter((r) => r.some((c) => (c ?? "").toString().trim() !== "")).length;
  };

  const handleFile = async (file: File) => {
    setFilename(file.name);
    try {
      const parsed = await parseMigracionFile(file);
      setArchivoCache(parsed);
      const detectadas = parsed.pestanas.map((p) => ({ nombre: p.nombre, filas: contarFilas(p) })).filter((p) => p.filas > 0);
      if (detectadas.length === 0) {
        toast.error("El archivo no tiene filas para procesar.");
        return;
      }
      setPestanasDetectadas(detectadas);
      const sel: Record<string, boolean> = {};
      detectadas.forEach((p) => { sel[p.nombre] = true; });
      setSeleccionPestanas(sel);
      if (detectadas.length === 1) {
        const lotesIniciales = construirLotes(parsed, [detectadas[0].nombre]);
        await ejecutarLotes(parsed, lotesIniciales);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo");
    }
  };

  const construirLotes = (archivo: ArchivoParseado, nombres: string[]): LoteTrabajo[] => {
    const out: LoteTrabajo[] = [];
    for (const nombre of nombres) {
      const pest = archivo.pestanas.find((p) => p.nombre === nombre);
      if (!pest) continue;
      const subs = dividirPestanaEnLotes(pest);
      subs.forEach((s, idx) => {
        out.push({
          id: `${nombre}::${s.nro_lote}::${idx}::${Math.random().toString(36).slice(2, 8)}`,
          pestana: nombre,
          nro_lote: s.nro_lote,
          total_lotes: s.total_lotes,
          contenido: s.pestana.contenido as string[][],
          filas: s.filas,
          estado: "pendiente",
        });
      });
    }
    return out;
  };

  const ejecutarLotes = async (archivo: ArchivoParseado, lotesIniciales: LoteTrabajo[]) => {
    setProcesando(true);
    cancelarRef.current = false;
    let current = lotesIniciales;
    setLotes(current);
    const archivoMeta: ArchivoParseado = { ...archivo, pestanas: [] };
    const okAcum: { pestana: string; resultado: ResultadoIADirecto }[] = [...resultadosOk];

    for (let i = 0; i < current.length; i++) {
      if (cancelarRef.current) break;
      if (current[i].estado !== "pendiente") continue;
      current = current.map((l, idx) => idx === i ? { ...l, estado: "procesando" as EstadoLote } : l);
      setLotes(current);
      const lote = current[i];
      const pestPayload: PestanaParseada = { nombre: lote.pestana, contenido: lote.contenido };
      const r = await procesarUnLote(vocaliaId, vocaliaNombre, archivoMeta, pestPayload,
        { pestana: lote.pestana, nro_lote: lote.nro_lote, total_lotes: lote.total_lotes, filas: lote.filas });
      if (r.ok && r.resultado) {
        current = current.map((l, idx) => idx === i ? { ...l, estado: "ok" as EstadoLote, errorCode: undefined, errorMsg: undefined } : l);
        setLotes(current);
        okAcum.push({ pestana: `${lote.pestana} · lote ${lote.nro_lote}/${lote.total_lotes}`, resultado: r.resultado });
        setResultadosOk([...okAcum]);
        guardarLS(okAcum, filename);
      } else {
        current = current.map((l, idx) => idx === i ? { ...l, estado: "error" as EstadoLote, errorCode: r.errorCode, errorMsg: r.errorMsg } : l);
        setLotes(current);
      }
    }
    setProcesando(false);
    const fallidos = current.filter((l) => l.estado === "error");
    const oks = current.filter((l) => l.estado === "ok");
    if (oks.length > 0 && fallidos.length === 0) {
      finalizarConResultados(okAcum);
    } else if (oks.length === 0 && fallidos.length > 0) {
      toast.error("Ningún lote pudo procesarse. Revisá y reintentá.");
    }
  };

  const finalizarConResultados = (lista: { pestana: string; resultado: ResultadoIADirecto }[]) => {
    const unificado = deduplicarCausas(lista);
    setResultado(unificado);
    setEditable(unificado.causas);
    const inc: Record<string, boolean> = {};
    unificado.causas.forEach((c) => { inc[c.id_temporal] = c.confianza !== "rojo"; });
    setIncluir(inc);
  };

  const handleProcesarSeleccion = async () => {
    if (!archivoCache) return;
    const nombres = pestanasDetectadas.filter((p) => seleccionPestanas[p.nombre]).map((p) => p.nombre);
    if (nombres.length === 0) { toast.error("Elegí al menos una pestaña."); return; }
    const ini = construirLotes(archivoCache, nombres);
    await ejecutarLotes(archivoCache, ini);
  };

  const handleReintentarFallidos = async () => {
    if (!archivoCache) return;
    const nuevos: LoteTrabajo[] = [];
    let split = 0, retry = 0;
    for (const l of lotes) {
      if (l.estado !== "error") { nuevos.push(l); continue; }
      if (ADAPTIVE_ERRORS.has(l.errorCode || "") && l.filas > MIN_FILAS_LOTE) {
        const fakePest: PestanaParseada = { nombre: l.pestana, contenido: l.contenido };
        const mitades = dividirLoteEnMitades({ pestana: fakePest, nro_lote: l.nro_lote, total_lotes: l.total_lotes, filas: l.filas });
        if (mitades) {
          mitades.forEach((m, idx) => {
            nuevos.push({
              id: `${l.id}.${idx}`,
              pestana: l.pestana,
              nro_lote: l.nro_lote,
              total_lotes: l.total_lotes,
              contenido: m.pestana.contenido as string[][],
              filas: m.filas,
              estado: "pendiente",
            });
          });
          split++;
          continue;
        }
      }
      nuevos.push({ ...l, estado: "pendiente", errorCode: undefined, errorMsg: undefined });
      retry++;
    }
    if (split + retry === 0) return;
    if (split > 0) toast.info(`${split} lote(s) divididos en mitades para reintentar.`);
    await ejecutarLotes(archivoCache, nuevos);
  };

  const handleContinuarConOk = () => {
    if (resultadosOk.length === 0) return;
    finalizarConResultados(resultadosOk);
  };

  const handleRetomar = () => {
    if (!pendingResume) return;
    setResultadosOk(pendingResume.resultadosOk);
    finalizarConResultados(pendingResume.resultadosOk);
    setFilename(pendingResume.filename);
    setPendingResume(null);
  };
  const handleDescartarResume = () => {
    limpiarLS();
    setPendingResume(null);
  };


  const handleResultado = (r: ResultadoIA | null) => {
    if (!r) return;
    if (r.modo === "mapeo_asistido_requerido") {
      setMapeo(r);
      const inicial: Record<number, string> = {};
      r.columnas_detectadas.forEach((c) => { inicial[c.indice] = "(ignorar)"; });
      setSeleccionMapeo(inicial);
      return;
    }
    const directo: ResultadoIADirecto = r;
    setMapeo(null);
    setResultado(directo);
    setEditable(directo.causas);
    const inc: Record<string, boolean> = {};
    directo.causas.forEach((c) => { inc[c.id_temporal] = c.confianza !== "rojo"; });
    setIncluir(inc);
  };

  const handleReprocesar = async () => {
    if (!archivoCache) return;
    const mapeoManual: Record<string, string> = {};
    Object.entries(seleccionMapeo).forEach(([idx, campo]) => {
      if (campo && campo !== "(ignorar)") mapeoManual[idx] = campo;
    });
    if (Object.keys(mapeoManual).length === 0) {
      toast.error("Asigná al menos una columna.");
      return;
    }
    const r = await procesar(vocaliaId, vocaliaNombre, archivoCache, mapeoManual);
    if (r && r.modo === "mapeo_asistido_requerido") {
      toast.error("La IA sigue sin poder procesar. Revisá el mapeo.");
      setMapeo(r);
      return;
    }
    handleResultado(r);
  };

  const handleCargar = async () => {
    if (!resultado) return;
    const seleccionadas = editable.filter((c) => incluir[c.id_temporal]);
    if (seleccionadas.length === 0) {
      toast.error("Tenés que incluir al menos una causa.");
      return;
    }
    const r = await cargarEnBD(vocaliaId, seleccionadas);
    if ("error" in r) {
      toast.error(r.error);
      return;
    }
    // Insertar filas rojas (no procesables) en migracion_pendientes para revisión manual
    try {
      const todasFilasRojas = [
        ...(resultado.filas_rojas || []),
        ...resultadosOk.flatMap((ok) => ok.resultado.filas_rojas || []),
      ];
      if (todasFilasRojas.length > 0) {
        const payload = todasFilasRojas.map((f) => ({
          vocalia_id: vocaliaId,
          datos_crudos: f.datos_crudos || "",
          razon: f.razon || null,
          archivo_origen: filename || null,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (await import("@/integrations/supabase/client")).supabase.from("migracion_pendientes").insert(payload as any);
      }
    } catch { /* noop: la carga principal ya fue exitosa */ }
    setExito(r.inserted);
    limpiarLS();
    toast.success("Migración completada");
  };

  const handleDescartar = () => {
    setResultado(null); setEditable([]); setIncluir({}); setFilename("");
    setMapeo(null); setSeleccionMapeo({}); setArchivoCache(null);
    setPestanasDetectadas([]); setSeleccionPestanas({}); setLotes([]);
    setResultadosOk([]); setProcesando(false);
    limpiarLS();
  };

  // PASO 1.5 — Progreso por lote
  if (procesando || (lotes.length > 0 && !resultado && !mapeo)) {
    return (
      <ProgresoLotes
        lotes={lotes}
        procesando={procesando}
        filename={filename}
        completos={lotes.filter((l) => l.estado === "ok").length}
        fallidos={lotes.filter((l) => l.estado === "error").length}
        onDescartar={handleDescartar}
        onReintentar={handleReintentarFallidos}
        onContinuar={handleContinuarConOk}
        labelError={labelError}
      />
    );
  }


  // PASO 1.4 — Selección de pestañas (solo si hay más de una)
  if (pestanasDetectadas.length > 1 && !resultado && !mapeo && lotes.length === 0) {
    const seleccionadas = pestanasDetectadas.filter((p) => seleccionPestanas[p.nombre]).length;
    return (
      <div className="px-4 py-6">
        <div className="w-full max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 mb-4">
              <FileSpreadsheet className="w-7 h-7 text-accent" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Elegí qué pestañas procesar</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Detectamos {pestanasDetectadas.length} pestañas en <span className="font-mono">{filename}</span>. Vamos a procesarlas
              de a una para evitar timeouts. Después unificamos los datos.
            </p>
          </div>
          <Card className="p-2">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60 mb-1 text-xs">
              <span className="text-muted-foreground">{seleccionadas} de {pestanasDetectadas.length} seleccionadas</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                  const s: Record<string, boolean> = {}; pestanasDetectadas.forEach((p) => { s[p.nombre] = true; }); setSeleccionPestanas(s);
                }}>Todas</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSeleccionPestanas({})}>Ninguna</Button>
              </div>
            </div>
            <div className="space-y-1">
              {pestanasDetectadas.map((p) => (
                <label key={p.nombre} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/40 cursor-pointer">
                  <Checkbox
                    checked={!!seleccionPestanas[p.nombre]}
                    onCheckedChange={(v) => setSeleccionPestanas((m) => ({ ...m, [p.nombre]: !!v }))}
                  />
                  <span className="flex-1 text-sm font-medium truncate">{p.nombre}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.filas} filas</Badge>
                </label>
              ))}
            </div>
          </Card>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleDescartar}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Cancelar
            </Button>
            <Button onClick={handleProcesarSeleccion} disabled={seleccionadas === 0 || loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Procesar {seleccionadas} pestaña{seleccionadas === 1 ? "" : "s"} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // PASO 2 — Mapeo asistido
  if (mapeo) {
    return (
      <div className="max-w-4xl pb-24">
        <Alert className="mb-6">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Mapeo asistido</AlertTitle>
          <AlertDescription>
            La IA no pudo detectar automáticamente las columnas. Asigná a cada columna del archivo el campo que le corresponde y volvé a procesar.
          </AlertDescription>
        </Alert>
        {mapeo.razon && (
          <p className="text-xs text-muted-foreground mb-4">{mapeo.razon}</p>
        )}
        <div className="space-y-2">
          {mapeo.columnas_detectadas.map((col) => (
            <Card key={col.indice} className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_240px] gap-3 items-center">
                <div className="text-xs">
                  <p className="font-mono font-semibold">Col #{col.indice}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    Hipótesis IA: <span className="text-foreground">{col.hipotesis || "—"}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {col.muestra.slice(0, 3).map((m, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-mono truncate max-w-[200px]">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Select
                  value={seleccionMapeo[col.indice] ?? "(ignorar)"}
                  onValueChange={(v) => setSeleccionMapeo((m) => ({ ...m, [col.indice]: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="(ignorar)">(Ignorar columna)</SelectItem>
                    {mapeo.campos_disponibles.map((campo) => (
                      <SelectItem key={campo} value={campo}>{campo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>

        <div className="fixed bottom-0 left-56 right-0 bg-card/95 backdrop-blur border-t border-border p-4 flex items-center justify-between gap-4 z-30">
          <p className="text-xs text-muted-foreground">
            Asigná los campos que correspondan y reprocesá. Las columnas en "(Ignorar)" no se usan.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDescartar} disabled={loading}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Descartar
            </Button>
            <Button onClick={handleReprocesar} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reprocesar con mi mapeo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // PASO 4 — éxito
  if (exito) {
    const totalRojas = (resultado?.filas_rojas?.length || 0)
      + resultadosOk.reduce((a, ok) => a + (ok.resultado.filas_rojas?.length || 0), 0);
    const scrollToPendientes = () => {
      const el = document.getElementById("pendientes-revision-anchor");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (
      <div className="max-w-2xl">
        <Card className="p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-alert-ok/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-alert-ok" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">¡Migración completada!</h2>
          <p className="text-muted-foreground mb-6">
            Se cargaron <strong>{exito.causas} causas</strong>, <strong>{exito.sujetos} sujetos</strong> y <strong>{exito.eventos} eventos</strong> en {vocaliaNombre}.
          </p>
          <Button onClick={() => { setExito(null); handleDescartar(); onDone?.(); }}>
            Ir al panel <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
        {totalRojas > 0 && (
          <div className="mt-5 rounded-lg border-2 border-orange-500 bg-orange-500/15 p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-orange-900 dark:text-orange-200 mb-1">
                  ⚠️ {totalRojas} {totalRojas === 1 ? "causa no pudo migrarse automáticamente" : "causas no pudieron migrarse automáticamente"}
                </h3>
                <p className="text-sm text-orange-900/90 dark:text-orange-100/90 mb-3">
                  Revisalas en la sección <strong>"Pendientes de revisión manual"</strong> más abajo
                  para cargarlas manualmente o descartarlas.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={scrollToPendientes}
                >
                  Ver pendientes <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PASO 3 — Revisión
  if (resultado) {
    const totales = {
      causas: editable.filter((c) => incluir[c.id_temporal]).length,
      sujetos: editable.filter((c) => incluir[c.id_temporal]).reduce((a, c) => a + c.sujetos.length, 0),
      eventos: editable.filter((c) => incluir[c.id_temporal]).reduce((a, c) => a + c.eventos.length, 0),
    };
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl">
       <div className="flex-1 overflow-y-auto pr-1 pb-4">
        <p className="text-sm text-muted-foreground mb-4">
          Revisá y editá los datos detectados. Solo se cargarán las causas marcadas.
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          {[
            { label: "Causas", value: resultado.resumen.causas_detectadas },
            { label: "Sujetos", value: resultado.resumen.sujetos_detectados },
            { label: "Eventos", value: resultado.resumen.eventos_detectados },
            { label: "Verdes", value: resultado.resumen.verdes, c: "text-alert-ok" },
            { label: "Amarillas", value: resultado.resumen.amarillos, c: "text-amber-500" },
            { label: "Rojas", value: resultado.resumen.rojos, c: "text-alert-urgent" },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.c ?? ""}`}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
        {resultado.pestanas_procesadas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 text-xs">
            <span className="text-muted-foreground">Pestañas:</span>
            {resultado.pestanas_procesadas.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
          </div>
        )}

        <div className="space-y-2">
          {editable.map((c, idx) => {
            const borde = c.confianza === "verde" ? "border-l-alert-ok"
              : c.confianza === "amarillo" ? "border-l-amber-500"
              : "border-l-alert-urgent";
            return (
              <Collapsible key={c.id_temporal}>
                <Card className={`border-l-4 ${borde}`}>
                  <div className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={incluir[c.id_temporal] ?? false}
                      onCheckedChange={(v) => setIncluir((m) => ({ ...m, [c.id_temporal]: !!v }))}
                    />
                    <CollapsibleTrigger className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{c.expediente_nro || "(sin nº)"}</span>
                        <span className="text-sm truncate">{c.caratula || "—"}</span>
                        <Badge variant="outline" className="text-[10px]">{c.estado_causa}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {c.sujetos.length} suj · {c.eventos.length} ev
                        </span>
                      </div>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="p-4 pt-0 space-y-3">
                    {c.notas_ia && (
                      <Alert className="py-2">
                        <FileWarning className="w-4 h-4" />
                        <AlertDescription className="text-xs">{c.notas_ia}</AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input value={c.expediente_nro} onChange={(e) => {
                        const v = e.target.value;
                        setEditable((arr) => arr.map((x, i) => i === idx ? { ...x, expediente_nro: v } : x));
                      }} placeholder="Expediente nº" />
                      <Input value={c.caratula ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setEditable((arr) => arr.map((x, i) => i === idx ? { ...x, caratula: v } : x));
                      }} placeholder="Carátula" />
                    </div>
                    {c.sujetos.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">Sujetos</p>
                        {c.sujetos.map((s, si) => (
                          <div key={si} className="text-xs p-2 rounded bg-muted/40">
                            <strong>{s.nombre_completo}</strong> — {s.situacion_libertad}
                            {s.delito && <span className="text-muted-foreground"> · {s.delito}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {c.eventos.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">Eventos</p>
                        {c.eventos.map((e, ei) => (
                          <div key={ei} className="text-xs p-2 rounded bg-muted/40">
                            <strong>{e.titulo}</strong>
                            {e.fecha_hora && <span className="text-muted-foreground"> · {e.fecha_hora.slice(0, 10)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {resultado.filas_rojas?.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-alert-urgent" />
              Filas no procesables ({resultado.filas_rojas.length})
            </h3>
            <div className="space-y-1.5">
              {resultado.filas_rojas.map((f, i) => (
                <div key={i} className="text-xs p-2.5 rounded border border-alert-urgent/30 bg-alert-urgent/5">
                  <p className="text-foreground"><strong>Razón:</strong> {f.razon}</p>
                  <p className="text-muted-foreground mt-1 font-mono">{f.datos_crudos}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

        <div className="shrink-0 bg-card/95 backdrop-blur border-t border-border px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-sm">
            Vas a cargar <strong>{totales.causas}</strong> causas, <strong>{totales.sujetos}</strong> sujetos y <strong>{totales.eventos}</strong> eventos en {vocaliaNombre}.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDescartar} disabled={loading}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Descartar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={loading || totales.causas === 0}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Cargar todo en {vocaliaNombre}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar carga?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se van a crear {totales.causas} causas, {totales.sujetos} sujetos y {totales.eventos} eventos en {vocaliaNombre}. Esta acción se puede revertir borrando uno por uno.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCargar}>Confirmar y cargar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  }

  // PASO 1 — Subida
  return (
    <div className="px-4 py-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 mb-4 shadow-[var(--shadow-soft)]">
            <Sparkles className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Bienvenido a la migración asistida
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Cargá tu planilla y dejá que la IA haga el trabajo pesado. Vos solo revisás los resultados
            y confirmás qué cargar en <span className="text-foreground font-medium">{vocaliaNombre}</span>.
            Es seguro, rápido y reversible.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" className="text-[10px]">.xlsx</Badge>
            <Badge variant="secondary" className="text-[10px]">.xls</Badge>
            <Badge variant="secondary" className="text-[10px]">.csv</Badge>
            <Badge variant="secondary" className="text-[10px]">.docx</Badge>
            <Badge variant="secondary" className="text-[10px]">.txt</Badge>
            <span className="text-[10px] text-muted-foreground">· máx 10 MB</span>
          </div>
        </div>

        {pendingResume && (
          <Card className="p-4 mb-5 border-accent/40 bg-accent/5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5">Tenés una migración en progreso</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{pendingResume.filename || "archivo sin nombre"}</span> ·
                  {" "}{pendingResume.resultadosOk.length} lote(s) ya procesados ·
                  {" "}{new Date(pendingResume.timestamp).toLocaleString()}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleRetomar}>
                    Retomar revisión <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDescartarResume}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Descartar y empezar de nuevo
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}



        {/* Drop zone */}
        <Card
          className="relative p-10 border-dashed border-2 text-center cursor-pointer transition-all hover:border-accent/50 hover:bg-accent/[0.03] hover:shadow-[var(--shadow-elevated)] group"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => document.getElementById("wizard-file-input")?.click()}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted group-hover:bg-accent/10 transition-colors mb-4">
            <Upload className="w-7 h-7 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
          <p className="font-display text-lg font-semibold mb-1">
            Arrastrá tu archivo acá
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            o hacé click para seleccionarlo desde tu equipo
          </p>
          <Button type="button" variant="default" disabled={loading} className="shadow-[var(--shadow-soft)]">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Seleccionar archivo</>
            )}
          </Button>
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel · CSV</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Word · TXT</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>máx 10 MB</span>
          </div>
          <input
            id="wizard-file-input"
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </Card>

        {/* Cómo funciona */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          {[
            { icon: Upload, title: "1. Subís", desc: "Tu planilla, lista de causas o documento de trabajo. No importa el formato exacto." },
            { icon: Wand2, title: "2. La IA interpreta", desc: "Detecta causas, sujetos, fechas, estados y los organiza según el esquema de JusTrack." },
            { icon: ShieldCheck, title: "3. Revisás", desc: "Editás lo que haga falta, marcás qué incluir y qué descartar. Las dudosas quedan marcadas." },
            { icon: CheckCircle2, title: "4. Cargás", desc: "Confirmás y todo queda guardado en la vocalía. Las filas que no pudieron procesarse quedan para revisión manual." },
          ].map((s) => (
            <div key={s.title} className="p-4 rounded-lg border border-border/60 bg-card/50">
              <div className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold mb-0.5">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Aviso vocalía destino */}
        <Alert className="mt-6 border-accent/30 bg-accent/5">
          <AlertTriangle className="w-4 h-4 text-accent" />
          <AlertTitle className="text-sm">Vocalía destino: {vocaliaNombre}</AlertTitle>
          <AlertDescription className="text-xs">
            Todo se va a cargar acá. Si querés usar otra vocalía, cambiala desde el selector antes de subir el archivo.
          </AlertDescription>
        </Alert>

        {loading && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
            Nuestra IA está leyendo tu archivo… esto puede tardar 30-90 segundos.
            {filename && <p className="mt-1 text-xs font-mono">{filename}</p>}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Algo falló</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
