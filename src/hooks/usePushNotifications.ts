import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  VAPID_PUBLIC_KEY,
  PUSH_SW_URL,
  urlBase64ToUint8Array,
  isPushSupported,
} from "@/lib/pushConfig";

export type PushStatus = "unsupported" | "denied" | "inactive" | "active";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("inactive");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "active" : "inactive");
    } catch {
      setStatus("inactive");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "inactive");
        return false;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration(PUSH_SW_URL)) ||
        (await navigator.serviceWorker.register(PUSH_SW_URL));
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return false;
      const json = sub.toJSON();
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: uid,
            endpoint: sub.endpoint,
            subscription: json as any,
            user_agent: navigator.userAgent,
            activo: true,
          },
          { onConflict: "user_id,endpoint" }
        );
      if (error) {
        console.error("push upsert failed", error);
        return false;
      }
      setStatus("active");
      return true;
    } catch (e) {
      console.error("enable push failed", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setStatus("inactive");
      return true;
    } catch (e) {
      console.error("disable push failed", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, enable, disable, refresh };
}
