// Enviar push notifications para eventos y vencimientos próximos.
// Llamada por cron horario. No requiere JWT (verify_jwt=false en config).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = "BMj2twloRuyaGk5x3Hr2mVAihRhULqJbNy9XioO30z03L7c7oONQfQfBVcHGg2D8M6AXBw5398CYwXCUXOmDsmI";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:notificaciones@justrack.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type Ventana = "3d" | "1d" | "1h";

function pickWindow(hoursAhead: number): Ventana | null {
  if (hoursAhead >= 70.5 && hoursAhead <= 73) return "3d";
  if (hoursAhead >= 22.5 && hoursAhead <= 25) return "1d";
  if (hoursAhead >= 0.25 && hoursAhead <= 1.5) return "1h";
  return null;
}

function humanWindow(v: Ventana): string {
  return v === "3d" ? "en 3 días" : v === "1d" ? "mañana" : "en 1 hora";
}

interface Alerta {
  tipo: "evento" | "pp" | "pena" | "sjp" | "prescripcion";
  recurso_id: string;
  vocalia_id: string;
  fecha: Date;
  titulo: string; // Without time suffix
  url: string;
}

async function buildAlertas(now: Date): Promise<Alerta[]> {
  const horizonte = new Date(now.getTime() + 73 * 3600_000);
  const out: Alerta[] = [];

  // Eventos
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, titulo, fecha_hora, sujeto:sujetos(nombre_completo), causa:causas!inner(id, vocalia_id, expediente_nro, borrado_en)")
    .is("borrado_en", null)
    .not("fecha_hora", "is", null)
    .gte("fecha_hora", now.toISOString())
    .lte("fecha_hora", horizonte.toISOString());

  for (const e of eventos ?? []) {
    const c: any = e.causa;
    if (!c || c.borrado_en) continue;
    const s: any = e.sujeto;
    const nombre = s?.nombre_completo;
    const exp = c.expediente_nro ?? "";
    const titulo = nombre
      ? `${e.titulo} - ${nombre} (${exp})`
      : `${e.titulo} (${exp})`;
    out.push({
      tipo: "evento",
      recurso_id: e.id,
      vocalia_id: c.vocalia_id,
      fecha: new Date(e.fecha_hora as string),
      titulo,
      url: `/?causa=${c.id}`,
    });
  }

  // Sujetos: PP, pena, SJP, PP calculado
  const { data: sujetos } = await supabase
    .from("sujetos")
    .select("id, nombre_completo, vencimiento_pp, vencimiento_pena, vencimiento_sjp, fecha_detencion, causa:causas!inner(id, vocalia_id, expediente_nro, borrado_en)")
    .is("borrado_en", null);

  for (const s of sujetos ?? []) {
    const c: any = s.causa;
    if (!c || c.borrado_en) continue;
    const exp = c.expediente_nro ?? "";
    const nombre = s.nombre_completo ?? "";
    const candidates: Array<{ key: string; tipo: Alerta["tipo"]; titulo: string; fecha: string | null }> = [
      { key: "pp", tipo: "pp", titulo: `Vto. Prisión Preventiva - ${nombre} (${exp})`, fecha: s.vencimiento_pp },
      { key: "pena", tipo: "pena", titulo: `Vto. Pena - ${nombre} (${exp})`, fecha: s.vencimiento_pena },
      { key: "sjp", tipo: "sjp", titulo: `Vto. SJP - ${nombre} (${exp})`, fecha: s.vencimiento_sjp },
    ];
    if (s.fecha_detencion && !s.vencimiento_pp && !s.vencimiento_pena) {
      const d = new Date(s.fecha_detencion as string);
      d.setFullYear(d.getFullYear() + 2);
      candidates.push({ key: "pp", tipo: "pp", titulo: `Vto. Prisión Preventiva - ${nombre} (${exp})`, fecha: d.toISOString() });
    }
    for (const cand of candidates) {
      if (!cand.fecha) continue;
      const f = new Date(cand.fecha);
      if (f <= now || f > horizonte) continue;
      out.push({
        tipo: cand.tipo,
        recurso_id: s.id,
        vocalia_id: c.vocalia_id,
        fecha: f,
        titulo: cand.titulo,
        url: `/?causa=${c.id}`,
      });
    }
  }

  // Prescripciones
  const { data: prescs } = await supabase
    .from("prescripciones")
    .select("id, fecha, sujeto:sujetos!inner(id, nombre_completo, borrado_en, causa:causas!inner(id, vocalia_id, expediente_nro, borrado_en))");

  for (const p of prescs ?? []) {
    const sj: any = p.sujeto;
    if (!sj || sj.borrado_en) continue;
    const c: any = sj.causa;
    if (!c || c.borrado_en) continue;
    const f = new Date(p.fecha as string);
    if (f <= now || f > horizonte) continue;
    out.push({
      tipo: "prescripcion",
      recurso_id: p.id,
      vocalia_id: c.vocalia_id,
      fecha: f,
      titulo: `Prescripción - ${sj.nombre_completo ?? ""} (${c.expediente_nro ?? ""})`,
      url: `/?causa=${c.id}`,
    });
  }

  return out;
}

async function usuariosDeVocalia(vocaliaId: string): Promise<string[]> {
  const { data: voc } = await supabase
    .from("vocalias")
    .select("tribunal_id")
    .eq("id", vocaliaId)
    .maybeSingle();
  if (!voc) return [];
  const { data: miembros } = await supabase
    .from("miembros_tribunal")
    .select("usuario_id")
    .eq("tribunal_id", voc.tribunal_id);
  return (miembros ?? []).map((m: any) => m.usuario_id);
}

async function enviarPushParaUsuarios(userIds: string[], payload: any) {
  if (userIds.length === 0) return { sent: 0, failed: 0 };
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .in("user_id", userIds)
    .eq("activo", true);
  let sent = 0, failed = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(sub.subscription as any, JSON.stringify(payload));
      sent++;
    } catch (err: any) {
      failed++;
      console.error("push send failed", err?.statusCode, err?.body);
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const now = new Date();
    const alertas = await buildAlertas(now);

    let totalEnviadas = 0;
    let totalFalladas = 0;
    let totalSkipped = 0;

    // Cache miembros por vocalia
    const usuariosCache = new Map<string, string[]>();

    for (const a of alertas) {
      const hoursAhead = (a.fecha.getTime() - now.getTime()) / 3600_000;
      const ventana = pickWindow(hoursAhead);
      if (!ventana) { totalSkipped++; continue; }

      // Check duplicate
      const { data: existing } = await supabase
        .from("push_alertas_enviadas")
        .select("id")
        .eq("tipo", a.tipo)
        .eq("recurso_id", a.recurso_id)
        .eq("ventana", ventana)
        .eq("fecha_objetivo", a.fecha.toISOString())
        .maybeSingle();
      if (existing) { totalSkipped++; continue; }

      let userIds = usuariosCache.get(a.vocalia_id);
      if (!userIds) {
        userIds = await usuariosDeVocalia(a.vocalia_id);
        usuariosCache.set(a.vocalia_id, userIds);
      }

      const payload = {
        title: `${a.titulo} - ${humanWindow(ventana)}`,
        body: "Tocá para ver en JusTrack",
        tag: `${a.tipo}-${a.recurso_id}-${ventana}`,
        data: { url: a.url },
      };
      const { sent, failed } = await enviarPushParaUsuarios(userIds, payload);
      totalEnviadas += sent;
      totalFalladas += failed;

      await supabase.from("push_alertas_enviadas").insert({
        tipo: a.tipo,
        recurso_id: a.recurso_id,
        ventana,
        fecha_objetivo: a.fecha.toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        alertas_evaluadas: alertas.length,
        enviadas: totalEnviadas,
        falladas: totalFalladas,
        skipped: totalSkipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("enviar-push-alertas error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
