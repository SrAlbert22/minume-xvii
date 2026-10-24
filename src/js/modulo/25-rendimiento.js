// ---------- Rendimiento del staff ----------
// Cada página manda un «latido» por minuto mientras está abierta y a la vista (minume_latido): así Coordinación
// sabe quién está conectado y cuánto tiempo activo lleva. Lo que cada persona hace sale de lo que ya marca en el sistema.
function datosLatido() {
  const d = { sec: typeof seccionActual === 'string' ? seccionActual : '' };
  if (estado.usuario && estado.usuario.rol === 'asistencia') {
    d.listas = Object.fromEntries(Object.entries(LISTAS).map(([k, l]) => [k, [Math.min((estado.marcas[k] || []).length, l.length), l.length]]));
    d.confirma = [Math.min((estado.marcas.confirma || []).length, CONFIRMA.length), CONFIRMA.length];
  }
  d.bitacora = estado.bitacora.length;
  return d;
}
let latidoT = 0;
function latido(ya) {
  if (!estado.usuario || !window.MINUME_RPC || document.hidden || navigator.onLine === false) return;
  if (!ya && Date.now() - latidoT < 55000) return;
  latidoT = Date.now();
  window.MINUME_RPC('minume_latido', { p_datos: datosLatido() }).catch(() => {});
}
setInterval(() => latido(), 15000);
document.addEventListener('visibilitychange', () => latido());

// ---------- Pantalla de Coordinación ----------
const EQUIPOS_RD = [['todos', 'Todos'], ['asistencia', 'Asistencia'], ['seguridad', 'Seguridad y Traslado'], ['bienestar', 'Bienestar'], ['eventos', 'Eventos'], ['coordinacion', 'Coordinación']];
const rend = { dia: null, equipo: 'todos', filas: [], cargado: null, abierto: null, error: '' };
const normNombre = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const durTxt = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
const segTxt = s => s == null ? '—' : s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`;
const puedeRendimiento = () => !!estado.usuario && SISTEMA === 'coordinacion' && estado.usuario.rol === 'coordinacion';

// Lo que hizo cada persona ese día, sacado de lo que ya se guarda con su nombre y la hora
function accionesDelDia(dia) {
  const A = {}, add = (nombre, tipo, t, extra = {}) => {
    if (!nombre || !t || diaDR(t) !== dia) return;
    const k = normNombre(nombre); (A[k] = A[k] || []).push({ tipo, t, ...extra });
  };
  Object.entries(leerComp('comisiones', {})).forEach(([c, x]) => add(x.por, `Reportó el estado de ${c}`, x.t));
  leerComp('rondas', []).forEach(x => { if (x.fin) add(x.por, `Completó la ronda ${x.ruta}`, x.fin); });
  leerComp('objetos', []).forEach(x => add(x.por, x.tipo === 'buscado' ? 'Registró un objeto buscado' : 'Registró un objeto encontrado', x.t));
  leerComp('atenciones', []).forEach(x => add(x.por, 'Registró una atención de bienestar', x.llega));
  const evs = Object.fromEntries(EV_LISTA.map(e => [e.id, e.n]));
  Object.entries(leerComp('eventos', {})).forEach(([id, x]) => add(x.por, `Avanzó el evento ${evs[id] || ''}`.trim(), x.t));
  const invs = Object.fromEntries(INV_LISTA.map(g => [g.id, g.n]));
  Object.entries(leerComp('invitados', {})).forEach(([id, x]) => { if (x.est) add(x.por, `Marcó a ${invs[id] || 'un invitado'}`, x.t); });
  const asientos = {}; Object.values(leerComp('asientos', {})).forEach(x => { if (x.por && x.t && diaDR(x.t) === dia) asientos[x.por] = (asientos[x.por] || 0) + 1; });
  Object.entries(asientos).forEach(([n, k]) => add(n, `Marcó ${k} ${k === 1 ? 'asiento' : 'asientos'}`, ahoraMs()));
  const pase = leerComp('regpase', {})[dia] || {};
  Object.entries(pase).forEach(([id, moms]) => Object.values(moms).forEach(s => { Object.values(s.m || {}).forEach(x => { if (x.t && x.por) add(x.por, `Pasó lista en la Regional ${id.slice(1)}`, x.t); }); if (s.ok && s.ok.t) add(s.ok.por, `Confirmó la Regional ${id.slice(1)}`, s.ok.t); }));
  leerAvisos().forEach(a => { if (a.quien && a.tCambio) add(a.quien.replace(/\s*\(.*$/, ''), `Atendió un aviso: ${a.tipo}`, a.tCambio, { resp: (a.tCambio - (a.t || a.tCambio)) / 1000 }); });
  leerComs().forEach(m => Object.values(m.leidos || {}).forEach(r => add(r.n, 'Leyó un comunicado', r.t, { com: m.id, resp: (r.t - m.t) / 1000 })));
  const c = leerComp('cobertura', null);
  if (c && c.dia === dia) for (const [k, min] of Object.entries(c.conf || {})) {
    const [slot, cod] = k.split('#'), [pid, ini] = slot.split('@'), tarde = min - +ini;
    add(cobNombre(cod), `Llegó a su puesto ${pid}${tarde > 0 ? ` (${tarde} min tarde)` : ''}`, new Date(`${dia}T00:00:00-04:00`).getTime() + min * 60000, { tarde });
  }
  return A;
}
function calcularRendimiento() {
  const dia = rend.dia, A = accionesDelDia(dia), coms = leerComs().filter(m => diaDR(m.t) === dia);
  const primeros = {}; rend.filas.forEach(p => { const f = normNombre(p.nombre).split(' ')[0]; primeros[f] = (primeros[f] || 0) + 1; });
  return rend.filas.map(p => {
    const k = normNombre(p.nombre), f = k.split(' ')[0];
    // las acciones se guardan con el nombre completo; los avisos y la cobertura a veces solo con el primer nombre
    const acc = [...(A[k] || []), ...(primeros[f] === 1 && f !== k ? A[f] || [] : [])].sort((x, y) => y.t - x.t);
    const tareasAcc = acc.filter(a => !a.com);
    let tareas;
    if (p.rol === 'asistencia' && p.datos && p.datos.listas) {
      const [h, t] = Object.values(p.datos.listas).reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
      tareas = t ? h / t : 0;
    } else tareas = Math.min(1, tareasAcc.length / 8);
    const paraMi = coms.filter(m => (m.para === 'todos' || m.para === p.sistema) && m.de !== p.nombre);
    const leidos = new Set(acc.filter(a => a.com).map(a => a.com)).size;
    const respCom = paraMi.length ? Math.min(1, leidos / paraMi.length) : 1;
    const urg = p.respuestaUrgente == null ? 1 : p.respuestaUrgente <= 120 ? 1 : p.respuestaUrgente <= 600 ? 0.6 : 0.3;
    const tardes = acc.filter(a => a.tarde > 10).length;
    const trabajo = p.minutos > 0 || !!p.primera || acc.length > 0 || p.chat > 0;   // sin ninguna actividad ese día no hay puntos «de regalo»
    const puntos = trabajo ? Math.max(0, Math.round(40 * Math.min(1, p.minutos / 240) + 35 * tareas + 15 * respCom + 10 * urg - 5 * tardes)) : 0;
    const ult = p.ultima ? Date.parse(p.ultima) : null, enLinea = ult && Date.now() - ult < 3 * 60000;
    return { ...p, acc, tareas, tareasAcc: tareasAcc.length, paraMi: paraMi.length, leidos, tardes, puntos, ult, enLinea, trabajo };
  });
}
async function cargarRendimiento() {
  if (!puedeRendimiento()) return;
  rend.error = '';
  try { rend.filas = await window.MINUME_RPC('minume_rendimiento', { p_dia: rend.dia }); rend.cargado = Date.now(); }
  catch (e) { rend.error = navigator.onLine === false ? 'Sin internet: el rendimiento se ve cuando vuelva la señal.' : (e.message || 'No se pudo cargar'); }
  pintarRendimiento();
}
function pintarRendimiento() {
  if (!$('#rdLista') || !puedeRendimiento()) return;
  if (rend.error) { $('#rdLista').innerHTML = `<p class="cob-sub">${esc(rend.error)}</p>`; return; }
  const todos = calcularRendimiento(), evals = leerComp('evaluaciones', {}), q = normNombre($('#rdBuscar').value);
  const l = todos.filter(p => (rend.equipo === 'todos' || p.sistema === rend.equipo) && (!q || normNombre(p.nombre).includes(q)));
  const orden = $('#rdOrden').value;
  l.sort((a, b) => orden === 'nombre' ? a.nombre.localeCompare(b.nombre) : orden === 'menos' ? a.puntos - b.puntos : orden === 'activo' ? b.minutos - a.minutos : b.puntos - a.puntos);
  const vistos = l.filter(p => p.trabajo), urg = l.filter(p => p.respuestaUrgente != null);
  const cifra = (n, t, c = '') => `<div class="bus-cifra ${c}"><b>${n}</b><small>${t}</small></div>`;
  $('#rdCifras').innerHTML = cifra(l.filter(p => p.enLinea).length, 'conectados ahora', 'verde') + cifra(`${vistos.length}<span>/${l.length}</span>`, 'entraron ese día')
    + cifra(l.length - vistos.length, 'no han entrado', l.length - vistos.length ? 'rojo' : '')
    + cifra(l.length ? Math.round(l.reduce((a, p) => a + p.puntos, 0) / l.length) : 0, 'puntuación media')
    + cifra(urg.length ? segTxt(urg.reduce((a, p) => a + p.respuestaUrgente, 0) / urg.length) : '—', 'respuesta a urgentes');
  $('#rdLista').innerHTML = l.length ? l.map(p => {
    const ev = evals[p.ref] || {}, color = colorPersona(p.nombre + '|' + p.sistema), abierto = rend.abierto === p.ref;
    const estadoTxt = p.enLinea ? '<span class="rd-estado on">En línea</span>' : p.ult ? `<span class="rd-estado">Activo ${haceMin(p.ult)}</span>` : p.trabajo ? '<span class="rd-estado">Trabajó (sin registro de tiempo)</span>' : '<span class="rd-estado off">No ha entrado ese día</span>';
    const listas = p.rol === 'asistencia' && p.datos && p.datos.listas ? `<div class="rd-listas">${Object.entries(p.datos.listas).map(([k, [h, t]]) => `<span title="${esc(NOMBRE_ETAPA[k] || k)}"><b>${esc(CORTO[k] || k)}</b><i style="--p:${t ? Math.round(h / t * 100) : 0}%"></i>${h}/${t}</span>`).join('')}</div>` : '';
    return `<article class="rd-persona${abierto ? ' abierto' : ''}" data-rd="${esc(p.ref)}">
      <button class="rd-cab" type="button" data-rdabrir="${esc(p.ref)}">
        <span class="chat-avatar" style="--p:${color}">${esc(inicialesChat(p.nombre))}</span>
        <span class="rd-nombre"><b>${esc(p.nombre)}</b><small>${esc(NOMBRE_SIS[p.sistema] || p.sistema)}${p.comision ? ' · ' + esc(p.comision) : ''} · ${estadoTxt}</small></span>
        <span class="rd-puntos" style="--v:${p.puntos}"><b>${p.puntos}</b><small>de 100</small></span>
      </button>
      <div class="rd-datos"><span>⏱ ${durTxt(p.minutos)} activo</span><span>✅ ${p.rol === 'asistencia' && p.datos && p.datos.listas ? Math.round(p.tareas * 100) + ' % de checklists' : p.tareasAcc + ' acciones'}</span><span>📨 ${p.leidos}/${p.paraMi} comunicados</span><span>🚨 urgentes: ${segTxt(p.respuestaUrgente)}</span><span>💬 ${p.chat} mensajes</span>${p.tardes ? `<span class="rd-mal">⏰ ${p.tardes} ${p.tardes === 1 ? 'llegada tarde' : 'llegadas tarde'}</span>` : ''}${ev.estrellas ? `<span>${'★'.repeat(ev.estrellas)}${'☆'.repeat(5 - ev.estrellas)}</span>` : ''}</div>
      ${abierto ? `<div class="rd-detalle">${listas}
        <div class="rd-hizo"><b>Lo que hizo ese día</b>${p.acc.length ? `<ul>${p.acc.slice(0, 25).map(a => `<li><span>${horaDR(a.t)}</span>${esc(a.tipo)}</li>`).join('')}</ul>` : '<p class="cob-sub">No hay acciones registradas con su nombre ese día.</p>'}
          <small>Entró: ${p.primera ? horaDR(Date.parse(p.primera)) : '—'} · Última actividad: ${p.ult ? horaDR(p.ult) : '—'}${p.datos && p.datos.sec ? ' · Estaba en: ' + esc((SECCION[p.datos.sec] || [, p.datos.sec])[1]) : ''}</small></div>
        <div class="rd-evaluar"><b>Evaluación de Coordinación</b>
          <div class="rd-estrellas" role="radiogroup" aria-label="Estrellas">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-estrella="${n}" aria-label="${n} estrellas" class="${n <= (ev.estrellas || 0) ? 'on' : ''}">★</button>`).join('')}</div>
          <textarea id="rdNota" rows="2" placeholder="Comentario (lo ve solo Coordinación general)">${esc(ev.nota || '')}</textarea>
          <div class="rd-ev-pie"><small>${ev.por ? `Evaluado por ${esc(ev.por)} · ${haceMin(ev.t)}` : 'Sin evaluar todavía'}</small><button class="boton" type="button" data-rdguardar="${esc(p.ref)}">Guardar evaluación</button></div>
        </div></div>` : ''}
    </article>`;
  }).join('') : '<p class="cob-sub">Nadie coincide con la búsqueda.</p>';
}
// para el PDF y el Excel
window.reporteRendimiento = () => {
  const l = calcularRendimiento().filter(p => rend.equipo === 'todos' || p.sistema === rend.equipo).sort((a, b) => b.puntos - a.puntos), evals = leerComp('evaluaciones', {});
  return {
    titulo: 'Rendimiento del staff', archivo: `rendimiento-${rend.dia}`,
    subtitulo: `${(DIAS_PROG.find(([d]) => d === rend.dia) || [, rend.dia])[1]} · ${EQUIPOS_RD.find(e => e[0] === rend.equipo)[1]} · 40 % tiempo activo, 35 % tareas, 15 % comunicados, 10 % urgentes`,
    resumen: [[l.filter(p => p.trabajo).length, 'trabajaron'], [l.filter(p => !p.trabajo).length, 'no entraron'], [l.length ? Math.round(l.reduce((a, p) => a + p.puntos, 0) / l.length) : 0, 'puntuación media']],
    columnas: [{ t: 'Persona', w: 24 }, { t: 'Equipo', w: 18 }, { t: 'Puntos', w: 9, pdf: 16 }, { t: 'Activo', w: 12, pdf: 20 }, { t: 'Tareas', w: 14, pdf: 22 }, { t: 'Comunicados', w: 12, pdf: 22 }, { t: 'Urgentes', w: 11, pdf: 18 }, { t: 'Tarde', w: 8, pdf: 14 }, { t: 'Evaluación', w: 30 }],
    filas: l.map(p => { const ev = evals[p.ref] || {}; return [p.nombre, NOMBRE_SIS[p.sistema] || p.sistema, p.puntos, durTxt(p.minutos), p.rol === 'asistencia' && p.datos && p.datos.listas ? Math.round(p.tareas * 100) + ' %' : p.tareasAcc + ' acciones', `${p.leidos}/${p.paraMi}`, segTxt(p.respuestaUrgente), p.tardes || '', ev.estrellas ? `${ev.estrellas}/5${ev.nota ? ' · ' + ev.nota : ''}` : '']; }),
  };
};

$('#rdDia').innerHTML = [[hoyDR(), 'Hoy'], ...DIAS_PROG.filter(([d]) => d !== hoyDR())].map(([d, t]) => `<option value="${d}">${t}</option>`).join('');
rend.dia = hoyDR();
$('#rdEquipos').innerHTML = EQUIPOS_RD.map(([k, t]) => `<button class="mini${k === 'todos' ? ' on' : ''}" type="button" data-rdeq="${k}">${t}</button>`).join('');
$('#rdEquipos').addEventListener('click', e => { const b = e.target.closest('[data-rdeq]'); if (!b) return; rend.equipo = b.dataset.rdeq; $$('#rdEquipos .mini').forEach(x => x.classList.toggle('on', x === b)); pintarRendimiento(); });
$('#rdDia').addEventListener('change', e => { rend.dia = e.target.value; cargarRendimiento(); });
$('#rdOrden').addEventListener('change', pintarRendimiento);
$('#rdBuscar').addEventListener('input', pintarRendimiento);
$('#rdActualizar').addEventListener('click', cargarRendimiento);
$('#rdLista').addEventListener('click', e => {
  const ab = e.target.closest('[data-rdabrir]');
  if (ab) { rend.abierto = rend.abierto === ab.dataset.rdabrir ? null : ab.dataset.rdabrir; pintarRendimiento(); return; }
  const es = e.target.closest('[data-estrella]');
  if (es) { const n = +es.dataset.estrella; es.parentElement.dataset.v = n; [...es.parentElement.querySelectorAll('[data-estrella]')].forEach(x => x.classList.toggle('on', +x.dataset.estrella <= n)); return; }
  const g = e.target.closest('[data-rdguardar]');
  if (g) {
    const caja = g.closest('.rd-evaluar'), n = +(caja.querySelector('.rd-estrellas').dataset.v || caja.querySelectorAll('[data-estrella].on').length);
    const ev = leerComp('evaluaciones', {}); ev[g.dataset.rdguardar] = { estrellas: n, nota: caja.querySelector('#rdNota').value.trim(), por: yoNombre(), t: ahoraMs() };
    guardarComp('evaluaciones', ev); toast('Evaluación guardada'); pintarRendimiento();
  }
});
addEventListener('storage', e => { if (e.key && /\.(comisiones|rondas|objetos|atenciones|eventos|invitados|buses|cobertura|comunicados|avisos|evaluaciones)$/.test(e.key) && !escribiendo($('#rendimiento'))) pintarRendimiento(); });
setInterval(() => { if (!document.hidden && $('#rendimiento') && $('#rendimiento').offsetParent && !escribiendo($('#rendimiento'))) cargarRendimiento(); }, 60000);
window.RENDIMIENTO_LISTO = true;
