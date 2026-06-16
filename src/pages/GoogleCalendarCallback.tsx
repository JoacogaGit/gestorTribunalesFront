import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GoogleCalendarCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("Conectando con Google Calendar…");

  useEffect(() => {
    (async () => {
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      const vocaliaId = sessionStorage.getItem("gcal_vocalia_id");

      if (error) { setStatus("error"); setMsg(`Google rechazó la conexión: ${error}`); return; }
      if (!code || !vocaliaId) { setStatus("error"); setMsg("Faltan datos del callback."); return; }

      const redirectUri = `${window.location.origin}/google-calendar-callback`;
      const { data, error: fnErr } = await supabase.functions.invoke("google-calendar-oauth", {
        body: { code, vocalia_id: vocaliaId, redirect_uri: redirectUri, state },
      });

      sessionStorage.removeItem("gcal_vocalia_id");

      if (fnErr || (data as any)?.error) {
        setStatus("error");
        setMsg((data as any)?.error || fnErr?.message || "Falló la vinculación");
        return;
      }
      setStatus("ok");
      setMsg(`Vinculado a ${(data as any)?.vocalia_nombre ?? "tu vocalía"}. Sincronizando eventos…`);
      toast.success("Google Calendar vinculado");

      // Bulk sync inicial: sube todos los eventos existentes de la vocalía.
      try {
        const { data: bulk } = await supabase.functions.invoke("google-calendar-sync", {
          body: { action: "bulk", vocalia_id: vocaliaId },
        });
        const b = (bulk as any)?.bulk;
        if (b) {
          setMsg(`Vinculado. ${b.created} eventos sincronizados${b.failed ? ` (${b.failed} fallaron)` : ""}.`);
        }
      } catch (e) {
        console.warn("bulk sync error", e);
      }
      setTimeout(() => navigate("/", { replace: true }), 2000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center elevated-card rounded-2xl p-8">
        {status === "loading" && <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-4" />}
        {status === "ok" && <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-4" />}
        {status === "error" && <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-4" />}
        <p className="text-sm text-foreground">{msg}</p>
        {status === "error" && (
          <button
            className="mt-4 text-sm text-primary hover:underline"
            onClick={() => navigate("/", { replace: true })}
          >
            Volver
          </button>
        )}
      </div>
    </div>
  );
}
