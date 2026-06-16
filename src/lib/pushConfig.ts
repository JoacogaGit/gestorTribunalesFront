// VAPID public key (safe to expose) — pair with VAPID_PRIVATE_KEY secret in edge functions
export const VAPID_PUBLIC_KEY =
  "BMj2twloRuyaGk5x3Hr2mVAihRhULqJbNy9XioO30z03L7c7oONQfQfBVcHGg2D8M6AXBw5398CYwXCUXOmDsmI";

export const PUSH_SW_URL = "/justrack-push-sw.js";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
