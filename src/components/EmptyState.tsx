import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="flex flex-col items-center text-center px-4 py-8 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {subtitle}
          </p>
        )}
        {actionLabel && onAction && (
          <Button size="lg" onClick={onAction} className="shadow-sm">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
