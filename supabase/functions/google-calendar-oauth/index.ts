// Intercambia el authorization code de Google por tokens, crea un calendario
// nuevo "JusTrack - [vocalia]" y guarda la vinculación en google_calendar_sync.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Endpoint público auxiliar: devuelve el client_id para que el frontend arme la URL de OAuth.
  const url = new URL(req.url);
  if (url.searchParams.get("action") === "config") {
    return json({ client_id: GOOGLE_CLIENT_ID });
  }


  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { code, vocalia_id, redirect_uri } = body ?? {};
    if (!code || !vocalia_id || !redirect_uri) {
      return json({ error: "Faltan parámetros" }, 400);
    }

    // Verifica que el user sea miembro de la vocalía
    const { data: voc, error: vocErr } = await userClient
      .from("vocalias")
      .select("id, nombre")
      .eq("id", vocalia_id)
      .maybeSingle();
    if (vocErr || !voc) return json({ error: "Vocalía no accesible" }, 403);

    // Intercambio code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.refresh_token) {
      console.error("Token exchange failed", tokenJson);
      return json({
        error: "No se pudo obtener refresh_token. Probá desvincular y reintentar.",
        details: tokenJson,
      }, 400);
    }

    const accessToken: string = tokenJson.access_token;
    const refreshToken: string = tokenJson.refresh_token;
    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3500) * 1000).toISOString();

    // Crear calendario en Google
    const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `JusTrack - ${voc.nombre}`,
        description: "Eventos sincronizados desde JusTrack",
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    });
    const calJson = await calRes.json();
    if (!calRes.ok) {
      console.error("Create calendar failed", calJson);
      return json({ error: "No se pudo crear el calendario", details: calJson }, 500);
    }
    const googleCalendarId: string = calJson.id;

    // Guardar vinculación con service role (sortea RLS para upsert limpio)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: upErr } = await admin
      .from("google_calendar_sync")
      .upsert({
        user_id: userId,
        vocalia_id,
        google_calendar_id: googleCalendarId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        activo: true,
      }, { onConflict: "user_id" });

    if (upErr) {
      console.error("Upsert failed", upErr);
      return json({ error: upErr.message }, 500);
    }

    return json({ ok: true, vocalia_nombre: voc.nombre });
  } catch (e) {
    console.error("Unhandled", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
