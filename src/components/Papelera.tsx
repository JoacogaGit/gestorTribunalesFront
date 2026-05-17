import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Inbox, Undo2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  BorradoBase,
  restaurar,
  useCausasBorradas,
  useEventosBorrados,
  useSujetosBorrados,
} from "@/hooks/useBorrados";

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso; }
}

interface SectionProps {
  tabla: "causas" | "sujetos" | "eventos";
  items: BorradoBase[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  labelSingular: string;
}

function Section({ tabla, items, loading, error, refetch, labelSingular }: SectionProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleRestaurar = async (id: string) => {
    setBusyId(id);
    const r = await restaurar(tabla, id);
    setBusyId(null);
    if (r.ok === true) {
      toast.success(`${labelSingular} restaurado`);
      refetch();
    } else {
      toast.error(`No se pudo restaurar: ${(r as { error: string }).error}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar la papelera</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-xs">{error}</span>
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
          <Inbox className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No hay {labelSingular.toLowerCase()}s en la papelera.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/60">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{it.titulo}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Borrado el {fmt(it.borrado_en)}
              {it.borrado_por_nombre ? ` · por ${it.borrado_por_nombre}` : ""}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={busyId === it.id}>
                {busyId === it.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5 mr-1.5" />}
                Restaurar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restaurar {labelSingular.toLowerCase()}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Volverá a aparecer en los listados activos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRestaurar(it.id)}>Restaurar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}

interface Props {
  vocaliaId: string | null;
}

export default function Papelera({ vocaliaId }: Props) {
  const causas = useCausasBorradas(vocaliaId);
  const sujetos = useSujetosBorrados(vocaliaId);
  const eventos = useEventosBorrados(vocaliaId);

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-muted-foreground mb-6">
        Los elementos borrados se conservan acá. Podés restaurarlos en cualquier momento.
      </p>
      <Tabs defaultValue="causas" className="w-full">
        <TabsList>
          <TabsTrigger value="causas">Causas ({causas.items.length})</TabsTrigger>
          <TabsTrigger value="sujetos">Sujetos ({sujetos.items.length})</TabsTrigger>
          <TabsTrigger value="eventos">Eventos / anotaciones ({eventos.items.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="causas" className="mt-4">
          <Section tabla="causas" labelSingular="Causa" {...causas} />
        </TabsContent>
        <TabsContent value="sujetos" className="mt-4">
          <Section tabla="sujetos" labelSingular="Sujeto" {...sujetos} />
        </TabsContent>
        <TabsContent value="eventos" className="mt-4">
          <Section tabla="eventos" labelSingular="Evento" {...eventos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
