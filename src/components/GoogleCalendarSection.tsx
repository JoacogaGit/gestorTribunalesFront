import { useEffect, useState } from "react";
import { Calendar, Loader2, CheckCircle2, Link as LinkIcon, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useVocalias } from "@/hooks/useVocalias";
import { toast } from "sonner";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;

interface SyncRow {
  id: string;
  vocalia_id: string;
  google_calendar_id: string;
}

export default function GoogleCalendarSection() {
  const { vocalias, loading: vocLoading } = useVocalias();
  const [sync, setSync] = useState<SyncRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [vocaliaSel, setVocaliaSel] = useState<string>("");
  const [unlinking, setUnlinking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("google_calendar_sync")
      .select("id, vocalia_id, google_calendar_id")
      .eq("user_id", u.user.id)
      .maybeSingle();
    setSync(data ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const vocaliaActual = sync ? vocalias.find((v) => v.id === sync.vocalia_id) : null;

  const iniciarVinculacion = () => {
    if (!vocaliaSel) { toast.error("Elegí una vocalía"); return; }
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Falta configurar VITE_GOOGLE_OAUTH_CLIENT_ID");
      return;
    }
    sessionStorage.setItem("gcal_vocalia_id", vocaliaSel);
    const redirect = `${window.location.origin}/google-calendar-callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirect,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const desvincular = async () => {
    setUnlinking(true);
    const { error } = await supabase.functions.invoke("google-calendar-unlink", { body: {} });
    setUnlinking(false);
    setConfirmUnlink(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Desvinculado");
    await load();
  };

  if (loading || vocLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-display font-semibold">Google Calendar</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            JusTrack ya cuenta con un calendario interno donde podés ver todos tus eventos y vencimientos.
            Opcionalmente, podés vincular tu Google Calendar para recibir recordatorios automáticos en tu
            celular (3 días, 1 día y 1 hora antes de cada evento). Solo se sincronizarán los eventos con
            fecha de la vocalía que elijas. Por privacidad, los eventos aparecerán solo con el número de
            expediente, sin nombres de imputados. Podés desvincular en cualquier momento.
          </p>
        </div>
      </div>

      {sync ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm">
              Vinculado a <strong>{vocaliaActual?.nombre ?? "vocalía"}</strong>
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setConfirmUnlink(true)}>
            <Unlink className="w-3.5 h-3.5 mr-1.5" /> Desvincular
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs">Vocalía a sincronizar</Label>
          <Select value={vocaliaSel} onValueChange={setVocaliaSel}>
            <SelectTrigger><SelectValue placeholder="Elegí una vocalía" /></SelectTrigger>
            <SelectContent>
              {vocalias.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nombre} <span className="text-muted-foreground">— {v.tribunal_nombre}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={iniciarVinculacion} className="w-full" disabled={!vocaliaSel}>
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Vincular Google Calendar
          </Button>
        </div>
      )}

      <AlertDialog open={confirmUnlink} onOpenChange={setConfirmUnlink}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán todos los eventos de JusTrack en tu Google Calendar. ¿Confirmás?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unlinking}
              onClick={(e) => { e.preventDefault(); desvincular(); }}
            >
              {unlinking && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
