// Sincroniza eventos JusTrack ↔ Google Calendar.
// Soporta: eventos manuales, vencimientos de PP/Pena/SJP, prescripciones y PP calculado.
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
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { action, evento_id, causa_id, vocalia_id } = body ?? {};
    if (!action) return json({ error: "Faltan parámetros" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ========== BULK / RESYNC DE VOCALÍA ==========
    if (action === "bulk" || action === "vocalia_resync") {
      if (!vocalia_id) return json({ error: "Falta vocalia_id" }, 400);

      // Para "bulk" (post-vinculación): sólo el sync del user actual.
      // Para "vocalia_resync": todos los syncs activos de la vocalía.
      let syncsQ = admin
        .from("google_calendar_sync")
        .select("id,user_id,vocalia_id,access_token,refresh_token,token_expires_at,google_calendar_id,activo")
        .eq("vocalia_id", vocalia_id)
        .eq("activo", true);
      if (action === "bulk") syncsQ = syncsQ.eq("user_id", userId);

      const { data: syncs } = await syncsQ;
      if (!syncs || syncs.length === 0) return json({ ok: true, skipped: "no-sync" });

      const aggregated = { total: 0, ok: 0, failed: 0 };
      for (const sync of syncs) {
        try {
          const r = await runFullSyncForCalendar(admin, sync);
          aggregated.total += r.total;
          aggregated.ok += r.ok;
          aggregated.failed += r.failed;
        } catch (e) {
          console.error("vocalia_resync per-sync error", sync.user_id, e);
          aggregated.failed++;
        }
      }
      return json({ ok: true, bulk: { created: aggregated.ok, total: aggregated.total, failed: aggregated.failed } });
    }

    // ========== SYNC PUNTUAL DE EVENTO MANUAL ==========
    if (!evento_id) return json({ error: "Falta evento_id" }, 400);

    const { data: evento, error: evErr } = await admin
      .from("eventos")
      .select("id, titulo, fecha_hora, fecha_hora_fin, google_event_id, borrado_en, sujeto_id, causa:causas!inner(id, vocalia_id, expediente_nro, caratula, borrado_en)")
      .eq("id", evento_id)
      .is("causa.borrado_en", null)
      .maybeSingle();

    if (evErr) {
      console.error("evento query error", evErr);
      return json({ error: evErr.message }, 500);
    }
    const causa: any = (evento as any)?.causa;
    let vocaliaId = causa?.vocalia_id as string | undefined;
    let expediente = causa?.expediente_nro as string | undefined;
    let caratula = causa?.caratula as string | undefined;
    if (!vocaliaId && causa_id) {
      const { data: c } = await admin
        .from("causas")
        .select("id, vocalia_id, expediente_nro, caratula")
        .eq("id", causa_id)
        .is("borrado_en", null)
        .maybeSingle();
      vocaliaId = c?.vocalia_id;
      expediente = c?.expediente_nro;
      caratula = c?.caratula ?? undefined;
    }
    if (!vocaliaId) return json({ ok: true, skipped: "no-causa" });

    return await syncOneEvento(admin, action, evento, vocaliaId, expediente ?? "", caratula ?? null);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

// ============================================================
// SYNC COMPLETO DE UN CALENDARIO (todos los tipos de fecha)
// ============================================================
async function runFullSyncForCalendar(admin: any, sync: any): Promise<{ total: number; ok: number; failed: number }> {
  const accessToken = await ensureValidToken(admin, sync);
  const calId = encodeURIComponent(sync.google_calendar_id);
  let total = 0, ok = 0, failed = 0;

  // 1. EVENTOS MANUALES
  const { data: eventos } = await admin
    .from("eventos")
    .select("id, titulo, fecha_hora, fecha_hora_fin, google_event_id, sujeto_id, causa:causas!inner(id, vocalia_id, expediente_nro, caratula, borrado_en)")
    .is("borrado_en", null)
    .not("fecha_hora", "is", null)
    .eq("causa.vocalia_id", sync.vocalia_id)
    .is("causa.borrado_en", null);

  for (const ev of eventos ?? []) {
    total++;
    try {
      const causa: any = Array.isArray(ev.causa) ? ev.causa[0] : ev.causa;
      const title = formatEventoTitle(ev.titulo, causa?.caratula ?? null, causa?.expediente_nro ?? "");
      const body = buildEventBody(title, ev.fecha_hora, ev.fecha_hora_fin ?? null);
      if (ev.google_event_id) {
        const r = await gcalPatch(calId, ev.google_event_id, body, accessToken);
        if (r.ok) ok++; else failed++;
      } else {
        const r = await gcalInsert(calId, body, accessToken);
        const j = await r.json();
        if (r.ok && j.id) {
          await admin.from("eventos").update({ google_event_id: j.id }).eq("id", ev.id);
          ok++;
        } else failed++;
      }
    } catch (e) { failed++; console.error("evento sync error", e); }
  }

  // 2. SUJETOS (vencimientos + pp calculado) — usamos carátula de la causa en el título.
  const { data: sujetos } = await admin
    .from("sujetos")
    .select("id, nombre_completo, vencimiento_pp, vencimiento_pena, vencimiento_sjp, fecha_detencion, causa:causas!inner(id, vocalia_id, expediente_nro, caratula, borrado_en)")
    .is("borrado_en", null)
    .eq("causa.vocalia_id", sync.vocalia_id)
    .is("causa.borrado_en", null);

  for (const s of sujetos ?? []) {
    const causa: any = Array.isArray(s.causa) ? s.causa[0] : s.causa;
    const exp = causa?.expediente_nro ?? "";
    const sujLabel = (causa?.caratula && String(causa.caratula).trim()) || s.nombre_completo;
    const sujetoHex = (s.id as string).replace(/-/g, "");

    const items: Array<{ id: string; titulo: string; fecha: string | null }> = [
      { id: `jtpp${sujetoHex}`, titulo: `Vto. Prisión Preventiva - ${sujLabel} (${exp})`, fecha: s.vencimiento_pp },
      { id: `jtpena${sujetoHex}`, titulo: `Vto. Pena - ${sujLabel} (${exp})`, fecha: s.vencimiento_pena },
      { id: `jtsjp${sujetoHex}`, titulo: `Vto. SJP - ${sujLabel} (${exp})`, fecha: s.vencimiento_sjp },
    ];
    // PP calculado: fecha_detencion + 2 años, sólo si no hay vto_pp ni vto_pena
    if (s.fecha_detencion && !s.vencimiento_pp && !s.vencimiento_pena) {
      // fecha_detencion es DATE puro → parsear como local para no perder un día.
      const fd = s.fecha_detencion as string;
      const d = /^\d{4}-\d{2}-\d{2}$/.test(fd) ? new Date(`${fd}T12:00:00`) : new Date(fd);
      d.setFullYear(d.getFullYear() + 2);
      const calc = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      items.push({
        id: `jtppcalc${sujetoHex}`,
        titulo: `Vto. Prisión Preventiva (2 años) - ${sujLabel} (${exp})`,
        fecha: calc,
      });
    } else {
      // si existe vto_pp o vto_pena, asegurar eliminar el ppcalc
      items.push({ id: `jtppcalc${sujetoHex}`, titulo: "", fecha: null });
    }

    for (const it of items) {
      total++;
      try {
        const okItem = await upsertDateEvent(calId, accessToken, it.id, it.titulo, it.fecha);
        if (okItem) ok++; else failed++;
      } catch (e) { failed++; console.error("sujeto date sync error", e); }
    }
  }

  // 3. PRESCRIPCIONES
  const { data: prescs } = await admin
    .from("prescripciones")
    .select("id, fecha, sujeto:sujetos!inner(id, nombre_completo, borrado_en, causa:causas!inner(id, vocalia_id, expediente_nro, caratula, borrado_en))")
    .eq("sujeto.causa.vocalia_id", sync.vocalia_id)
    .is("sujeto.borrado_en", null)
    .is("sujeto.causa.borrado_en", null);

  for (const p of prescs ?? []) {
    const sj: any = Array.isArray(p.sujeto) ? p.sujeto[0] : p.sujeto;
    const causa: any = sj && (Array.isArray(sj.causa) ? sj.causa[0] : sj.causa);
    if (!sj || !causa) continue;
    const presHex = (p.id as string).replace(/-/g, "");
    const label = (causa.caratula && String(causa.caratula).trim()) || sj.nombre_completo;
    const titulo = `Prescripción - ${label} (${causa.expediente_nro ?? ""})`;
    total++;
    try {
      const okItem = await upsertDateEvent(calId, accessToken, `jtpresc${presHex}`, titulo, p.fecha);
      if (okItem) ok++; else failed++;
    } catch (e) { failed++; console.error("prescripcion sync error", e); }
  }

  return { total, ok, failed };
}

// ============================================================
// SYNC PUNTUAL DE EVENTO MANUAL
// ============================================================
async function syncOneEvento(admin: any, action: string, evento: any, vocaliaId: string, expediente: string, caratula: string | null) {
  const { data: syncs } = await admin
    .from("google_calendar_sync")
    .select("id,user_id,vocalia_id,access_token,refresh_token,token_expires_at,google_calendar_id,activo")
    .eq("vocalia_id", vocaliaId)
    .eq("activo", true);

  if (!syncs || syncs.length === 0) return json({ ok: true, skipped: "no-sync" });

  const results: any[] = [];
  for (const s of syncs) {
    try {
      const accessToken = await ensureValidToken(admin, s);
      const calId = encodeURIComponent(s.google_calendar_id);

      if (action === "delete") {
        if (evento?.google_event_id) {
          await gcalDelete(calId, evento.google_event_id, accessToken);
        }
        results.push({ user: s.user_id, ok: true, action: "delete" });
        continue;
      }

      if (!evento?.fecha_hora) {
        if (evento?.google_event_id) {
          await gcalDelete(calId, evento.google_event_id, accessToken);
          await admin.from("eventos").update({ google_event_id: null }).eq("id", evento.id);
        }
        results.push({ user: s.user_id, ok: true, skipped: "sin-fecha" });
        continue;
      }

      const title = formatEventoTitle(evento.titulo, caratula, expediente);
      const body = buildEventBody(title, evento.fecha_hora, evento.fecha_hora_fin ?? null);

      if (action === "update" && evento.google_event_id) {
        const r = await gcalPatch(calId, evento.google_event_id, body, accessToken);
        results.push({ user: s.user_id, ok: r.ok, action: "update" });
      } else {
        const r = await gcalInsert(calId, body, accessToken);
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
}

// ============================================================
// HELPERS GOOGLE CALENDAR
// ============================================================
function gcalInsert(calId: string, body: unknown, token: string) {
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function gcalPatch(calId: string, eventId: string, body: unknown, token: string) {
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function gcalDelete(calId: string, eventId: string, token: string) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await r.text();
  return r;
}

/** Upsert con ID determinístico (base32hex valid). Si existe, PATCH; si no, INSERT con id custom. */
async function upsertDateEvent(calId: string, token: string, eventId: string, titulo: string, fecha: string | null): Promise<boolean> {
  if (!fecha) {
    const r = await gcalDelete(calId, eventId, token);
    return r.status === 204 || r.status === 404 || r.status === 410 || r.ok;
  }
  const body = buildAllDayBody(titulo, fecha);
  // Intento INSERT con id explícito
  const ins = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, id: eventId }),
  });
  if (ins.ok) { await ins.text(); return true; }
  if (ins.status === 409) {
    const p = await gcalPatch(calId, eventId, body, token);
    await p.text();
    return p.ok;
  }
  const txt = await ins.text();
  console.warn("upsertDateEvent insert failed", ins.status, txt);
  return false;
}

// ============================================================
// FORMATEO Y BODY
// ============================================================
function formatEventoTitle(titulo: string | null, caratula: string | null, expediente: string): string {
  const base = titulo?.trim() || "Evento JusTrack";
  const car = caratula?.trim();
  if (car) return `${base} - ${car} (${expediente})`;
  return `${base} (${expediente})`;
}

function isAllDayISO(iso: string): boolean {
  return /T00:00:00(\.000)?Z$/.test(iso) || /T00:00:00\+00:?00$/.test(iso);
}

function buildAllDayBody(titulo: string, dateStr: string) {
  const onlyDate = dateStr.slice(0, 10);
  const nextDay = new Date(onlyDate + "T00:00:00Z");
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return {
    summary: titulo,
    description: "Evento sincronizado desde JusTrack",
    start: { date: onlyDate },
    end: { date: nextDay.toISOString().slice(0, 10) },
    reminders: REMINDERS,
  };
}

function buildEventBody(titulo: string, fechaHora: string, fechaHoraFin?: string | null) {
  if (isAllDayISO(fechaHora)) return buildAllDayBody(titulo, fechaHora);
  const start = new Date(fechaHora);
  let end: Date;
  if (fechaHoraFin && !isAllDayISO(fechaHoraFin)) {
    const candidate = new Date(fechaHoraFin);
    end = !isNaN(candidate.getTime()) && candidate.getTime() > start.getTime()
      ? candidate
      : new Date(start.getTime() + 60 * 60 * 1000);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return {
    summary: titulo,
    description: "Evento sincronizado desde JusTrack",
    start: { dateTime: start.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
    end: { dateTime: end.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
    reminders: REMINDERS,
  };
}

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
