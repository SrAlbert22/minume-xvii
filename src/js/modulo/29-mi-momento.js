// MINUME XVII · Asistente: «Tu momento ahora» · Albert Silvestre
// ---------- Asistente: «Tu momento ahora» ----------
// El manual divide el trabajo en 5 momentos (Antes, Abre, Sesión, Mueve, Cierra). Esta tarjeta, arriba del inicio,
// adivina en cuál estás por la fecha, la hora y tus turnos, y te pone a la mano su checklist y lo que toca hacer.
// Las marcas son las mismas de «Mis listas»; las de cada día (todo menos Antes) empiezan en blanco al día siguiente.
const MOMENTOS = ['pre', 'montaje', 'sesiones', 'transiciones', 'cierre'];
const MM_SVG = {
  ficha: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5', rol: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', llegue: 'M4 12l5 5L20 6',
  reporte: 'M12 3l10 18H2zM12 10v5M12 18h.01', ruta: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bitacora: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M9 8h6M9 12h6', programa: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
};
const mmIco = k => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${MM_SVG[k]}"/></svg>`;
let mmVer = null;   // el momento que la persona tocó para mirar; null = el de ahora

// Las listas de cada día empiezan en blanco; lo de días anteriores se guarda aparte
(() => {
  const hoy = hoyDR(), dia = leer('marcasDia', null);
  if (dia === hoy) return;
  if (dia) { const hist = leer('marcasHist', {}); hist[dia] = estado.marcas; guardar('marcasHist', hist); }
  if (dia) { estado.marcas = { pre: estado.marcas.pre || [] }; guardar('marcas', estado.marcas); }
  guardar('marcasDia', hoy);
})();

function misTurnosHoy() {
  const u = estado.usuario;
  return (u && TURNOS_ASIS[u.nombre]) || [{ de: '8:00', a: '13:00' }, { de: '14:00', a: '18:00' }];
}
// En qué momento del manual está la persona ahora mismo
function momentoManual() {
  const { dia, min } = partesDR(ahoraEvento());
  if (dia < '2026-11-14' || (dia === '2026-11-14' && min < 15 * 60)) return 'pre';
  if (dia === '2026-11-14') return 'montaje';
  if (dia > '2026-11-16') return 'cierre';
  const tur = misTurnosHoy().map(t => [minutos(t.de), minutos(t.a)]).sort((a, b) => a[0] - b[0]);
  const primero = tur[0][0], ultimo = tur[tur.length - 1][1];
  if (min < primero) return 'montaje';
  if (min >= ultimo - 20) return 'cierre';
  const t = tur.find(([a, b]) => a <= min && min < b);
  if (!t) return 'transiciones';                                   // entre un turno y otro
  return t[1] - min <= 10 && t !== tur[tur.length - 1] ? 'transiciones' : 'sesiones';
}
// Lo que sigue en el programa de hoy (para «Mueve»)
function siguienteActividad() {
  const { dia, min } = partesDR(ahoraEvento());
  return (PROGRAMA[dia] || []).find(([de]) => minutos(de) > min) || null;
}

function accionesMomento(k) {
  const b = (acc, ic, txt, sec) => `<button class="boton${sec ? ' sec' : ''}" type="button" data-mm="${acc}">${mmIco(ic)}${txt}</button>`;
  const llego = leer('llegadas', {})[hoyDR()];
  return {
    pre: b('ficha', 'ficha', 'Llenar mi ficha de comisión') + b('rol', 'rol', 'Mi rol en 30 segundos', 1),
    montaje: (llego ? `<span class="mm-llegue">${mmIco('llegue')}Llegaste a las ${horaDR(llego)}</span>` : b('llegue', 'llegue', 'Ya llegué a mi salón')) + b('reporte', 'reporte', 'Reportar un faltante', 1) + b('ruta', 'ruta', 'Cómo llegar', 1),
    sesiones: b('reporte', 'reporte', 'Reportar algo') + b('bitacora', 'bitacora', 'Anotar en la bitácora', 1),
    transiciones: b('ruta', 'ruta', 'Cómo llegar') + b('programa', 'programa', 'Ver el programa', 1),
    cierre: b('bitacora', 'bitacora', 'Cerrar mi bitácora') + b('reporte', 'reporte', 'Reportar un pendiente', 1),
  }[k];
}

function pintarMomento() {
  const caja = $('#miMomento'); if (!caja) return;
  const u = estado.usuario, ver = !!u && u.rol === 'asistencia';
  caja.hidden = !ver; if (!ver || escribiendo(caja)) return;
  const ahora = momentoManual(), k = mmVer || ahora;
  if (!mmVer && estado.etapa !== ahora) { estado.etapa = ahora; guardar('etapa', ahora); }
  const l = LISTAS[k], m = estado.marcas[k] || [], listo = m.length === l.length;
  const sig = k === 'transiciones' ? siguienteActividad() : null;
  caja.innerHTML = `<div class="mm-cab"><div><small>${mmVer && mmVer !== ahora ? 'Estás mirando otro momento' : 'Tu momento ahora'}</small><b>${NOMBRE_ETAPA[k]}</b></div>
      ${mmVer && mmVer !== ahora ? `<button class="mini" type="button" data-mm="ahora">Volver a lo de ahora</button>` : `<span class="mm-reloj">${horaDR(ahoraMs())}</span>`}</div>
    <ol class="mm-pasos">${MOMENTOS.map(x => { const lx = LISTAS[x], mx = (estado.marcas[x] || []).length; return `<li><button type="button" data-mm-ver="${x}" class="${x === k ? 'on' : ''}${x === ahora ? ' ahora' : ''}${mx === lx.length ? ' hecho' : ''}" aria-label="${NOMBRE_ETAPA[x]}${x === ahora ? ' (ahora)' : ''}"><span>${CORTO[x]}</span></button></li>`; }).join('')}</ol>
    <p class="mm-que">${AHORA[k]}</p>
    ${sig ? `<div class="mm-sigue"><small>Lo que sigue</small><b>${sig[0]} · ${esc(sig[2])}</b><span>${esc(sig[3])}</span></div>` : ''}
    <div class="mm-lista"><div class="mm-lista-cab"><b>Checklist</b><span class="chip${listo ? ' verde' : ''}">${m.length} de ${l.length}</span></div>
      <div class="barra mm-barra"><i style="width:${m.length / l.length * 100}%"></i></div>
      ${l.map((t, i) => `<button type="button" class="mm-item${m.includes(i) ? ' ok' : ''}" data-mm-i="${i}" aria-pressed="${m.includes(i)}"><span class="caja"></span><span>${t}</span></button>`).join('')}</div>
    <div class="mm-acc">${accionesMomento(k)}</div>`;
}

$('#miMomento').addEventListener('click', e => {
  const v = e.target.closest('[data-mm-ver]');
  if (v) { mmVer = v.dataset.mmVer === momentoManual() ? null : v.dataset.mmVer; pintarMomento(); return; }
  const it = e.target.closest('[data-mm-i]');
  if (it) {
    const k = mmVer || momentoManual(), i = +it.dataset.mmI, m = estado.marcas[k] = estado.marcas[k] || [];
    m.includes(i) ? m.splice(m.indexOf(i), 1) : m.push(i);
    guardar('marcas', estado.marcas); vibrar(8); pintarMomento(); pintarListas(); pintarRanking(); pintarTablero();
    if (m.length === LISTAS[k].length) toast(`Checklist de «${CORTO[k]}» completo`);
    return;
  }
  const b = e.target.closest('[data-mm]'); if (!b) return;
  const a = b.dataset.mm;
  if (a === 'ahora') { mmVer = null; pintarMomento(); return; }
  if (a === 'ficha') return abrirSeccion('mi-comision');
  if (a === 'rol') return abrirSeccion('empieza');
  if (a === 'bitacora') return abrirSeccion('bitacora');
  if (a === 'programa') return abrirSeccion('programa');
  if (a === 'reporte') { abrirSeccion('incidencias'); setTimeout(() => { const t = $('#iTexto'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } }, 250); return; }
  if (a === 'ruta') { $('#mapa').scrollIntoView(); setTimeout(() => $('#rMiSalon') && $('#rMiSalon').click(), 400); return; }
  if (a === 'llegue') {
    const ll = leer('llegadas', {}), t = ahoraMs(); ll[hoyDR()] = t; guardar('llegadas', ll);
    const primero = Math.min(...misTurnosHoy().map(x => minutos(x.de))), dif = primero - partesDR(new Date(t)).min;
    registrar('🏁 Llegada al salón', `${miSalon() || 'Salón'} · ${dif >= 0 ? dif + ' min antes de su turno' : -dif + ' min tarde'}`);
    toast(dif >= 0 ? `Llegada anotada: ${dif} min antes de tu turno` : `Llegada anotada: ${-dif} min después del inicio de tu turno`);
    pintarMomento();
  }
});
// en la PC va arriba de los botones del inicio; en el teléfono, el orden lo pone la hoja de estilos
function ubicarMomento() { const c = $('#miMomento'), a = $('#accesos'); if (c && a && c.nextElementSibling !== a) a.before(c); }
ubicarMomento(); pintarMomento();
window.MOMENTO_LISTO = true;
addEventListener('storage', e => { if (e.key && /\.marcas$/.test(e.key)) pintarMomento(); });
setInterval(() => { if (seVe($('#miMomento'))) pintarMomento(); }, 30000);
