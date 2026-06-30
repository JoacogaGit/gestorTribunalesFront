import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(opts: {
  tribunalNombre: string;
  rol: string;
  link: string;
}): string {
  const { tribunalNombre, rol, link } = opts;
  const tn = escapeHtml(tribunalNombre);
  const ro = escapeHtml(rol);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Invitación a ${tn}</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e4dd;">
    <div style="background:#0f1b3d;padding:28px 32px;color:#f5f3ee;">
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#c9a84c;margin-bottom:6px;">IusTrack · Gestión Judicial</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">Te invitaron a un tribunal</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Te invitaron a integrarte a <strong>${tn}</strong> en IusTrack como <strong>${ro}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#55575d;">
        Hacé clic en el botón para aceptar la invitación y unirte al tribunal.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;background:#c9a84c;color:#0f1b3d;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:8px;font-size:15px;">
          Aceptar invitación
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.5;">
        Este link expira en 7 días. Si no esperabas esta invitación, podés ignorar este correo.
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#bbb;word-break:break-all;">
        ${escapeHtml(link)}
      </p>
    </div>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supaService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supaCaller = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: aerr } = await supaCaller.auth.getClaims(token);
    if (aerr || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const invitacionId = body?.invitacion_id;
    if (!invitacionId || typeof invitacionId !== "string") {
      return json({ error: "invitacion_id requerido" }, 400);
    }

    const supa = createClient(supaUrl, supaService);

    const { data: inv, error: ierr } = await supa
      .from("invitaciones")
      .select("token, email_invitado, rol_a_asignar, tribunal_id, expira_en, usado")
      .eq("id", invitacionId)
      .maybeSingle();

    if (ierr || !inv) {
      return json({ error: "Invitación no encontrada" }, 400);
    }
    if (inv.usado) {
      return json({ error: "Esta invitación ya fue utilizada" }, 400);
    }
    if (inv.expira_en && new Date(inv.expira_en).getTime() < Date.now()) {
      return json({ error: "Esta invitación expiró" }, 400);
    }

    const { data: trib } = await supa
      .from("tribunales")
      .select("nombre")
      .eq("id", inv.tribunal_id)
      .maybeSingle();

    const origin =
      req.headers.get("origin") ||
      Deno.env.get("APP_URL") ||
      "https://app.lovable.dev";
    const link = `${origin}/invitacion/${inv.token}`;

    const html = buildHtml({
      tribunalNombre: trib?.nombre ?? "tu tribunal",
      rol: inv.rol_a_asignar ?? "miembro",
      link,
    });
    const subject = `Te invitaron a ${trib?.nombre ?? "un tribunal"} en IusTrack`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json({ ok: true, sent: false, reason: "no_email_provider", link });
    }

    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "IusTrack <onboarding@resend.dev>",
          to: [inv.email_invitado],
          subject,
          html,
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        return json({ ok: true, sent: false, reason: "send_failed", error: errText, link });
      }
      return json({ ok: true, sent: true });
    } catch (e) {
      return json({ ok: true, sent: false, reason: "send_failed", error: String(e), link });
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
