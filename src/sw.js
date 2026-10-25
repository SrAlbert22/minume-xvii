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
const SUPA = __SUPABASE__;

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then(c => c.addAll(PRECARGA.map(u => new Request(u, { cache: 'reload' })))),
    caches.open('minume-cdn').then(c => Promise.all(LIBS.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})))),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'minume-cdn' && k !== 'minume-mapa' && k !== 'minume-sesion').map(k => caches.delete(k))))
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

// Avisos al teléfono (Web Push): llegan aunque la página esté cerrada o el teléfono bloqueado.
// Siempre se muestra, aunque la página esté abierta: en el teléfono es lo único que suena con el sonido del sistema.
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { t: 'MINUME XVII', b: e.data ? e.data.text() : '' }; }
  e.waitUntil(Promise.resolve().then(() => {
    const sistema = (String(d.url || '').match(/^\/([a-z]+)\//) || [])[1] || 'inicio';
    return self.registration.showNotification(d.t || 'MINUME XVII', {
      body: d.b || '', tag: d.tag || 'minume', renotify: true, requireInteraction: !!d.sos,
      icon: `/iconos/${sistema}-192.png`, badge: '/iconos/inicio-192.png', lang: 'es', timestamp: Date.now(),
      vibrate: d.sos ? [600, 200, 600, 200, 600, 200, 1000] : [300, 120, 300],
      data: { url: d.url || '/' },
      actions: d.tipo === 'chat' && /^chat-\d+$/.test(d.tag || '') ? [{ action: 'recibido', title: '✓ Recibido' }] : [],
    });
  }));
});

// Al tocar el aviso se abre el sistema en la sección que toca (o se trae al frente si ya estaba abierto)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  // «✓ Recibido» del chat: se marca sin abrir la página, con la sesión que dejó la página
  if (e.action === 'recibido') {
    const id = +String(e.notification.tag).slice(5);
    e.waitUntil(caches.open('minume-sesion').then(c => c.match('/__minume_sesion')).then(r => r && r.text()).then(t => t && fetch(`${SUPA.url}/rest/v1/rpc/minume_chat_recibido`, {
      method: 'POST', headers: { apikey: SUPA.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: t, p_id: id }),
    })).catch(() => {}));
    return;
  }
  const destino = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const equipo = u => new URL(u).pathname.split('/')[1];
    const c = l.find(x => equipo(x.url) === equipo(destino)) || l[0];
    if (!c) return self.clients.openWindow(destino);
    return c.focus().then(() => c.url === destino ? null : c.navigate(destino)).catch(() => self.clients.openWindow(destino));
  }));
});

// El navegador cambió la suscripción por su cuenta: se avisa a la base con la dirección vieja para no perder los avisos
self.addEventListener('pushsubscriptionchange', e => {
  const vieja = e.oldSubscription;
  e.waitUntil((e.newSubscription ? Promise.resolve(e.newSubscription)
    : vieja ? self.registration.pushManager.subscribe(vieja.options) : Promise.reject())
    .then(nueva => vieja && fetch(`${SUPA.url}/rest/v1/rpc/minume_push_cambio`, {
      method: 'POST', headers: { apikey: SUPA.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_viejo: vieja.endpoint, p_sub: nueva.toJSON() }),
    })).catch(() => {}));
});
