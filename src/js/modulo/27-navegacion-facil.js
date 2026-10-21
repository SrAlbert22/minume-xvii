// ---------- Navegación fácil: botones grandes y una sola pantalla a la vez ----------
// En lugar de una página larga, cada equipo ve su inicio con «¿Qué quieres hacer?» y abre una sección a la vez.
// El botón «Volver» y el botón de atrás del teléfono regresan al inicio.
const ICO = {
  casa: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', megafono: 'M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2zM17 8a5 5 0 0 1 0 8',
  lista: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', estrella: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', asiento: 'M6 11V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 11h16v4H4zM6 15v6M18 15v6',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', ruta: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  corazon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', bolso: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  calendario: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2', mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', alerta: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  caminar: 'M13 4a1.5 1.5 0 1 0 0 .01M10 21l2-6 3 3v3M8 12l2-4 4 1 2 4M10 8l-2 8', aviso: 'M12 8v5M12 16h.01M4 20h16L12 4z',
  bus: 'M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11M5 11h14M5 17h14v2H5zM8 19v2M16 19v2M8 14h.01M16 14h.01',
  libro: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16', check: 'M4 12l5 5L20 6', reloj: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  grupo: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6M3 20a6 6 0 0 1 12 0M15 14a6 6 0 0 1 6 6', tarjeta: 'M3 6h18v12H3zM3 10h18M7 15h4',
  grafico: 'M4 20V10M10 20V4M16 20v-8M22 20H2', cruz: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z', ajustes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M8 10v4M16 16v4',
};
const ico = (k, t = 26) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICO[k] || ICO.estrella}"/></svg>`;
// sección: [ícono, nombre corto, para qué sirve, en una línea]
const SECCION = {
  inicio: ['casa', 'Inicio', 'Tu tablero'], datos: ['ajustes', 'Datos del evento', 'Horarios, salones, staff y códigos'],
  comunicados: ['megafono', 'Comunicados', 'Avisos para todo el staff'], 'comisiones-vivo': ['lista', 'Comisiones', 'Cómo va cada comisión'],
  eventos: ['estrella', 'Eventos de hoy', 'Avanza cada evento con un botón'], invitados: ['persona', 'Invitados', 'Quién llegó y dónde se sienta'],
  asientos: ['asiento', 'Asientos', 'Plano de asientos de cada evento'], cobertura: ['escudo', 'Cobertura', 'Quién cubre cada punto y cuándo'],
  rondas: ['ruta', 'Rondas', 'Recorridos de seguridad'], atenciones: ['corazon', 'Atenciones', 'Registro de atenciones'],
  objetos: ['bolso', 'Objetos perdidos', 'Lo encontrado y lo que se busca'], programa: ['calendario', 'Programa', 'Qué pasa hoy y a qué hora'],
  delegados: ['qr', 'Delegados', 'Acreditación de delegados'], mapa: ['mapa', 'Mapa y rutas', 'Cómo llegar a cada salón'],
  ubicacion: ['pin', 'Equipo en vivo', 'Dónde está el equipo'], seguridad: ['alerta', 'Seguridad', 'Código del evento y protocolo'],
  traslado: ['bus', 'Autobuses', 'Participantes a su hotel y salidas a pie'], incidencias: ['aviso', 'Reportar algo', 'Una incidencia, en un minuto'],
  bitacora: ['libro', 'Bitácora', 'Lo importante del día'], listas: ['check', 'Mis listas', 'Lo que te toca ahora'],
  sesion: ['reloj', 'Durante la sesión', 'Sesión y transiciones'], 'mi-comision': ['grupo', 'Mi comisión', 'La ficha de tu comisión'],
  empieza: ['persona', 'Mi rol', 'Qué hace un asistente'], bolsillo: ['tarjeta', 'Guía de bolsillo', 'Contactos y respuestas rápidas'],
  cumplimiento: ['grafico', 'Cumplimiento', 'Avance de las comisiones'], casos: ['corazon', 'Casos', 'Casos de bienestar en vivo'],
  protocolos: ['libro', 'Protocolos', 'Qué hacer en cada caso'], punto: ['cruz', 'Punto de bienestar', 'Dónde está y qué tiene'],
};
// lo que va en la barra de abajo (además de Inicio, Mapa y Comunicados)
const PRINCIPAL = { asistencia: 'listas', acreditacion: 'delegados', seguridad: 'cobertura', traslado: 'traslado', bienestar: 'casos', eventos: 'eventos', coordinacion: SISTEMA === 'asistencia' ? 'comisiones-vivo' : 'datos' };
let seccionActual = 'inicio';
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
  $$('.barra-abajo button').forEach(b => b.classList.toggle('on', b.dataset.ir === id));
  const url = urlSeccion(id), ahora = location.pathname + location.search + location.hash;
  if (url !== ahora && !location.hash.startsWith('#entrar=')) history[historia ? 'pushState' : 'replaceState']({ seccion: id }, '', url);
  if (arriba) scrollTo({ top: 0, behavior: 'instant' });
  if (id === 'traslado' && window.BUSES_LISTO) pintarBuses();
  document.title = `${SECCION[id] && id !== 'inicio' ? SECCION[id][1] + ' · ' : ''}${SIS.nombre} · MINUME XVII`;
}
function modoApp() {
  const u = estado.usuario; document.body.classList.toggle('app', !!u); if (!u) return;
  const ids = seccionesDe().map(s => s.id).filter(id => id !== 'inicio');
  ids.sort((a, b) => (b === PRINCIPAL[u.rol]) - (a === PRINCIPAL[u.rol]));   // lo principal del equipo, primero
  // botones grandes del inicio
  let caja = $('#accesos');
  if (!caja) { caja = document.createElement('div'); caja.id = 'accesos'; caja.className = 'accesos'; $('#inicio .hero').after(caja); }
  caja.innerHTML = `<h2 class="accesos-t">¿Qué quieres hacer?</h2><div class="accesos-g">${ids.map(id => { const [i, n, d] = SECCION[id]; return `<button type="button" class="acceso${id === PRINCIPAL[u.rol] ? ' principal' : ''}" data-ir="${id}"><span class="acceso-ic">${ico(i)}</span><b>${n}</b><small>${d}</small></button>`; }).join('')}</div>`;
  // barra de abajo: Inicio · lo principal del equipo · Mapa · Comunicados
  const abajo = ['inicio', PRINCIPAL[u.rol], 'mapa', 'comunicados'].filter((id, k, l) => id && l.indexOf(id) === k && (id === 'inicio' || ids.includes(id)));
  const corto = { inicio: 'Inicio', mapa: 'Mapa', comunicados: 'Avisos', 'comisiones-vivo': 'Comisiones', datos: 'Datos', eventos: 'Eventos', listas: 'Mis listas' };
  $('#barraAbajo').innerHTML = abajo.map(id => `<button type="button" data-ir="${id}">${ico(SECCION[id][0], 22)}<span>${corto[id] || SECCION[id][1]}</span></button>`).join('');
  // «Volver» arriba de cada sección
  for (const s of seccionesDe()) if (s.id !== 'inicio' && !s.querySelector(':scope > .volver')) s.insertAdjacentHTML('afterbegin', `<button type="button" class="volver" data-ir="inicio">← Volver al inicio</button>`);
  const h = seccionDeUrl();
  abrirSeccion(SECCION[h] && ids.includes(h) ? h : 'inicio', { historia: false });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ir]'); if (b && document.body.classList.contains('app') && b.closest('.accesos, .barra-abajo, .volver, main')) {
    if (b.matches('.acceso, .barra-abajo button, .volver')) { e.preventDefault(); abrirSeccion(b.dataset.ir); }
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
// listo: desde aquí el inicio de sesión ya arma la navegación
window.NAV_LISTA = true;
modoApp();
