// MINUME XVII · Chat del staff: canal General y uno por equipo · Albert Silvestre
// ---------- Chat del staff: canal General y uno por equipo ----------
// Los mensajes se guardan en Supabase (minume_chat) y solo se leen con la sesión del código.
// El servidor avisa en tiempo real «hay mensaje nuevo en tal canal» y cada teléfono lo pide; si no hay tiempo real, revisa cada 20 s.
const CANALES_CHAT = {
  general: ['General', 'Todo el staff', 'var(--m-celeste)'], asistencia: ['Asistencia', 'Asistencia, Bienvenida y Acreditación', '#00b5ff'],
  seguridad: ['Seguridad y Traslado', 'Seguridad y traslado', '#e53535'], bienestar: ['Bienestar', 'Bienestar físico y emocional', '#00fdef'],
  eventos: ['Eventos y Protocolo', 'Eventos y protocolo', '#ffbeff'], coordinacion: ['Coordinación', 'Coordinadores de cada equipo', '#0090fb'],
};
const chat = { canal: null, msgs: {}, resumen: {}, cargando: false, cola: leer('chat.cola', []) };
function misCanalesChat() {
  const u = estado.usuario; if (!u) return [];
  let sis = SIS_DE_CODIGO(u.codigo) || SISTEMA;
  if (sis === 'coordinacion') return Object.keys(CANALES_CHAT);
  if (sis === 'acreditacion') sis = 'asistencia';   // misma subsecretaría: mismo canal
  return ['general', sis, ...(esDir() ? ['coordinacion'] : [])].filter((k, i, l) => CANALES_CHAT[k] && l.indexOf(k) === i);
}
// Cada persona tiene su color (siempre el mismo) y su círculo con iniciales, para saber de un vistazo quién escribió
const COLORES_PERSONA = ['#00b5ff', '#ff7a8a', '#00fdef', '#ffbeff', '#ffd23f', '#7cf29a', '#ff9a3c', '#b69cff', '#5fd0ff', '#ff6fd8', '#c8f05a', '#ffb4a2'];
const colorPersona = k => { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORES_PERSONA[h % COLORES_PERSONA.length]; };
const inicialesChat = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const chatAbierto = () => !document.hidden && !!$('#chat') && $('#chat').offsetParent !== null;
const rpcChat = (fn, args) => window.MINUME_RPC ? window.MINUME_RPC(fn, args) : Promise.reject(new Error('Sin conexión con el servidor'));
const horaCorta = t => new Date(t).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Santo_Domingo' });

function pintarCanalesChat() {
  const l = misCanalesChat();
  $('#chatCanales').innerHTML = l.map(k => {
    const [n, d, c] = CANALES_CHAT[k], r = chat.resumen[k] || {}, u = r.ultimo;
    return `<button type="button" class="chat-canal${k === chat.canal ? ' on' : ''}${r.urgentes ? ' urge' : ''}" data-canal="${k}" style="--c:${c}"><span class="chat-bola"></span>
      <span class="chat-canal-t"><b>${n}</b><small>${u ? esc((u.mio ? 'Tú' : u.nombre.split(' ')[0]) + ': ' + u.texto) : esc(d)}</small></span>${r.sinLeer ? `<i class="chat-num">${r.sinLeer > 99 ? '99+' : r.sinLeer}</i>` : ''}</button>`;
  }).join('');
  pintarInsigniasChat();
}
// Numerito de «sin leer» en el menú, el botón de abajo y la tarjeta del inicio
function pintarInsigniasChat() {
  const n = Object.entries(chat.resumen).reduce((a, [k, r]) => a + (k === chat.canal && chatAbierto() ? 0 : r.sinLeer || 0), 0);
  const urg = Object.values(chat.resumen).some(r => r.urgentes);
  $$('#rail a[href="#chat"], .barra-abajo [data-ir="chat"], .acceso[data-ir="chat"]').forEach(el => {
    let b = el.querySelector('.insignia'); if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('i'); b.className = 'insignia'; el.append(b); }
    b.textContent = n > 99 ? '99+' : n; b.classList.toggle('urge', urg);
  });
}
function pintarMensajes(irAbajo) {
  const caja = $('#chatLista'), l = chat.msgs[chat.canal] || [], pend = chat.cola.filter(p => p.canal === chat.canal);
  const abajo = irAbajo || caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80;
  let dia = '', antes = null;
  caja.innerHTML = (l.length || pend.length ? '' : `<div class="chat-vacio"><b>Todavía no hay mensajes aquí</b><span>Escribe el primero: llega al instante a ${esc(CANALES_CHAT[chat.canal][1].toLowerCase())}.</span></div>`) + l.map(m => {
    const d = new Date(m.creado).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santo_Domingo' });
    const sep = d !== dia ? `<div class="chat-dia">${dia = d}</div>` : '';
    // mensajes seguidos de la misma persona (menos de 5 min) van juntos: el nombre y el círculo salen una sola vez
    const quien = m.nombre + '|' + m.sistema, seguido = !sep && antes && antes.quien === quien && Date.parse(m.creado) - antes.t < 300000;
    antes = { quien, t: Date.parse(m.creado) };
    const p = colorPersona(quien), equipo = CANALES_CHAT[m.sistema] || CANALES_CHAT.general;
    const rec = m.urgente ? (m.mio ? `<small class="chat-rec">${m.recibido && m.recibido.length ? `✓Recibido por ${esc(m.recibido.join(', '))}` : 'Nadie lo ha marcado como recibido todavía'}</small>`
      : m.yaRecibi ? '<small class="chat-rec">✓Marcaste recibido</small>' : `<button class="boton chat-recibir" type="button" data-recibir="${m.id}">Recibido</button>`) : '';
    return `${sep}<div class="chat-fila${m.mio ? ' mio' : ''}${seguido ? ' seguido' : ''}" style="--p:${p}">
      ${m.mio ? '' : `<span class="chat-avatar" title="${esc(m.nombre)}">${seguido ? '' : esc(inicialesChat(m.nombre))}</span>`}
      <div class="chat-msg${m.mio ? ' mio' : ''}${m.urgente ? ' urgente' : ''}">
        ${seguido ? '' : m.mio ? '<b class="chat-quien">Tú</b>' : `<b class="chat-quien">${esc(m.nombre)}<span class="chat-equipo" style="--e:${equipo[2]}">${esc(NOMBRE_SIS[m.sistema] || m.sistema)}</span></b>`}
        ${m.urgente ? '<span class="chat-urge">URGENTE</span>' : ''}<p>${esc(m.texto)}</p>
        <small class="chat-hora">${horaCorta(m.creado)}${m.mio ? ` · ${m.vistos ? `visto por ${m.vistos}` : 'enviado'}` : ''}</small>${rec}</div></div>`;
  }).join('') + pend.map(p => `<div class="chat-fila mio"><div class="chat-msg mio pendiente${p.urgente ? ' urgente' : ''}"><p>${esc(p.texto)}</p><small class="chat-hora">${navigator.onLine === false ? 'Sin internet: se envía cuando vuelva' : 'Enviando…'}</small></div></div>`).join('');
  if (abajo) caja.scrollTop = caja.scrollHeight;
}
async function cargarChat(irAbajo) {
  if (!chat.canal || !estado.usuario) return;
  const k = chat.canal;
  try {
    const l = await rpcChat('minume_chat_leer', { p_canal: k });
    chat.msgs[k] = l; if (k === chat.canal) pintarMensajes(irAbajo);
    $('#chatEstado').textContent = 'En línea'; $('#chatEstado').className = 'chip verde';
    if (chatAbierto() && l.length) { marcarVistoChat(k, l[l.length - 1].id); borrarNotificaciones(l.filter(m => !m.urgente || m.yaRecibi || m.mio).map(m => 'chat-' + m.id)); }
  } catch (e) { $('#chatEstado').textContent = navigator.onLine === false ? 'Sin internet' : 'Sin conexión'; $('#chatEstado').className = 'chip amarillo'; if (k === chat.canal && !chat.msgs[k]) pintarMensajes(); }
}
let vistoT = null;
function marcarVistoChat(k, id) {
  if (chat.resumen[k]) { chat.resumen[k].sinLeer = 0; pintarCanalesChat(); }
  clearTimeout(vistoT); vistoT = setTimeout(() => rpcChat('minume_chat_visto', { p_canal: k, p_ultimo: id }).catch(() => {}), 600);
}
async function resumenChat(avisar) {
  if (!estado.usuario || !window.MINUME_RPC) return;
  try {
    const r = await rpcChat('minume_chat_resumen', {}), antes = chat.resumen; chat.resumen = r || {};
    if (avisar) for (const [k, v] of Object.entries(chat.resumen)) {
      const u = v.ultimo, viejo = antes[k] && antes[k].ultimo;
      if (!u || u.mio || (viejo && viejo.id >= u.id) || (k === chat.canal && chatAbierto())) continue;
      avisoChat(k, u);
    }
    pintarCanalesChat(); pintarBannerChat();
  } catch {}
}
// Mensaje nuevo en otro canal o con el chat cerrado: aviso con sonido; si es urgente suena más fuerte y vibra
function avisoChat(k, u) {
  if (alertasOn()) { if (u.urgente) { tono(880, .18, .3); setTimeout(() => tono(660, .18, .3), 200); setTimeout(() => tono(880, .25, .3), 400); } else tono(740, .09, .12, 'sine'); }
  vibrar(u.urgente ? [300, 120, 300, 120, 500] : 120);
  toast(`${u.urgente ? '' : ''}${u.nombre.split(' ')[0]} · ${CANALES_CHAT[k][0]}: ${u.texto}`);
  if (u.urgente && 'Notification' in window && Notification.permission === 'granted' && document.hidden && !pushActivo()) try { new Notification(`Urgente · ${CANALES_CHAT[k][0]}`, { body: `${u.nombre}: ${u.texto}`, tag: 'chat-' + u.id }); } catch {}
}
// Aviso arriba de la página mientras haya mensajes urgentes del chat sin marcar «Recibido» (en el chat mismo no hace falta)
function pintarBannerChat() {
  const b = $('#bannerChat'); if (!b) return;
  const pend = Object.entries(chat.resumen).filter(([, r]) => r.urgentes > 0);
  if (!pend.length || !estado.usuario || (typeof seccionActual !== 'undefined' && seccionActual === 'chat')) { b.hidden = true; return; }
  const [k, r] = pend[0], n = pend.reduce((a, [, x]) => a + x.urgentes, 0), u = r.ultimo && r.ultimo.urgente && !r.ultimo.mio ? r.ultimo : null;
  b.hidden = false;
  b.innerHTML = `<div class="bo-txt"><b>Aviso en el chat · ${esc(CANALES_CHAT[k][0])}</b><span>${u ? `${esc(u.nombre.split(' ')[0])}: ${esc(u.texto)}` : `Tienes ${n} aviso${n > 1 ? 's' : ''} sin marcar «Recibido»`}</span>${u && n > 1 ? `<small>y ${n - 1} más sin marcar</small>` : ''}</div>
    <div class="bo-acc">${u ? `<button class="boton" type="button" data-bc-recibido="${u.id}">Recibido</button>` : ''}<button class="boton sec" type="button" data-bc-ver="${k}">Ver en el chat</button></div>`;
}
$('#bannerChat').addEventListener('click', async e => {
  const v = e.target.closest('[data-bc-ver]');
  if (v) { abrirSeccion('chat'); abrirCanalChat(v.dataset.bcVer); return; }
  const r = e.target.closest('[data-bc-recibido]'); if (!r) return; r.disabled = true;
  try { await rpcChat('minume_chat_recibido', { p_id: +r.dataset.bcRecibido }); borrarNotificaciones(['chat-' + r.dataset.bcRecibido]); toast('Marcado como recibido'); await resumenChat(false); }
  catch (er) { r.disabled = false; toast(er.message || 'No se pudo marcar'); }
});
function abrirCanalChat(k) {
  if (!misCanalesChat().includes(k)) return;
  chat.canal = k; guardar('chat.canal', k);
  const [n, d] = CANALES_CHAT[k]; $('#chatTitulo').textContent = n; $('#chatSub').textContent = d;
  pintarCanalesChat(); pintarMensajes(true); cargarChat(true); ajustarChatAlto(); ajustarLuego();
}
function pintarChat() {
  const l = misCanalesChat(); if (!l.length) return;
  if (!l.includes(chat.canal)) { const g = leer('chat.canal', null); chat.canal = l.includes(g) ? g : l[0]; }
  abrirCanalChat(chat.canal); resumenChat(false);
}
async function enviarChat(texto, urgente) {
  texto = String(texto || '').trim(); if (!texto) return;
  const p = { id: nuevoId('p'), canal: chat.canal, texto, urgente: !!urgente };
  chat.cola.push(p); guardar('chat.cola', chat.cola); pintarMensajes(true);
  await vaciarColaChat();
}
let vaciando = false;
async function vaciarColaChat() {
  if (vaciando || !chat.cola.length || navigator.onLine === false) return;
  vaciando = true;
  while (chat.cola.length) {
    const p = chat.cola[0];
    try { await rpcChat('minume_chat_enviar', { p_canal: p.canal, p_texto: p.texto, p_urgente: p.urgente }); chat.cola.shift(); guardar('chat.cola', chat.cola); }
    catch (e) { if (navigator.onLine === false || /fetch|network/i.test(e.message)) break; chat.cola.shift(); guardar('chat.cola', chat.cola); toast(e.message || 'No se pudo enviar'); }
  }
  vaciando = false; cargarChat(true);
}

const pintarRapidos = () => { $('#chatRapidos').innerHTML = RAPIDOS.map(t => `<button class="mini" type="button" data-rapido="${esc(t)}">${esc(t)}</button>`).join(''); };
pintarRapidos(); window.pintarRapidos = pintarRapidos;
$('#chatRapidos').addEventListener('click', e => {
  const b = e.target.closest('[data-rapido]'); if (!b) return; const t = b.dataset.rapido;
  if (t.endsWith('…')) { const i = $('#chatTexto'); i.value = t.slice(0, -1) + ' '; i.focus(); return; }
  enviarChat(t, false);
});
$('#chatForm').addEventListener('submit', e => {
  e.preventDefault(); const i = $('#chatTexto'), u = $('#chatUrgente');
  if (!i.value.trim()) return i.focus();
  enviarChat(i.value, u.checked); i.value = ''; u.checked = false; $('#chatForm').classList.remove('urge'); i.focus();
});
$('#chatUrgente').addEventListener('change', e => $('#chatForm').classList.toggle('urge', e.target.checked));
$('#chatCanales').addEventListener('click', e => { const b = e.target.closest('[data-canal]'); if (b) abrirCanalChat(b.dataset.canal); });
$('#chatLista').addEventListener('click', async e => {
  const b = e.target.closest('[data-recibir]'); if (!b) return; b.disabled = true;
  try { await rpcChat('minume_chat_recibido', { p_id: +b.dataset.recibir }); borrarNotificaciones(['chat-' + b.dataset.recibir]); cargarChat(); resumenChat(false); } catch (er) { b.disabled = false; toast(er.message || 'No se pudo marcar'); }
});
// Tiempo real: el canal abierto se recarga; los demás actualizan su numerito y avisan
addEventListener('minume-chat', e => {
  const k = e.detail && e.detail.canal; if (!k || !misCanalesChat().includes(k)) return;
  if (k === chat.canal && chatAbierto()) cargarChat(); else { if (k === chat.canal) cargarChat(); resumenChat(true); }
});
addEventListener('online', vaciarColaChat);
document.addEventListener('visibilitychange', () => { if (!document.hidden && estado.usuario) { resumenChat(true); if (chatAbierto()) cargarChat(); } });
setInterval(() => { if (document.hidden || !estado.usuario) return; if (chatAbierto()) cargarChat(); }, 20000);
setInterval(() => { if (!document.hidden && estado.usuario) resumenChat(true); }, 60000);
// En el teléfono el chat ocupa justo lo que queda entre la cabecera y la barra de abajo (la caja de escribir siempre a la vista)
function ajustarChatAlto() {
  const c = $('.chat'); if (!c || !c.offsetParent) return;
  if (innerWidth > 760) { c.style.removeProperty('--chat-alto'); return; }
  const barra = $('#barraAbajo'), abajo = Math.max(barra ? barra.getBoundingClientRect().height : 0, 74);   // la barra de abajo mide unos 74 px
  const arriba = c.getBoundingClientRect().top + scrollY;
  c.style.setProperty('--chat-alto', Math.max(360, innerHeight - arriba - abajo - 10) + 'px');
}
addEventListener('resize', ajustarChatAlto);
const ajustarLuego = () => setTimeout(ajustarChatAlto, 350);
window.CHAT_LISTO = true;
if (estado.usuario) setTimeout(pintarChat, 0);
