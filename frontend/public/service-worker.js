const CACHE_NAME = 'pool-calculator-v3';
const CORE_ASSETS = [
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png',
];

const NEVER_CACHE_PATHS = new Set([
  '/',
  '/index.html',
  '/service-worker.js',
  '/manifest.json',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Nunca cachear API ni auth para evitar datos obsoletos por usuario/rol.
  if (url.pathname.startsWith('/api') || NEVER_CACHE_PATHS.has(url.pathname)) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => caches.match('/index.html').then((response) => response || caches.match('/')))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          });

        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch (_error) {
      return {
        title: 'Recordatorio de agenda',
        body: event.data?.text?.() || 'Tenés una novedad pendiente en la agenda.',
      };
    }
  })();

  const title = payload.title || 'Recordatorio de agenda';
  const options = {
    body: payload.body || 'Tenés una novedad pendiente en la agenda.',
    icon: payload.icon || '/pwa-192.png',
    badge: payload.badge || '/pwa-192.png',
    tag: payload.tag || 'agenda-reminder',
    data: {
      url: payload.url || '/agenda',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/agenda';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
