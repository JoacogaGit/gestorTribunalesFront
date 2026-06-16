import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

const STORAGE_KEY = "push-banner-dismissed-date";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function PushReminderBanner() {
  const { status, enable } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "inactive") {
      setVisible(false);
      return;
    }
    const last = localStorage.getItem(STORAGE_KEY);
    setVisible(last !== todayKey());
  }, [status]);

  if (!visible || status !== "inactive") return null;

  return (
    <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-center gap-3 text-sm">
      <Bell className="w-4 h-4 text-amber-500 shrink-0" />
      <p className="flex-1 text-foreground/90">
        Activá las notificaciones para recibir alertas de vencimientos y eventos en tu celular y PC.
      </p>
      <Button
        size="sm"
        variant="default"
        onClick={async () => {
          const ok = await enable();
          if (ok) toast.success("Notificaciones activadas");
          setVisible(false);
        }}
      >
        Activar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, todayKey());
          setVisible(false);
        }}
      >
        Ahora no
      </Button>
      <button
        aria-label="Cerrar"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, todayKey());
          setVisible(false);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
