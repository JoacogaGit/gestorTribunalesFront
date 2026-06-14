// Desvincula al usuario: borra el calendario en Google, revoca tokens y
// elimina la fila en google_calendar_sync.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sync } = await admin
      .from("google_calendar_sync")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sync) return json({ ok: true, noop: true });

    // Borrar calendario remoto (best effort)
    try {
      const access = sync.access_token;
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sync.google_calendar_id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${access}` } },
      );
    } catch (e) { console.error("Delete calendar failed", e); }

    // Revocar refresh token (best effort)
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${sync.refresh_token}`, {
        method: "POST",
      });
    } catch (e) { console.error("Revoke failed", e); }

    // Limpiar google_event_id de eventos sincronizados
    await admin
      .from("eventos")
      .update({ google_event_id: null })
      .not("google_event_id", "is", null)
      .in("causa_id",
        (await admin.from("causas").select("id").eq("vocalia_id", sync.vocalia_id)).data?.map((c: any) => c.id) ?? [],
      );

    await admin.from("google_calendar_sync").delete().eq("user_id", userId);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
