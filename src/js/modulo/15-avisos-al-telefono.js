// MINUME XVII · Avisos al teléfono (Web Push) · Albert Silvestre
// ---------- Avisos al teléfono (Web Push) ----------
// Con esto los SOS, el nivel 3, los comunicados urgentes y los mensajes urgentes del chat llegan aunque
// la página esté cerrada o el teléfono bloqueado. La base decide a quién le llega cada aviso (supabase/esquema.sql)
// y la Edge Function «minume-push» lo envía. Aquí solo se pide el permiso y se guarda la suscripción del teléfono.
const PUSH_LLAVE = (window.MINUME_SUPABASE || {}).vapid;
const esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushPosible = () => !!PUSH_LLAVE && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:';
const pushActivo = () => leer('push', false) && 'Notification' in window && Notification.permission === 'granted';
const llaveBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const nombreTelefono = () => { const u = navigator.userAgent; return (/Android/.test(u) ? 'Android' : esIOS ? 'iPhone' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'Otro') + ' · ' + (/Edg\//.test(u) ? 'Edge' : /SamsungBrowser/.test(u) ? 'Samsung' : /Firefox/.test(u) ? 'Firefox' : /Chrome/.test(u) ? 'Chrome' : 'Safari'); };

// Borra del teléfono las notificaciones que ya se leyeron (cada una tiene su etiqueta: chat-<id>, com-<id>, sos-<id>, ord-<id>)
async function borrarNotificaciones(etiquetas) {
  if (!('serviceWorker' in navigator) || !etiquetas || !etiquetas.length) return;
  try { const quitar = new Set(etiquetas); (await (await navigator.serviceWorker.ready).getNotifications()).forEach(n => { if (quitar.has(n.tag)) n.close(); }); } catch {}
}
// El botón «✓ Recibido» de la notificación funciona con la página cerrada: el service worker usa la misma sesión
let sesionSW = null;
function sesionAlServiceWorker() {
  let t = null; try { t = localStorage.getItem(window.MINUME_TOKEN_CLAVE || 'minume.sesion.token'); } catch {}
  if (t === sesionSW || !('caches' in window)) return; sesionSW = t;
  caches.open('minume-sesion').then(c => t ? c.put('/__minume_sesion', new Response(t)) : c.delete('/__minume_sesion')).catch(() => {});
}

// Guarda la suscripción de este teléfono a nombre del código con el que se entró
async function suscribirPush() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // si la llave cambió, la suscripción vieja ya no sirve
  if (sub && sub.options && sub.options.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== PUSH_LLAVE) { await sub.unsubscribe().catch(() => {}); sub = null; }
  sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveBytes(PUSH_LLAVE) });
  const r = await window.MINUME_RPC('minume_push_suscribir', { p_sub: sub.toJSON(), p_dispositivo: nombreTelefono() });
  sesionAlServiceWorker();
  guardar('push', true); if (!leer('alertas', false)) { guardar('alertas', true); pintarBotonAlertas(); }   // con avisos al teléfono, la sirena de la página también queda encendida
  guardar('pushSub', { ep: sub.endpoint, ref: estado.usuario && (estado.usuario.ref || estado.usuario.codigo) });
  return r;
}

async function activarPush({ callado = false } = {}) {
  if (!pushPosible()) {
    if (!callado) toast(esIOS && !instalada() ? 'En iPhone: primero agrega MINUME a la pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí' : 'Este navegador no puede recibir avisos con la pantalla bloqueada. Usa Chrome.');
    return false;
  }
  if (!window.MINUME_RPC || !estado.usuario || !estado.usuario.ref) { if (!callado) toast('Entra con tu código personal para recibir avisos en el teléfono'); return false; }
  let permiso = Notification.permission;
  if (permiso === 'default') permiso = await Notification.requestPermission().catch(() => 'denied');
  if (permiso !== 'granted') {
    if (!callado) toast('Las notificaciones están bloqueadas: tócale al candado junto a la dirección → Notificaciones → Permitir');
    pintarBotonPush(); return false;
  }
  try { await suscribirPush(); pintarBotonPush(); if (!callado) toast('Listo: los SOS y los urgentes llegan aunque el teléfono esté bloqueado'); return true; }
  catch (e) { if (!callado) toast(navigator.onLine === false ? 'Sin internet: actívalo cuando vuelva la señal' : 'No se pudo activar. Intenta otra vez.'); return false; }
}

async function apagarPush() {
  guardar('push', false);
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) { if (window.MINUME_RPC) await window.MINUME_RPC('minume_push_quitar', { p_endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  } catch {}
  guardar('pushSub', null); pintarBotonPush();
  sesionSW = undefined; try { caches.delete('minume-sesion'); } catch {}
}

function pintarBotonPush() {
  const b = $('#bPush'); if (!b) return;
  const on = pushActivo(); b.classList.toggle('on', on); b.hidden = !estado.usuario || (!pushPosible() && !(esIOS && !instalada()));
  b.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>${on ? '<path d="m9.5 10 2 2 3.5-4"/>' : '<path d="M12 7v4M12 13.5v.01"/>'}</svg><span>${on ? 'Avisos al teléfono' : 'Avisos con pantalla bloqueada'}</span>`;
  b.title = on ? 'Los SOS y los urgentes llegan aunque el teléfono esté bloqueado. Toca para probar.' : 'Toca para que los SOS y los urgentes lleguen aunque el teléfono esté bloqueado';
}

// Ventana con el estado, la prueba y el botón para apagar
function ventanaPush() {
  const v = document.createElement('div'); v.className = 'sos-velo on push-velo'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  const cerrar = () => v.remove();
  v.innerHTML = `<div class="tarjeta"><b class="cond" style="font-size:28px">Avisos al teléfono</b>
    <p>Este teléfono recibe los <b>SOS</b>, el <b>nivel 3</b>, los <b>comunicados urgentes</b> y los <b>mensajes urgentes del chat</b> aunque la página esté cerrada o la pantalla bloqueada.</p>
    <p class="push-paso">Para probarlo: toca «Mandar una prueba», <b>bloquea el teléfono</b> y espera 10 segundos.</p>
    ${esIOS ? '<p class="push-nota">En iPhone suena con el sonido normal de notificaciones (no con la sirena) y solo si MINUME está agregada a la pantalla de inicio.</p>' : '<p class="push-nota">Si no suena: Ajustes del teléfono → Apps → Chrome → Notificaciones → minume-xvii.vercel.app → Sonido activado. Y que el teléfono no esté en «No molestar».</p>'}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="boton" data-p="probar" type="button">Mandar una prueba</button><button class="boton sec" data-p="cerrar" type="button">Cerrar</button><button class="boton sec" data-p="apagar" type="button">Apagar en este teléfono</button></div></div>`;
  v.addEventListener('click', async e => {
    const b = e.target.closest('[data-p]'); if (!b) { if (e.target === v) cerrar(); return; }
    if (b.dataset.p === 'cerrar') return cerrar();
    if (b.dataset.p === 'apagar') { await apagarPush(); cerrar(); toast('Apagado: solo sonará con la página abierta'); return; }
    b.disabled = true;
    try {
      await suscribirPush();   // por si el teléfono cambió de código o la suscripción se renovó
      const r = await window.MINUME_RPC('minume_push_probar', {});
      toast(r && r.telefonos ? 'Prueba en camino: bloquea el teléfono y espera 10 segundos' : 'Este teléfono no quedó registrado. Toca otra vez.');
      if (r && r.telefonos) cerrar();
    } catch (err) { toast(/varias pruebas/.test(err.message) ? err.message : 'No se pudo mandar la prueba. Revisa la señal.'); }
    b.disabled = false;
  });
  document.body.appendChild(v);
}

$('#bPush').onclick = () => pushActivo() ? ventanaPush() : activarPush();
const salirSinPush = $('#bSalir').onclick;
$('#bSalir').onclick = async e => { if (leer('push', false)) await Promise.race([apagarPush(), new Promise(r => setTimeout(r, 2500))]); salirSinPush.call($('#bSalir'), e); };

// Al entrar (o al cambiar de código) el teléfono vuelve a quedar a nombre de quien está usando la página
let revisandoPush = false;
function revisarPush() {
  pintarBotonPush(); if (pushActivo()) sesionAlServiceWorker();
  if (revisandoPush) return;
  if (!pushPosible() || !estado.usuario || !estado.usuario.ref || !window.MINUME_RPC) return;
  const s = leer('pushSub', null);
  if (Notification.permission === 'granted' && leer('push', false) && (!s || s.ref !== estado.usuario.ref || Date.now() - (leer('pushRevisado', 0)) > 864e5))
  { revisandoPush = true; suscribirPush().then(() => guardar('pushRevisado', Date.now())).catch(() => {}).finally(() => { revisandoPush = false; }); }
  else if (leer('push', false) && Notification.permission === 'denied') { guardar('push', false); pintarBotonPush(); }
}
addEventListener('minume-sync', e => { if (e.detail === 'conectado') revisarPush(); });
setTimeout(revisarPush, 1500);
