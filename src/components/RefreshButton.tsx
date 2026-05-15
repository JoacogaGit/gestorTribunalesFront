import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
  label?: string;
}

export default function RefreshButton({ onRefresh, loading, className, label = "Actualizar lista" }: Props) {
  const [internal, setInternal] = useState(false);
  const isLoading = loading || internal;

  const handle = async () => {
    if (isLoading) return;
    setInternal(true);
    try {
      await onRefresh();
    } finally {
      setInternal(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handle}
          disabled={isLoading}
          className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", className)}
          aria-label={label}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
