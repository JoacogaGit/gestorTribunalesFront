import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportarCausasXlsx } from "@/lib/exportCausasExcel";

interface Props {
  vocaliaId: string | null;
  nombreOficina: string;
  esEstudio: boolean;
  compact?: boolean;
}

/** Botón para descargar todas las listas de causas en un Excel (.xlsx). */
export default function ExportarListasButton({ vocaliaId, nombreOficina, esEstudio, compact }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!vocaliaId || loading) return;
    setLoading(true);
    try {
      const total = await exportarCausasXlsx({ vocaliaId, nombreOficina, esEstudio });
      toast.success(`Excel descargado (${total} causas)`);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo generar el Excel");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!vocaliaId || loading}
        aria-label="Descargar listas en Excel"
        title="Descargar todas las listas en Excel"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#217346] hover:text-white disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={!vocaliaId || loading} className="transition-colors hover:bg-[#217346] hover:text-white hover:border-[#217346]">
      {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
      Excel
    </Button>
  );
}
