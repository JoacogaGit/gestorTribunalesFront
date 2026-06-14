// Propaga create/update/delete de un evento JusTrack a todos los Google Calendars
// vinculados a la vocalía de la causa.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;

const REMINDERS = {
  useDefault: false,
  overrides: [
    { method: "popup", minutes: 4320 }, // 3 días
    { method: "popup", minutes: 1440 }, // 1 día
    { method: "popup", minutes: 60 },   // 1 hora
  ],
};

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

    const body = await req.json();
    const { action, evento_id, causa_id } = body ?? {};
    if (!action || !evento_id || !causa_id) return json({ error: "Faltan parámetros" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Datos del evento + causa
    const { data: evento } = await admin
      .from("eventos")
      .select("id, titulo, fecha_hora, google_event_id, borrado_en")
      .eq("id", evento_id)
      .maybeSingle();

    const { data: causa } = await admin
      .from("causas")
      .select("id, vocalia_id, expediente")
      .eq("id", causa_id)
      .maybeSingle();

    if (!causa?.vocalia_id) return json({ ok: true, skipped: "no-causa" });

    // Vinculaciones activas para esta vocalía
    const { data: syncs } = await admin
      .from("google_calendar_sync")
      .select("*")
      .eq("vocalia_id", causa.vocalia_id)
      .eq("activo", true);

    if (!syncs || syncs.length === 0) return json({ ok: true, skipped: "no-sync" });

    const results: any[] = [];

    for (const s of syncs) {
      try {
        const accessToken = await ensureValidToken(admin, s);
        const calId = encodeURIComponent(s.google_calendar_id);
        const titulo = causa.expediente || "Evento JusTrack";

        if (action === "delete") {
          if (evento?.google_event_id) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evento.google_event_id}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
            );
          }
          results.push({ user: s.user_id, ok: true, action: "delete" });
          continue;
        }

        if (!evento?.fecha_hora) {
          // Sin fecha: si existe en Google, eliminar; si no, ignorar.
          if (evento?.google_event_id) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evento.google_event_id}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
            );
            await admin.from("eventos").update({ google_event_id: null }).eq("id", evento.id);
          }
          results.push({ user: s.user_id, ok: true, skipped: "sin-fecha" });
          continue;
        }

        const start = new Date(evento.fecha_hora);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const eventBody = {
          summary: titulo,
          description: "Evento sincronizado desde JusTrack",
          start: { dateTime: start.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
          end: { dateTime: end.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
          reminders: REMINDERS,
        };

        if (action === "update" && evento.google_event_id) {
          const r = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evento.google_event_id}`,
            {
              method: "PATCH",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(eventBody),
            },
          );
          results.push({ user: s.user_id, ok: r.ok, action: "update" });
        } else {
          // create (o update sin id previo)
          const r = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(eventBody),
            },
          );
          const created = await r.json();
          if (r.ok && created.id) {
            await admin.from("eventos").update({ google_event_id: created.id }).eq("id", evento.id);
          }
          results.push({ user: s.user_id, ok: r.ok, action: "create" });
        }
      } catch (err) {
        console.error("Per-sync error", s.user_id, err);
        results.push({ user: s.user_id, ok: false, error: (err as Error).message });
      }
    }

    return json({ ok: true, results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function ensureValidToken(admin: any, sync: any): Promise<string> {
  const now = Date.now();
  const expires = sync.token_expires_at ? new Date(sync.token_expires_at).getTime() : 0;
  if (sync.access_token && expires - now > 60_000) return sync.access_token;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: sync.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("No se pudo refrescar token: " + JSON.stringify(j));

  const newExpires = new Date(now + (j.expires_in ?? 3500) * 1000).toISOString();
  await admin.from("google_calendar_sync").update({
    access_token: j.access_token,
    token_expires_at: newExpires,
  }).eq("id", sync.id);

  return j.access_token;
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
