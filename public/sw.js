self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Veyli | Offline</title><body style="background:#141414;color:#f5f5f2;font-family:system-ui,sans-serif;padding:2rem"><h1 style="color:#ff3045">You are offline.</h1><p>Reconnect to load today’s challenges.</p></body></html>',
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          }
        )
    )
  );
});
