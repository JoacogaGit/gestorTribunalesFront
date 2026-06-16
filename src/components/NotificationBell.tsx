import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import PushInstrucciones from "@/components/PushInstrucciones";

export default function NotificationBell() {
  const { status, loading, enable, disable } = usePushNotifications();

  if (status === "unsupported") return null;

  const active = status === "active";

  const handleActivate = async () => {
    const ok = await enable();
    if (ok) toast.success("Notificaciones activadas");
    else if (Notification.permission === "denied")
      toast.error("Permiso de notificaciones denegado. Habilitalo en la configuración del navegador.");
    else toast.error("No se pudieron activar las notificaciones");
  };

  const handleDeactivate = async () => {
    const ok = await disable();
    if (ok) toast.success("Notificaciones desactivadas");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={active ? "Notificaciones activadas" : "Notificaciones desactivadas"}
          className="relative"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : active ? (
            <Bell className="w-5 h-5 text-amber-500" fill="currentColor" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones push</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {active ? (
          <DropdownMenuItem onClick={handleDeactivate}>
            <BellOff className="w-4 h-4 mr-2" /> Desactivar notificaciones
          </DropdownMenuItem>
        ) : status === "denied" ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            Permiso bloqueado. Habilitá las notificaciones desde la configuración del navegador para este sitio.
          </div>
        ) : (
          <DropdownMenuItem onClick={handleActivate}>
            <Bell className="w-4 h-4 mr-2" /> Activar notificaciones
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <PushInstrucciones />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
