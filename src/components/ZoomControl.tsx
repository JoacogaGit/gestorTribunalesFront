import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useListZoom, ListZoom } from "@/hooks/useListZoom";
import { cn } from "@/lib/utils";

const LABEL: Record<ListZoom, string> = {
  compacto: "Compacto",
  normal: "Normal",
  expandido: "Expandido",
};

export default function ZoomControl({ className }: { className?: string }) {
  const { zoom, stepZoom, canDecrease, canIncrease } = useListZoom();
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-card/60 px-0.5", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => stepZoom(-1)}
            disabled={!canDecrease}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Reducir tamaño de filas"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Más compacto</TooltipContent>
      </Tooltip>
      <span className="text-[10px] text-muted-foreground px-1 select-none w-14 text-center">{LABEL[zoom]}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => stepZoom(1)}
            disabled={!canIncrease}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Aumentar tamaño de filas"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Más expandido</TooltipContent>
      </Tooltip>
    </div>
  );
}
