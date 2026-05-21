import { useState } from "react";
import { AlertTriangle, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMigracionPendientes } from "@/hooks/useMigracionPendientes";
import CausaFormDialog from "@/components/forms/CausaFormDialog";

interface Props {
  vocaliaId: string | null;
  onMutated?: () => void;
}

export default function PendientesRevision({ vocaliaId, onMutated }: Props) {
  const { items, loading, eliminar, refetch } = useMigracionPendientes(vocaliaId);
  const [crear, setCrear] = useState<{ open: boolean; observaciones?: string }>({ open: false });
  const [colapsado, setColapsado] = useState(false);

  if (loading) return null;
  if (items.length === 0) return null;

  const handleEliminar = async (id: string) => {
    const r = await eliminar(id);
    if (!r.ok) toast.error(r.error);
    else toast.success("Pendiente descartado");
  };

  return (
    <>
      <Card className="mb-6 border-alert-urgent/30 bg-alert-urgent/5">
        <button
          type="button"
          onClick={() => setColapsado((c) => !c)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-alert-urgent" />
            <span className="text-sm font-semibold">
              Filas pendientes de revisión manual
            </span>
            <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
          </div>
          {colapsado ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        {!colapsado && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Estas filas no pudieron ser procesadas automáticamente por la IA. Podés crearlas manualmente o descartarlas.
            </p>
            {items.map((it) => (
              <div key={it.id} className="rounded-md border border-border/60 bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    {it.razon && <p className="text-xs text-foreground"><strong>Razón:</strong> {it.razon}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {it.archivo_origen && <span className="font-mono mr-2">{it.archivo_origen}</span>}
                      {new Date(it.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(it.datos_crudos).catch(() => { /* noop */ });
                        toast.info("Datos copiados al portapapeles. Pegalos en observaciones si los necesitás.");
                        setCrear({ open: true });
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Crear causa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleEliminar(it.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Descartar
                    </Button>
                  </div>
                </div>
                <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words bg-muted/30 rounded p-2 max-h-24 overflow-auto">
                  {it.datos_crudos}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CausaFormDialog
        open={crear.open}
        onOpenChange={(o) => setCrear((s) => ({ ...s, open: o }))}
        mode="crear"
        initialObservaciones={crear.observaciones}
        onMutated={() => { refetch(); onMutated?.(); }}
      />
    </>
  );
}
