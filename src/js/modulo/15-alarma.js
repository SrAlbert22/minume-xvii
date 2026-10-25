// MINUME XVII · Alarma de SOS · Albert Silvestre
// ---------- Alarma de SOS ----------
let alAudio = null, alSirena = null, alVib = null, alActual = null;
const esUrgente = a => /^SOS/i.test(a.tipo || '') || /^Nivel 3/.test(a.tipo || '');
const alertasOn = () => leer('alertas', false);
function audioListo() { try { alAudio = alAudio || new (window.AudioContext || window.webkitAudioContext)(); if (alAudio.state === 'suspended') alAudio.resume(); return alAudio; } catch { return null; } }
function tono(f, d, vol = .2, tipo = 'square') {
  const ctx = audioListo(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo; o.frequency.value = f;
  g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + d);
  o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
}
function sirena(on) {
  clearInterval(alSirena); alSirena = null;
  if (!on) return;
  let alto = false; const sonar = () => { alto = !alto; tono(alto ? 1050 : 760, .42); };
  sonar(); alSirena = setInterval(sonar, 450);
}
function notificar(titulo, cuerpo) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden || pushActivo()) return;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(titulo, { body: cuerpo, tag: 'minume-alerta', renotify: true, requireInteraction: true }));
    else new Notification(titulo, { body: cuerpo });
  } catch {}
}
function pintarBotonAlertas() {
  const b = $('#bAlertas'); if (!b) return;
  const on = alertasOn(); b.classList.toggle('on', on);
  b.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/></svg><span>${on ? 'Alertas activas' : 'Activar alertas'}</span>`;
  b.title = on ? 'Los SOS y los comunicados urgentes suenan en este teléfono' : 'Toca para que los SOS suenen en este teléfono';
}
function activarAlertas() {
  audioListo(); tono(880, .15, .15, 'sine');
  guardar('alertas', true); pintarBotonAlertas();
  if (pushPosible()) activarPush({ callado: true }).then(ok => toast(ok ? 'Alertas activadas: los SOS suenan aunque el teléfono esté bloqueado' : 'Alertas activadas: los SOS van a sonar con la página abierta'));
  else { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); toast('Alertas activadas: los SOS van a sonar en este teléfono'); }
}
function alarmaSOS(a) {
  alActual = a;
  const lugar = a.salon ? 'Salón ' + a.salon : a.donde || a.sede || 'Lugar sin indicar';
  $('#alEti').textContent = /^SOS/i.test(a.tipo) ? 'SOS · EMERGENCIA' : 'NIVEL 3 · ESCALAR YA';
  $('#alTit').textContent = (a.tipo || '').replace(/^SOS · /, '');
  $('#alTxt').innerHTML = `<b>${esc(lugar)}</b>${a.comision ? ' · ' + esc(a.comision) : ''}<br>${esc(a.texto && a.texto !== a.tipo ? a.texto : '')}<br><small>Enviado por ${esc(a.por || '—')} · ${NOMBRE_SIS[a.de] || ''} · ${hora(a.t)}</small>`;
  $('#alVoy').hidden = !(a.para === SISTEMA || SISTEMA === 'todo') || CERRADO(a);
  $('#alarma').hidden = false; document.body.classList.add('en-alarma');
  sirena(true);
  vibrar([500, 200, 500, 200, 900]); clearInterval(alVib); alVib = setInterval(() => vibrar([500, 200, 500]), 2600);
  notificar(`${$('#alEti').textContent}: ${$('#alTit').textContent}`, lugar);
}
function cerrarAlarma() { if (alActual) borrarNotificaciones(['sos-' + alActual.id]); $('#alarma').hidden = true; document.body.classList.remove('en-alarma'); sirena(false); clearInterval(alVib); vibrar(0); alActual = null; }
$('#alVoy').onclick = () => { if (alActual) { cambiarAviso(alActual.id, 'camino'); toast('Avisaste que vas en camino'); registrar('🚨 Voy en camino', `${alActual.tipo} · ${alActual.salon ? 'Salón ' + alActual.salon : alActual.donde || ''}`); pintarTablero(); pintarCasos(); } cerrarAlarma(); };
$('#alMapa').onclick = () => { const a = alActual; cerrarAlarma(); $('#mapa').scrollIntoView(); if (a && a.salon) setTimeout(() => mostrarSalon(a.salon, a.comision && ASIGNA[a.comision] ? ASIGNA[a.comision][0] : ''), 300); };
$('#alCerrar').onclick = cerrarAlarma;
// si el navegador no dejó sonar la sirena (nadie había tocado la página), el primer toque la arranca
$('#alarma').addEventListener('pointerdown', () => audioListo());
$('#bAlertas').onclick = () => { if (alertasOn()) { tono(880, .15, .15, 'sine'); toast('Las alertas ya están activas en este teléfono'); } else activarAlertas(); };
