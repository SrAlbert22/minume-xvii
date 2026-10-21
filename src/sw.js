// MINUME XVII · guarda los sistemas en el teléfono para que abran aunque no haya internet.
// Autor: Albert Silvestre
//
// Las páginas se piden primero a internet (así siempre llega la última versión) y, si no hay
// señal, salen de lo guardado. Las librerías y los pedazos del mapa satelital que ya se vieron
// también quedan guardados.
const VERSION = 'minume-__VERSION__';
const PRECARGA = __PRECARGA__;
const LIBS = __LIBS__;
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const MAPA = /^https:\/\/(server\.arcgisonline\.com|tiles\.openfreemap\.org)\//;
const MAX_MAPA = 600;

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then(c => c.addAll(PRECARGA.map(u => new Request(u, { cache: 'reload' })))),
    caches.open('minume-cdn').then(c => Promise.all(LIBS.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})))),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'minume-cdn' && k !== 'minume-mapa').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function recortar(cache, max) {
  const llaves = await cache.keys();
  for (let i = 0; i < llaves.length - max; i++) await cache.delete(llaves[i]);
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);

  if (r.mode === 'navigate') {
    e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => { const c = res.clone(); caches.open(VERSION).then(k => k.put(r, c)); return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match(url.href.replace(/[^/]*$/, '')))));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(m => {
      const red = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(k => k.put(r, c)); } return res; })
        .catch(() => m);
      return m || red;
    }));
    return;
  }
  if (CDN.test(r.url)) {
    e.respondWith(caches.open('minume-cdn').then(k => k.match(r).then(m => {
      const red = fetch(r).then(res => { if (res.ok || res.type === 'opaque') k.put(r, res.clone()); return res; }).catch(() => m);
      return m || red;
    })));
    return;
  }
  if (MAPA.test(r.url)) {
    e.respondWith(caches.open('minume-mapa').then(k => k.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { k.put(r, res.clone()); recortar(k, MAX_MAPA); }
      return res;
    }))));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : self.clients.openWindow('./')));
});
