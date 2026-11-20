const VERSION = 'v3';
const CORE  = 'schedule-core-' + VERSION;
const FONTS = 'schedule-fonts-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './extras.js', './phone.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CORE).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('schedule-core-') && k !== CORE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Нажатие на уведомление открывает приложение
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow('./');
    })
  );
});

const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: отдаём из кэша, а в фоне обновляем
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async cache => {
      const cached = await cache.match(req);
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => cached || Response.error());
      return cached || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Страница: сначала сеть (чтобы приходили обновления), без сети — кэш
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([fetch(req), timeout(3500)])
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CORE).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Остальные файлы: кэш, а в фоне обновление
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CORE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});