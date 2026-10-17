import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget: re-sincroniza los eventos de una causa con Google Calendar
 *  (borra los de Google si la causa está en una lista sin calendario; los recrea si salió). */
export function fireCausaResync(causaId: string) {
  supabase.functions
    .invoke("google-calendar-sync", { body: { action: "causa_resync", causa_id: causaId } })
    .catch((e) => console.warn("google-calendar-sync causa_resync error", e));
}
