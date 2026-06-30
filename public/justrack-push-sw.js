// IusTrack push notifications service worker (messaging-only, no caching)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'IusTrack', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'IusTrack';
  const options = {
    body: data.body || 'Tocá para ver en IusTrack',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data || { url: '/' },
    tag: data.tag,
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of allClients) {
      if ('focus' in c) {
        try { await c.navigate(url); } catch (_) {}
        return c.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
