// MINUME XVII · Navegación fácil: botones grandes y una sola pantalla a la vez · Albert Silvestre
// ---------- Navegación fácil: botones grandes y una sola pantalla a la vez ----------
// En lugar de una página larga, cada equipo ve su inicio con «¿Qué quieres hacer?» y abre una sección a la vez.
// El botón «Volver» y el botón de atrás del teléfono regresan al inicio.
const ICO = {
  flecha: 'M5 12h14M13 6l6 6-6 6',
  casa: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', megafono: 'M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2zM17 8a5 5 0 0 1 0 8',
  lista: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', estrella: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', asiento: 'M6 11V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 11h16v4H4zM6 15v6M18 15v6',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', ruta: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  corazon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', bolso: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  calendario: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2', mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', alerta: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  caminar: 'M13 4a1.5 1.5 0 1 0 0 .01M10 21l2-6 3 3v3M8 12l2-4 4 1 2 4M10 8l-2 8', aviso: 'M12 8v5M12 16h.01M4 20h16L12 4z',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12zM8.5 12h.01M12 12h.01M15.5 12h.01',
  bus: 'M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11M5 11h14M5 17h14v2H5zM8 19v2M16 19v2M8 14h.01M16 14h.01',
  libro: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16', check: 'M4 12l5 5L20 6', reloj: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  grupo: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6M3 20a6 6 0 0 1 12 0M15 14a6 6 0 0 1 6 6', tarjeta: 'M3 6h18v12H3zM3 10h18M7 15h4',
  grafico: 'M4 20V10M10 20V4M16 20v-8M22 20H2', reporte: 'M7 3h7l5 5v13H7zM14 3v5h5M9.5 13h5M9.5 16.5h3.5', cruz: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z', ajustes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M8 10v4M16 16v4',
};
const ico = (k, t = 26) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICO[k] || ICO.estrella}"/></svg>`;
// sección: [ícono, nombre corto, para qué sirve, en una línea]
const SECCION = {
  inicio: ['casa', 'Inicio', 'Tu tablero'], subdireccion: ['grupo', 'Mi subdirección', 'Tu staff, quién está activo y lo que puedes editar'], datos: ['ajustes', 'Datos del evento', 'Horarios, salones, staff y códigos'],
  comunicados: ['megafono', 'Comunicados', 'Avisos para todo el staff'], chat: ['chat', 'Chat', 'Mensajes con tu equipo y el staff'], rendimiento: ['grafico', 'Rendimiento', 'Quién trabaja y cómo va cada persona'], 'comisiones-vivo': ['lista', 'Comisiones', 'Cómo va cada comisión'],
  eventos: ['estrella', 'Eventos de hoy', 'Avanza cada evento con un botón'], invitados: ['persona', 'Invitados', 'Quién llegó y dónde se sienta'],
  asientos: ['asiento', 'Asientos', 'Plano de asientos de cada evento'], cobertura: ['escudo', 'Cobertura', 'Quién cubre cada punto y cuándo'],
  rondas: ['ruta', 'Rondas', 'Recorridos de seguridad'], atenciones: ['reporte', 'Expedientes', 'Todas las atenciones y sus expedientes'],
  objetos: ['bolso', 'Objetos perdidos', 'Lo encontrado y lo que se busca'], programa: ['calendario', 'Programa', 'Qué pasa hoy y a qué hora'],
  delegados: ['qr', 'Delegados', 'Acreditación de delegados'], mapa: ['mapa', 'Mapa y rutas', 'Cómo llegar a cada salón'],
  ubicacion: ['pin', 'Equipo en vivo', 'Dónde está el equipo'], seguridad: ['alerta', 'Seguridad', 'Código del evento y protocolo'],
  traslado: ['grupo', 'Regionales', 'Llegó, en camino o en espera'], incidencias: ['aviso', 'Reportar algo', 'Una incidencia, en un minuto'],
  bitacora: ['libro', 'Bitácora', 'Lo importante del día'], reportes: ['reporte', 'Reportes', 'Todo lo que pasó, día por día'], listas: ['check', 'Mis listas', 'Lo que te toca ahora'],
  sesion: ['reloj', 'Durante la sesión', 'Sesión y transiciones'], 'mi-comision': ['grupo', 'Mi comisión', 'La ficha de tu comisión'],
  empieza: ['persona', 'Mi rol', 'Qué hace un asistente'], bolsillo: ['tarjeta', 'Guía de bolsillo', 'Contactos y respuestas rápidas'],
  cumplimiento: ['grafico', 'Cumplimiento', 'Avance de las comisiones'], casos: ['corazon', 'Casos y triaje', 'Quién necesita ayuda y qué tan grave es'],
  protocolos: ['libro', 'Protocolos', 'Qué hacer en cada caso'], punto: ['cruz', 'Punto de bienestar', 'Dónde está y qué tiene'],
};
// lo que va en la barra de abajo (además de Inicio, Mapa y Comunicados)
const PRINCIPAL = { asistencia: 'listas', acreditacion: 'delegados', seguridad: 'cobertura', traslado: 'cobertura', bienestar: 'casos', eventos: 'eventos', coordinacion: SISTEMA === 'asistencia' ? 'comisiones-vivo' : 'datos' };
const principalDe = u => veSubdireccion() ? 'subdireccion' : PRINCIPAL[u.rol];
let seccionActual = 'inicio';
// Saludo del inicio después de entrar: quién eres, qué te toca y una sola acción principal. Reemplaza al título grande,
// los contadores, la tarjeta «Hola» y la ventana de permisos (que tapaba la pantalla al entrar).
function pintarSaludo() {
  const u = estado.usuario; if (!u || !$('#inicio')) return;
  let c = $('#saludo');
  if (!c) { c = document.createElement('div'); c.id = 'saludo'; c.className = 'saludo'; $('#inicio .hero').after(c); }
  const [eq, color] = ROLES[u.rol], { dia, min } = partesDR(ahoraEvento()), dias = ['2026-11-14', '2026-11-15', '2026-11-16'];
  const cargo = u.admin ? 'Administración' : SISTEMA === 'coordinacion' ? 'Secretaría General' : esVol() ? 'Voluntario' : cargoDe(u) || 'Coordinación';
  const faltan = Math.ceil((Date.parse('2026-11-14T00:00:00-04:00') - ahoraEvento()) / 864e5);
  const cuando = dias.includes(dia) ? `Hoy · día ${dias.indexOf(dia) + 1} de 3` : dia < dias[0] ? `Faltan ${faltan} ${faltan === 1 ? 'día' : 'días'} · 14 nov` : 'El evento terminó';
  const hola = min < 12 * 60 ? 'Buenos días' : min < 19 * 60 ? 'Buenas tardes' : 'Buenas noches';
  const p = principalDe(u), ids = seccionesDe().map(s => s.id);
  const verUbic = ubicacionDisponible() && !compartiendo(), verAlertas = !alertasOn();
  let hoy = ''; try { hoy = hoyDR(); } catch {}
  const perm = (verUbic || verAlertas) && leer('permisosDia', '') !== hoy;
  c.style.setProperty('--c', color);
  c.innerHTML = `<div class="saludo-top"><span class="chip">${eq} · ${cargo}</span><span class="saludo-dia">${cuando}</span></div>
    <h2>${hola}, <span>${esc(u.nombre.split(' ')[0])}</span></h2>
    <p>${descRol(u) || ''}</p>
    <div class="saludo-acc">${p && ids.includes(p) ? `<button type="button" class="boton" data-ir="${p}">${SECCION[p][1]} ${ico('flecha', 18)}</button>` : ''}${ids.includes('chat') ? `<button type="button" class="boton sec" data-ir="chat">${ico(SECCION.chat[0], 18)} Chat</button>` : ''}</div>
    ${perm ? `<div class="saludo-perm"><div><b>Prepara tu turno</b><small>Para que los SOS suenen en tu teléfono${verUbic ? ' y el equipo te encuentre' : ''}.</small></div>
      <div class="saludo-perm-b">${verAlertas ? '<button type="button" class="mini on" data-perm="alertas">Activar alertas</button>' : ''}${verUbic ? '<button type="button" class="mini" data-perm="ubic">Compartir ubicación</button>' : ''}</div>
      <button type="button" class="saludo-x" data-perm="cerrar" aria-label="Ahora no">×</button></div>` : ''}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('#saludo [data-perm], #accesos .accesos-mas'); if (!b) return;
  if (b.matches('.accesos-mas')) { const c = $('#accesos'), on = c.classList.toggle('todas'); b.setAttribute('aria-expanded', on); b.textContent = on ? 'Ver menos' : `Ver todas las secciones (${c.querySelectorAll('.acceso').length})`; return; }
  const k = b.dataset.perm;
  if (k === 'alertas') activarAlertas();
  else if (k === 'ubic') empezarCompartir('cierre');
  else if (k === 'cerrar') { try { guardar('permisosDia', hoyDR()); } catch {} }
  setTimeout(pintarSaludo, k === 'cerrar' ? 0 : 600);
});
// Direcciones limpias: …/coordinacion/mapa en vez de index.html#mapa (el archivo suelto, sin servidor, sigue con #mapa)
function baseRuta() { return (location.pathname.match(new RegExp(`^(.*/${SISTEMA}/)`)) || [])[1] || ''; }
function urlSeccion(id) {
  const s = id && id !== 'inicio' ? id : '', b = baseRuta();
  return b ? b + s + location.search : location.pathname + location.search + (s ? '#' + s : '');
}
function seccionDeUrl() {
  const h = location.hash.slice(1).split('/')[0];
  if (h && !h.startsWith('entrar=')) return h;
  const b = baseRuta(); return b ? location.pathname.slice(b.length).split('/')[0] : '';
}
const seccionesDe = () => $$('main > section').filter(s => !s.classList.contains('sin-permiso') && SECCION[s.id] && s.id !== 'mejoras');
function abrirSeccion(id, { historia = true, arriba = true } = {}) {
  if (!document.body.classList.contains('app')) return;
  const s = document.getElementById(id);
  if (!s || s.tagName !== 'SECTION' || s.classList.contains('sin-permiso')) id = 'inicio';
  seccionActual = id;
  $$('main > section').forEach(x => x.classList.toggle('activa', x.id === id));
  $$('#rail a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
  if (window.railALaVista) railALaVista();
  $$('.barra-abajo button').forEach(b => b.classList.toggle('on', b.dataset.ir === id));
  const url = urlSeccion(id), ahora = location.pathname + location.search + location.hash;
  if (url !== ahora && !location.hash.startsWith('#entrar=')) history[historia ? 'pushState' : 'replaceState']({ seccion: id }, '', url);
  if (arriba) scrollTo({ top: 0, behavior: 'instant' });
  if (id === 'inicio') { pintarTablero(); if (window.MOMENTO_LISTO) { ubicarMomento(); pintarMomento(); } }
  if (id === 'traslado' && window.REGIONALES_LISTO) pintarRegionales();
  if (id === 'rendimiento' && window.RENDIMIENTO_LISTO) cargarRendimiento();
  if (id === 'reportes' && window.REPORTES_DIA_LISTO) pintarReportes();
  if (id === 'subdireccion' && window.SUBDIR_LISTO) cargarSubdireccion();
  if (window.CHAT_LISTO) pintarBannerChat();
  if (window.CHAT_LISTO) { if (id === 'chat') { ajustarChatAlto(); cargarChat(true); const l = chat.msgs[chat.canal]; if (l && l.length) marcarVistoChat(chat.canal, l[l.length - 1].id); } pintarInsigniasChat(); }
  // instalada como app la ventana ya dice «MINUME XVII · equipo»: el título solo dice la sección
  document.title = matchMedia('(display-mode: standalone)').matches ? (SECCION[id] ? SECCION[id][1] : 'Inicio') : `${SECCION[id] && id !== 'inicio' ? SECCION[id][1] + ' · ' : ''}${SIS.nombre} · MINUME XVII`;
}
function modoApp() {
  const u = estado.usuario; document.body.classList.toggle('app', !!u); if (!u) return;
  SECCION.subdireccion[1] = cargoDe(u) === 'Subdirección' ? 'Mi subdirección' : 'Mi equipo';
  const ids = seccionesDe().map(s => s.id).filter(id => id !== 'inicio');
  ids.sort((a, b) => (b === principalDe(u)) - (a === principalDe(u)));   // lo principal del equipo, primero
  // atajos del inicio: lo principal y el chat ya están en el saludo; se ven 4 y el resto con «Ver todas»
  pintarSaludo();
  let caja = $('#accesos');
  if (!caja) { caja = document.createElement('div'); caja.id = 'accesos'; caja.className = 'accesos'; $('#saludo').after(caja); }
  const atajos = ids.filter(id => id !== principalDe(u) && id !== 'chat'), extra = atajos.length - 4;
  caja.classList.remove('todas');
  caja.innerHTML = `<h2 class="accesos-t">Atajos</h2><div class="accesos-g">${atajos.map((id, k) => { const [i, n, d] = SECCION[id]; return `<button type="button" class="acceso${k >= 4 ? ' extra' : ''}" data-ir="${id}" title="${d}"><span class="acceso-ic">${ico(i)}</span><b>${n}</b></button>`; }).join('')}</div>
    ${extra > 0 ? `<button type="button" class="accesos-mas" aria-expanded="false">Ver todas las secciones (${atajos.length})</button>` : ''}`;
  // barra de abajo: Inicio · lo principal del equipo · Chat · Mapa · Comunicados
  const abajo = ['inicio', principalDe(u), 'chat', 'mapa', 'comunicados'].filter((id, k, l) => id && l.indexOf(id) === k && (id === 'inicio' || ids.includes(id)));
  const corto = { chat: 'Chat', inicio: 'Inicio', mapa: 'Mapa', comunicados: 'Avisos', 'comisiones-vivo': 'Comisiones', datos: 'Datos', eventos: 'Eventos', listas: 'Mis listas', casos: 'Casos', cobertura: 'Cobertura', subdireccion: 'Mi equipo', delegados: 'Delegados', invitados: 'Invitados' };
  $('#barraAbajo').style.gridTemplateColumns = `repeat(${abajo.length}, minmax(0, 1fr))`;
  $('#barraAbajo').innerHTML = abajo.map(id => `<button type="button" data-ir="${id}">${ico(SECCION[id][0], 22)}<span>${corto[id] || SECCION[id][1]}</span></button>`).join('');
  // menú de secciones (arriba en tableta, a la izquierda en PC): el mismo ícono y nombre que los botones del inicio
  $$('#rail a').forEach(a => { const id = a.getAttribute('href').slice(1), s = SECCION[id]; if (!s) return; const ins = a.querySelector('.insignia'); a.innerHTML = `${ico(s[0], 18)}<span>${s[1]}</span>`; a.title = s[2]; if (ins) a.append(ins); });
  // «Volver» arriba de cada sección
  for (const s of seccionesDe()) if (s.id !== 'inicio' && !s.querySelector(':scope > .volver')) s.insertAdjacentHTML('afterbegin', `<button type="button" class="volver" data-ir="inicio">Volver al inicio</button>`);
  if (window.CHAT_LISTO) pintarChat();
  const h = seccionDeUrl();
  abrirSeccion(SECCION[h] && ids.includes(h) ? h : 'inicio', { historia: false });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ir]'); if (b && document.body.classList.contains('app') && b.closest('.accesos, .barra-abajo, .volver, main')) {
    if (b.matches('.acceso, .barra-abajo button, .volver')) { e.preventDefault(); if (b.matches('.barra-abajo button')) vibrar(8); abrirSeccion(b.dataset.ir); }
  }
});
addEventListener('popstate', () => abrirSeccion(seccionDeUrl() || 'inicio', { historia: false }));
addEventListener('hashchange', () => { const id = location.hash.slice(1).split('/')[0]; if (SECCION[id]) abrirSeccion(id, { historia: false }); });
// Lo que antes «bajaba» a una sección (enlaces, avisos, alarmas) ahora la abre
const scrollOriginal = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (...a) {
  const s = this.closest && this.closest('main > section');
  if (document.body.classList.contains('app') && s && !s.classList.contains('activa')) abrirSeccion(s.id, { arriba: this === s });
  return scrollOriginal.apply(this, a);
};
// ---------- Menú de secciones de arriba: flechas, rueda del ratón y arrastrar para desplazarse ----------
(() => {
  const rail = $('#rail'); if (!rail) return;
  const caja = document.createElement('div'); caja.className = 'rail-caja'; rail.before(caja); caja.append(rail);
  const flecha = (lado, d) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rail-flecha ' + lado; b.setAttribute('aria-label', lado === 'izq' ? 'Ver secciones anteriores' : 'Ver más secciones');
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
    b.onclick = () => rail.scrollBy({ left: (lado === 'izq' ? -1 : 1) * rail.clientWidth * .7 }); caja.append(b); };
  flecha('izq', 'M15 5l-7 7 7 7'); flecha('der', 'M9 5l7 7-7 7');
  const revisar = () => { caja.classList.toggle('izq', rail.scrollLeft > 4); caja.classList.toggle('der', rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4); };
  rail.addEventListener('scroll', revisar, { passive: true }); addEventListener('resize', revisar); new ResizeObserver(revisar).observe(rail); revisar();
  // la rueda del ratón mueve el menú de lado
  rail.addEventListener('wheel', e => { if (rail.scrollWidth <= rail.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; e.preventDefault(); rail.style.scrollBehavior = 'auto'; rail.scrollLeft += e.deltaY; rail.style.scrollBehavior = ''; }, { passive: false });
  // arrastrar con el ratón (sin abrir la sección si fue un arrastre)
  let x0 = null, s0 = 0, movio = false;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; x0 = e.clientX; s0 = rail.scrollLeft; movio = false; });
  addEventListener('pointermove', e => { if (x0 == null) return; const d = e.clientX - x0; if (Math.abs(d) > 5) { movio = true; rail.classList.add('arrastrando'); rail.scrollLeft = s0 - d; } });
  addEventListener('pointerup', () => { x0 = null; setTimeout(() => rail.classList.remove('arrastrando'), 0); });
  rail.addEventListener('click', e => { if (movio) { e.preventDefault(); e.stopPropagation(); movio = false; } }, true);
  // la sección abierta siempre queda a la vista en el menú
  window.railALaVista = () => { const a = rail.querySelector('a.on'); if (a && a.offsetParent) rail.scrollTo({ left: a.offsetLeft - rail.clientWidth / 2 + a.offsetWidth / 2 }); };
})();
// En PC el menú va fijo a la izquierda, debajo de la barra de arriba: aquí se mide dónde termina esa barra
(() => {
  const fila = $('.cab-fila'); if (!fila) return; let pend = false;
  const medir = () => { pend = false; document.documentElement.style.setProperty('--cab-h', Math.max(0, Math.round(fila.getBoundingClientRect().bottom)) + 'px'); };
  const pedir = () => { if (!pend) { pend = true; requestAnimationFrame(medir); } };
  addEventListener('scroll', pedir, { passive: true }); addEventListener('resize', pedir); new ResizeObserver(pedir).observe(fila); medir();
})();
// listo: desde aquí el inicio de sesión ya arma la navegación
window.NAV_LISTA = true;
modoApp();
// En el teléfono las explicaciones se ven en dos líneas; al tocarlas se abren completas
document.addEventListener('click', e => { const l = e.target.closest('main > section > .lead'); if (l && matchMedia('(max-width: 640px)').matches) l.classList.toggle('abierto'); });
