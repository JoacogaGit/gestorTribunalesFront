import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type RolInvitacion = "admin" | "miembro";

export interface InvitacionRow {
  id: string;
  email_invitado: string;
  rol_a_asignar: RolInvitacion;
  token: string;
  created_at: string | null;
  expira_en: string | null;
  usado: boolean | null;
}

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export function useInvitaciones(tribunalId: string | null | undefined) {
  const { user } = useAuth();
  const [invitaciones, setInvitaciones] = useState<InvitacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!tribunalId) { setInvitaciones([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase
      .from("invitaciones")
      .select("id, email_invitado, rol_a_asignar, token, created_at, expira_en, usado")
      .eq("tribunal_id", tribunalId)
      .eq("usado", false)
      .gt("expira_en", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (e) setError(e.message);
    setInvitaciones((data ?? []) as InvitacionRow[]);
    setLoading(false);
  }, [tribunalId]);

  useEffect(() => { refetch(); }, [refetch]);

  const crear = useCallback(async (
    email: string,
    rol: RolInvitacion,
    enviarMail: boolean,
  ): Promise<Result<{ invitacion: InvitacionRow; sent: boolean; reason?: string }>> => {
    if (!tribunalId || !user) return { ok: false, error: "No hay tribunal o usuario" };
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("invitaciones")
        .insert({
          tribunal_id: tribunalId,
          email_invitado: email.trim().toLowerCase(),
          rol_a_asignar: rol,
          invitado_por: user.id,
        })
        .select("id, email_invitado, rol_a_asignar, token, created_at, expira_en, usado")
        .single();
      if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la invitación" };
      const invitacion = data as InvitacionRow;

      let sent = false;
      let reason: string | undefined;
      if (enviarMail) {
        try {
          const { data: r } = await supabase.functions.invoke("send-invitation-email", {
            body: { invitacion_id: invitacion.id },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rr = r as any;
          sent = !!rr?.sent;
          reason = rr?.reason;
        } catch {
          sent = false;
          reason = "function_error";
        }
      }
      await refetch();
      return { ok: true, data: { invitacion, sent, reason } };
    } finally { setSaving(false); }
  }, [tribunalId, user, refetch]);

  const cancelar = useCallback(async (id: string): Promise<Result> => {
    setSaving(true);
    try {
      const { error } = await supabase.from("invitaciones").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
      await refetch();
      return { ok: true };
    } finally { setSaving(false); }
  }, [refetch]);

  const reenviar = useCallback(async (id: string): Promise<Result<{ sent: boolean; reason?: string }>> => {
    setSaving(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("send-invitation-email", {
        body: { invitacion_id: id },
      });
      if (error) return { ok: false, error: error.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rr = r as any;
      return { ok: true, data: { sent: !!rr?.sent, reason: rr?.reason } };
    } finally { setSaving(false); }
  }, []);

  return { invitaciones, loading, error, saving, refetch, crear, cancelar, reenviar };
}
