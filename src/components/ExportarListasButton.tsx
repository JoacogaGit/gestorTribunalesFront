import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ListFilter, Building2 } from "lucide-react";
import { toast } from "sonner";
import { exportarCausasXlsx, exportarVistaActualXlsx } from "@/lib/exportCausasExcel";
import { obtenerVistasActuales, type VistaExportable } from "@/lib/vistaExportable";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  vocaliaId: string | null;
  nombreOficina: string;
  esEstudio: boolean;
  /** Nombre de la vista actual (para nombrar la hoja si la lista no tiene título propio). */
  tituloVista?: string;
  compact?: boolean;
}

/** Botón para descargar listas de causas en Excel: solo la lista actual o toda la oficina. */
export default function ExportarListasButton({ vocaliaId, nombreOficina, esEstudio, tituloVista, compact }: Props) {
  const [loading, setLoading] = useState(false);
  const [vistas, setVistas] = useState<VistaExportable[]>([]);

  const onOpenChange = (open: boolean) => {
    if (open) {
      setVistas(obtenerVistasActuales().map((v) => ({ ...v, titulo: v.titulo || tituloVista || "Lista" })));
    }
  };

  const filasVista = vistas.reduce((n, v) => n + v.filas.length, 0);

  const run = async (alcance: "lista" | "oficina") => {
    if (!vocaliaId || loading) return;
    setLoading(true);
    try {
      if (alcance === "lista") {
        const total = await exportarVistaActualXlsx(vistas, { nombreOficina, esEstudio });
        toast.success(`Excel descargado (${total} filas de esta lista)`);
      } else {
        const total = await exportarCausasXlsx({ vocaliaId, nombreOficina, esEstudio });
        toast.success(`Excel descargado (${total} causas de toda la oficina)`);
      }
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo generar el Excel");
    } finally {
      setLoading(false);
    }
  };

  const trigger = compact ? (
    <button
      type="button"
      disabled={!vocaliaId || loading}
      aria-label="Descargar en Excel"
      title="Descargar en Excel"
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#217346] hover:text-white disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  ) : (
    <Button size="sm" variant="outline" disabled={!vocaliaId || loading} className="transition-colors hover:bg-[#217346] hover:text-white hover:border-[#217346]">
      {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
      Excel
    </Button>
  );

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-sm">¿Qué querés descargar?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={vistas.length === 0}
          onSelect={() => run("lista")}
          className="flex items-start gap-2 py-2"
        >
          <ListFilter className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Solo esta lista</span>
            <span className="text-xs text-muted-foreground">
              {vistas.length === 0
                ? "No hay una lista abierta en pantalla"
                : `Lo que ves ahora, con tus filtros (${filasVista} ${filasVista === 1 ? "fila" : "filas"})`}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("oficina")} className="flex items-start gap-2 py-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Toda la oficina</span>
            <span className="text-xs text-muted-foreground">Todas las causas, una hoja por lista</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
