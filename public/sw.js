self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión</title>
<body style="font-family:system-ui,sans-serif;background:#EEF7F6;color:#0E2F3A;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;margin:0;padding:24px">
<div><h1 style="margin:0 0 8px">Sin conexión</h1><p>Necesitamos internet para mostrarte los turnos disponibles. Revisá tu conexión y volvé a abrir la app.</p></div></body></html>`;

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});

// ---- Notificaciones push (nuevo turno) ----
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nuevo turno', {
      body: data.body || 'Abrí la app para verlo.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/admin' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/admin') && 'focus' in c) {
          return c.focus().then((w) => (w && w.navigate ? w.navigate(url) : w)).catch(() => { });
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});