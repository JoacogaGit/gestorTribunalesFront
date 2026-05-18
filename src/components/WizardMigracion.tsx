import { useState } from "react";
import { Upload, Loader2, FileWarning, CheckCircle2, AlertTriangle, XCircle, Trash2, ArrowRight, Sparkles, FileSpreadsheet, FileText, Wand2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { parseMigracionFile, ArchivoParseado } from "@/lib/parseMigracionFile";
import { CausaIA, ResultadoIA, ResultadoIADirecto, ResultadoIAMapeo, useMigracion } from "@/hooks/useMigracion";

interface Props {
  vocaliaId: string | null;
  vocaliaNombre: string;
  onDone?: () => void;
}

const ACCEPT = ".xlsx,.xls,.csv,.docx,.txt";

export default function WizardMigracion({ vocaliaId, vocaliaNombre, onDone }: Props) {
  const { loading, error, procesar, cargarEnBD } = useMigracion();
  const [resultado, setResultado] = useState<ResultadoIADirecto | null>(null);
  const [mapeo, setMapeo] = useState<ResultadoIAMapeo | null>(null);
  const [archivoCache, setArchivoCache] = useState<ArchivoParseado | null>(null);
  const [seleccionMapeo, setSeleccionMapeo] = useState<Record<number, string>>({});
  const [filename, setFilename] = useState<string>("");
  const [editable, setEditable] = useState<CausaIA[]>([]);
  const [incluir, setIncluir] = useState<Record<string, boolean>>({});
  const [exito, setExito] = useState<{ causas: number; sujetos: number; eventos: number } | null>(null);

  if (!vocaliaId) {
    return (
      <Alert>
        <AlertTitle>Seleccioná una vocalía</AlertTitle>
        <AlertDescription>Para migrar causas necesitás tener una vocalía activa.</AlertDescription>
      </Alert>
    );
  }

  const handleFile = async (file: File) => {
    setFilename(file.name);
    try {
      const parsed = await parseMigracionFile(file);
      setArchivoCache(parsed);
      const r = await procesar(vocaliaId, vocaliaNombre, parsed);
      handleResultado(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo");
    }
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
    setExito(r.inserted);
    toast.success("Migración completada");
  };

  const handleDescartar = () => {
    setResultado(null); setEditable([]); setIncluir({}); setFilename("");
    setMapeo(null); setSeleccionMapeo({}); setArchivoCache(null);
  };

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
    <div className="max-w-2xl">
      <Alert className="mb-6">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Vocalía destino: {vocaliaNombre}</AlertTitle>
        <AlertDescription>
          Los datos se cargarán en la vocalía "{vocaliaNombre}". Si querés cargarlos en otra, cambiá de vocalía antes de continuar.
        </AlertDescription>
      </Alert>

      <Card
        className="p-10 border-dashed border-2 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => document.getElementById("wizard-file-input")?.click()}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-semibold mb-1">Arrastrá tu archivo o hacé click para seleccionar</p>
        <p className="text-xs text-muted-foreground mb-4">Formatos: .xlsx, .xls, .csv, .docx, .txt (máx 10 MB)</p>
        <Button type="button" variant="outline" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando…</> : "Seleccionar archivo"}
        </Button>
        <input
          id="wizard-file-input"
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </Card>

      {loading && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
          Nuestra IA está leyendo e interpretando tu archivo… esto puede tardar 30-90 segundos.
          {filename && <p className="mt-1 text-xs">{filename}</p>}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Algo falló</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
