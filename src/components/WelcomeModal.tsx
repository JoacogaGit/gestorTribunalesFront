import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, FileText, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Causa } from "@/data/mockCausas";
import { extraerCausas } from "@/lib/causaParser";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  vocalia: number;
  onImport: (causas: Causa[]) => void;
}

type Step = "welcome" | "upload" | "processing" | "result";

export default function WelcomeModal({ open, onClose, vocalia, onImport }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [files, setFiles] = useState<File[]>([]);
  const [imported, setImported] = useState<Causa[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("welcome");
    setFiles([]);
    setImported([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStartManual = () => {
    toast.success("Listo. Podés cargar causas manualmente con el botón + en cada lista.");
    handleClose();
  };

  const handleSelectFiles = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const arr = Array.from(selected).filter((f) => /\.(xlsx|xls|docx|pdf|csv)$/i.test(f.name));
    if (arr.length === 0) {
      toast.error("Formatos aceptados: .xlsx, .docx, .pdf");
      return;
    }
    setFiles(arr);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setStep("processing");
    try {
      const causas = await extraerCausas(files, vocalia);
      setImported(causas);
      setStep("result");
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el archivo. Revisá el formato.");
      setStep("upload");
    }
  };

  const handleConfirmImport = () => {
    onImport(imported);
    toast.success(`${imported.length} causas importadas`);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        {step === "welcome" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <DialogTitle className="text-2xl font-display">¡Bienvenido a IusTrack!</DialogTitle>
              </div>
              <DialogDescription className="text-base leading-relaxed pt-2">
                Tu gestión judicial acaba de volverse inteligente. Nuestra plataforma transforma tus
                listas estáticas en un panel de control interactivo con alertas de vencimientos,
                seguimiento de estados procesales y calendarios automatizados.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button size="lg" className="w-full justify-start gap-3 h-14" onClick={() => setStep("upload")}>
                <Upload className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Migrar mi lista actual</div>
                  <div className="text-xs opacity-80 font-normal">Excel / Word / PDF</div>
                </div>
              </Button>
              <Button size="lg" variant="outline" className="w-full justify-start gap-3 h-14" onClick={handleStartManual}>
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Empezar desde cero</div>
                  <div className="text-xs opacity-70 font-normal">Carga manual de causas</div>
                </div>
              </Button>
            </div>
          </>
        )}

        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Migrar lista de causas</DialogTitle>
              <DialogDescription>
                Subí uno o más archivos. El sistema detectará números de causa, imputados, delitos,
                defensa y fechas críticas.
              </DialogDescription>
            </DialogHeader>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleSelectFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">Hacé clic o arrastrá tus archivos</p>
              <p className="text-xs text-muted-foreground">.xlsx · .docx · .pdf · .csv</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.docx,.pdf,.csv"
                multiple
                className="hidden"
                onChange={(e) => handleSelectFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-medium text-muted-foreground">{files.length} archivo(s) seleccionado(s):</p>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                    <span className="truncate flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {f.name}
                    </span>
                    <button
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={() => setStep("welcome")}>
                Volver
              </Button>
              <Button className="flex-1" onClick={handleProcess} disabled={files.length === 0}>
                Procesar archivos
              </Button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="font-medium">Procesando documentos…</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Detectando números de causa, imputados, delitos, fechas de prescripción y estados procesales.
            </p>
          </div>
        )}

        {step === "result" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-[hsl(var(--alert-ok))]" />
                <DialogTitle>¡Migración completada con éxito!</DialogTitle>
              </div>
              <DialogDescription>
                Hemos importado <strong>{imported.length}</strong> causas y configurado tus alertas automáticas.
              </DialogDescription>
            </DialogHeader>

            {imported.length > 0 && (
              <div className="max-h-48 overflow-auto border border-border rounded-md divide-y divide-border">
                {imported.slice(0, 30).map((c) => (
                  <div key={c.id} className="px-3 py-2 text-xs flex items-center justify-between">
                    <span className="font-mono">{c.numero}</span>
                    <span className="text-muted-foreground truncate ml-2">{c.imputados[0]?.nombre}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted ml-2">{c.estadoCausa}</span>
                  </div>
                ))}
                {imported.length > 30 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                    + {imported.length - 30} más…
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 items-start bg-[hsl(var(--alert-warning)/0.1)] border border-[hsl(var(--alert-warning)/0.3)] text-foreground rounded-md p-3 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[hsl(var(--alert-warning))]" />
              <p>
                <strong>Importante:</strong> este es un proceso asistido por IA. Es responsabilidad
                del usuario corroborar que los datos (especialmente fechas de vencimiento y estados
                procesales) hayan sido migrados de manera adecuada antes de confiar plenamente en el sistema.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Volver
              </Button>
              <Button className="flex-1" onClick={handleConfirmImport} disabled={imported.length === 0}>
                Confirmar e importar {imported.length} causas
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
