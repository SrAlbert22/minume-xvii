// MINUME XVII · Reportes por día: todo lo que pasó, guardado día por día · Albert Silvestre
// ---------- Reportes por día: todo lo que pasó, guardado día por día ----------
// Pedido en la reunión del 21 de octubre: la bitácora no se reinicia, se archiva; un botón por cada día del evento
// y, al abrirlo, el reporte completo (cobertura, puntos, rondas, incidencias, regionales, objetos…) en PDF y Excel.
// Solo la dirección lo ve. Cada jefe ve lo de su equipo; Coordinación general ve todo.
// Fuentes: la bitácora compartida «diario.<sistema>.<día>» (cada registrar() la alimenta), el archivo diario de
// cobertura, las rondas, el pase de lista de las regionales, objetos, comunicados, avisos y el estado de comisiones y eventos.
// Como algunas claves se reinician cada día, la dirección guarda una copia del reporte en «archivo.reporte.<sistema>.<día>».
let repDia = null, repArea = 'todo', repPersona = '', repBuscar = '';
const NOMBRE_AREA_REP = { asistencia: 'Asistencia', seguridad: 'Seguridad y Traslado', bienestar: 'Bienestar', eventos: 'Eventos y Protocolo', coordinacion: 'Coordinación general', demo: 'Demo' };
const verTodoRep = () => SISTEMA === 'coordinacion' || SISTEMA === 'todo';
const sisRep = () => SISTEMA === 'todo' ? 'demo' : SISTEMA;
const deMiEquipo = s => verTodoRep() || s === SISTEMA;
const tituloDia = dia => { const d = DIAS_PROG.find(([x]) => x === dia); return d ? d[1] : new Date(dia + 'T12:00:00-04:00').toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Santo_Domingo' }); };
const fila = (t, sis, area, tipo, quien, que, est) => ({ t: +t || 0, sis, area, tipo, quien: quien || '', que: que || '', est: est || '' });
const desdeMin = (dia, min) => Date.parse(`${dia}T${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00-04:00`);

function diasConDatos() {
  const s = new Set(DIAS_PROG.map(([d]) => d));
  try { for (let i = 0; i < localStorage.length; i++) { const m = (localStorage.key(i) || '').match(/^minume\.compartido\.(?:diario\.[a-z]+|archivo\.(?:cobertura|reporte(?:\.[a-z]+)?))\.(\d{4}-\d{2}-\d{2})$/); if (m) s.add(m[1]); } } catch {}
  (estado.bitacora || []).forEach(b => b.dia && s.add(b.dia));
  s.add(hoyDR());
  return [...s].filter(d => d <= hoyDR() || DIAS_PROG.some(([x]) => x === d)).sort();
}

function filasDelDia(dia) {
  const out = [], hoy = dia === hoyDR();
  // 1) Bitácora compartida de cada equipo (y lo de este teléfono que no alcanzó a subir)
  const sistemas = verTodoRep() ? ['asistencia', 'seguridad', 'bienestar', 'eventos', 'coordinacion', 'demo'] : [sisRep()], vistos = new Set();
  const repetido = b => /Ronda|ronda|Llegó a su puesto/.test(b.tipo || '');   // eso sale abajo con más detalle
  for (const s of sistemas) for (const b of leerComp(`diario.${s}.${dia}`, [])) { if (vistos.has(b.id) || repetido(b)) continue; vistos.add(b.id); out.push(fila(b.t, s, NOMBRE_AREA_REP[s], b.tipo, b.por, [b.texto, b.accion].filter(Boolean).join(' · '), ETIQ[b.estatus || 'resuelto'])); }
  for (const b of estado.bitacora || []) if (b.dia === dia && b.id && !vistos.has(b.id) && !repetido(b)) out.push(fila(b.t, sisRep(), NOMBRE_AREA_REP[sisRep()], b.tipo, b.por || yoNombre(), [b.texto, b.accion].filter(Boolean).join(' · '), ETIQ[b.estatus || 'resuelto']));
  // 2) Cobertura: quién llegó a su puesto, quién no confirmó y los refuerzos
  if (deMiEquipo('seguridad')) {
    const c = hoy ? (cobEstado(), estado.cob) : leerComp(`archivo.cobertura.${dia}`, null), ahora = hoy ? cobAhora().min : 24 * 60;
    if (c) {
      for (const p of COB_PUNTOS) for (const t of p.turnos) for (const [cod, tarea] of t[3]) {
        const cf = (c.conf || {})[claveSlot(p, t) + '#' + cod];
        if (cf != null) out.push(fila(desdeMin(dia, cf), 'seguridad', 'Cobertura', 'Llegó a su puesto', cobNombre(cod), `${p.id} · ${p.n} · ${cobHora(t[0])} a ${cobHora(t[1])} · ${tarea}`, 'Llegó'));
        else if (ahora >= t[0] + 15) out.push(fila(desdeMin(dia, t[0]), 'seguridad', 'Cobertura', 'No confirmó su puesto', cobNombre(cod), `${p.id} · ${p.n} · ${cobHora(t[0])} a ${cobHora(t[1])} · ${tarea}`, 'Pendiente'));
      }
      for (const r of c.refs || []) out.push(fila(desdeMin(dia, r.desde), 'seguridad', 'Cobertura', 'Refuerzo', cobNombre(r.cod), `${r.punto} ${punto_nombre(r.punto)}${r.por ? ' · lo mandó ' + r.por : ''}`, 'Refuerzo'));
      for (const [cod, r] of Object.entries(c.radio || {})) if (r.walkie) out.push(fila(desdeMin(dia, r.walkie), 'seguridad', 'Cobertura', 'Walkie-talkie activo', cobNombre(cod), '', 'Resuelto'));
    }
    // 3) Rondas, con lo que vio cada quien y la comprobación por GPS
    for (const x of leerRondas().filter(x => diaDR(x.ini) === dia)) {
      const r = RUTAS.find(y => y.id === x.ruta); if (!r) continue;
      const marcas = Object.entries(x.marcas), gps = marcas.filter(([, m]) => m.gps && m.gps.ok).length, inc = marcas.filter(([, m]) => !m.ok);
      out.push(fila(x.ini, 'seguridad', 'Rondas', 'Ronda', x.por, `${r.n} · ${horaDR(x.ini)}${x.fin ? ' a ' + horaDR(x.fin) : ' (en curso)'} · ${marcas.length} de ${r.puntos.length} puntos${gps ? ` · ${gps} comprobados por GPS` : ''}${x.fin && marcas.length < r.puntos.length ? ` · saltó: ${r.puntos.filter((_, i) => !x.marcas[i]).join(', ')}` : ''}`, x.fin ? (marcas.length < r.puntos.length ? 'Pendiente' : 'Terminó') : 'En curso'));
      for (const [i, m] of inc) out.push(fila(m.t, 'seguridad', 'Rondas', 'Incidencia en ronda', x.por, `${r.n} · ${r.puntos[i]}: ${m.nota}${m.gps && m.gps.lugar ? ` · cerca de ${m.gps.lugar} (${m.gps.d} m)` : ''}`, 'Incidencia'));
    }
    // 4) Regionales: el pase de lista de la mañana y de la noche
    for (const [id, moms] of Object.entries(leerComp('regpase', {})[dia] || {})) {
      const reg = REGIONALES.find(r => r.id === id), lista = delegadosDe(id), nombre = reg ? reg.n : 'Regional ' + id.slice(1);
      for (const [mom, s] of Object.entries(moms)) {
        const abajo = lista.filter(d => (s.m && s.m[d.id] || {}).t), faltan = lista.filter(d => !(s.m && s.m[d.id] || {}).t);
        const ultima = Math.max(0, ...Object.values(s.m || {}).map(x => x.t || 0));
        if (s.ok && s.ok.t) out.push(fila(s.ok.t, 'seguridad', 'Regionales', `${nombre} · ${MOMENTOS_REG[mom] ? MOMENTOS_REG[mom][0].slice(3) : mom}`, s.ok.por, `${s.ok.n} de ${s.ok.total} delegados${faltan.length ? ' · faltaron ' + faltan.map(d => d.n).join(', ') : ''}`, s.ok.n < s.ok.total ? 'Pendiente' : 'Completa'));
        else if (abajo.length) out.push(fila(ultima, 'seguridad', 'Regionales', `${nombre} · ${MOMENTOS_REG[mom] ? MOMENTOS_REG[mom][0].slice(3) : mom}`, reg ? reg.enc : '', `${abajo.length} de ${lista.length} delegados · sin confirmar${faltan.length ? ' · faltan ' + faltan.map(d => d.n).join(', ') : ''}`, 'Pendiente'));
      }
    }
    // 5) Objetos perdidos
    const EST_OB = { guardado: 'Guardado', entregado: 'Entregado', buscando: 'La buscan', encontrado: 'Apareció' };
    for (const x of leerObjetos().filter(x => diaDR(x.t) === dia)) out.push(fila(x.t, 'seguridad', 'Objetos perdidos', x.tipo === 'buscado' ? 'Alguien perdió algo' : 'Encontraron algo', x.tipo === 'buscado' ? x.quien : x.por, `${x.que}${x.donde ? ' · ' + x.donde : ''}${x.guarda ? ' · guardado en ' + x.guarda : ''}${x.entregadoA ? ' · entregado a ' + x.entregadoA : ''}`, EST_OB[x.est] || x.est));
  }
  // 6) Avisos entre equipos (SOS, nivel 2 y 3)
  for (const a of leerAvisos().filter(a => diaDR(a.t) === dia && (verTodoRep() || a.para === SISTEMA || a.de === SISTEMA))) out.push(fila(a.t, a.para, NOMBRE_AREA_REP[a.para] || 'Avisos', `${a.tipo}`, a.por, [a.texto, a.salon ? 'Salón ' + a.salon : a.donde || a.sede, a.quien ? 'atendió ' + a.quien : ''].filter(Boolean).join(' · '), (EST_AVISO[a.estado] || EST_AVISO.nuevo)[0]));
  // 7) Comunicados
  for (const m of leerComs().filter(m => diaDR(m.t) === dia && comParaMi(m))) out.push(fila(m.t, m.para, 'Comunicados', `Comunicado · ${(COM_TIPO[m.tipo] || COM_TIPO.info)[0]}`, m.de, `Para ${COM_PARA[m.para] || m.para}: ${m.texto}`, 'Resuelto'));
  // 8) Comisiones (Asistencia) y eventos (Eventos y Protocolo): el último estado reportado ese día
  if (deMiEquipo('asistencia')) for (const [c, d] of Object.entries(leerComis())) if (d && d.t && diaDR(d.t) === dia) out.push(fila(d.t, 'asistencia', 'Comisiones', `${c}`, d.por, `${(EST_COM[d.est] || [d.est])[0]} · ${d.pres} de ${d.total} delegados${d.nota ? ' · ' + d.nota : ''}`, (EST_COM[d.est] || [d.est])[0]));
  if (deMiEquipo('eventos')) { const evs = Object.fromEntries(EV_LISTA.map(e => [e.id, e.n])); for (const [id, x] of Object.entries(leerEv())) if (x && x.t && diaDR(x.t) === dia) out.push(fila(x.t, 'eventos', 'Eventos', `${evs[id] || 'Evento'}`, x.por, x.problema ? `Problema: ${x.problema.tipo}${x.problema.nota ? ' · ' + x.problema.nota : ''}` : '', (EST_EV[x.est] || [x.est])[0])); }
  // 9) Bienestar: solo el resumen, sin nombres (es información de salud)
  if (deMiEquipo('bienestar')) { try { for (const x of leerAtenciones().filter(x => diaDR(x.llega) === dia)) out.push(fila(x.llega, 'bienestar', 'Bienestar', `Atención ${AT_AREA[x.area] ? AT_AREA[x.area][0].toLowerCase() : ''}`, x.por, `${x.persona}${x.com ? ' · ' + x.com : ''} · ${x.motivo}${x.sale ? ' · ' + x.salida : ' · en el punto'}`, x.sale ? 'Resuelto' : 'Pendiente')); } catch {} }
  // 10) Lo que quedó guardado en el archivo de ese día (avisos y comunicados viejos que ya salieron de la lista)
  const claves = verTodoRep() ? ['asistencia', 'seguridad', 'bienestar', 'eventos', 'coordinacion', 'demo'] : [sisRep()];
  const firma = f => [f.t, f.tipo, f.quien, f.que].join('|'), ya = new Set(out.map(firma));
  for (const s of claves) for (const f of (leerComp(`archivo.reporte.${s}.${dia}`, {}).filas || [])) if (deMiEquipo(f.sis) || verTodoRep()) { if (!ya.has(firma(f))) { ya.add(firma(f)); out.push(f); } }
  return out.sort((a, b) => a.t - b.t);
}

// La dirección deja guardado el reporte del día (por si las claves de ese día se reinician o se recortan)
let repGuardado = 0;
function archivarReporte() {
  if (!esDir() || !window.MINUME_PERSONAL && SISTEMA !== 'todo') return;   // solo con la base real
  if (Date.now() - repGuardado < 10 * 60000) return; repGuardado = Date.now();
  const dia = hoyDR(), filas = filasDelDia(dia).filter(f => f.area !== 'Bienestar').slice(-1500);
  guardarComp(`archivo.reporte.${sisRep()}.${dia}`, { t: ahoraMs(), por: yoNombre(), filas });
}

function filasVisibles() {
  const q = sinAcentos(repBuscar);
  return filasDelDia(repDia).filter(f => (repArea === 'todo' || f.area === repArea) && (!repPersona || mismoNombre(f.quien, repPersona)) && (!q || sinAcentos(`${f.tipo} ${f.quien} ${f.que} ${f.area}`).includes(q)));
}
function pintarReportes() {
  const sec = $('#reportes'); if (!sec || !estado.usuario || !esDir()) return;
  if (escribiendo(sec)) return;
  const dias = diasConDatos(); if (!dias.includes(repDia)) repDia = dias.includes(hoyDR()) ? hoyDR() : dias[dias.length - 1];
  $('#repDias').innerHTML = dias.map((d, i) => `<button type="button" class="rep-dia${d === repDia ? ' on' : ''}" data-dia="${d}"><small>${DIAS_PROG.some(([x]) => x === d) ? 'Día ' + (DIAS_PROG.findIndex(([x]) => x === d) + 1) : 'Antes'}</small><b>${esc(tituloDia(d))}</b>${d === hoyDR() ? '<i>hoy</i>' : ''}</button>`).join('');
  const todas = filasDelDia(repDia), areas = [...new Set(todas.map(f => f.area))], personas = [...new Set(todas.map(f => f.quien).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  if (repArea !== 'todo' && !areas.includes(repArea)) repArea = 'todo';
  $('#repAreas').innerHTML = ['todo', ...areas].map(a => `<button type="button" data-area="${esc(a)}" class="${a === repArea ? 'on' : ''}">${a === 'todo' ? `Todo (${todas.length})` : `${esc(a)} (${todas.filter(f => f.area === a).length})`}</button>`).join('');
  $('#repPersona').innerHTML = '<option value="">Todas las personas</option>' + personas.map(p => `<option${p === repPersona ? ' selected' : ''}>${esc(p)}</option>`).join('');
  const l = filasVisibles(), inc = todas.filter(f => /Incidencia|No confirmó|Nivel [23]|SOS|Urgente/.test(f.tipo)).length;
  $('#repCifras').innerHTML = tile(todas.length, 'cosas registradas', '#45c8ff', '') + tile(inc, 'incidencias y alertas', '#ff4d5e', '', inc > 0)
    + tile(todas.filter(f => f.est === 'Pendiente').length, 'quedaron pendientes', '#ffd23f', '') + tile(personas.length, 'personas con actividad', '#2fd38c', '');
  $('#repTitulo').textContent = `${repPersona ? repPersona + ' · ' : ''}${tituloDia(repDia)}${repDia === hoyDR() ? ' · se va llenando en vivo' : ''}`;
  $('#repLista').innerHTML = l.length ? l.map(f => `<div class="rep-fila"><span class="rep-hora">${f.t ? horaDR(f.t) : '—'}</span><div><b>${esc(f.tipo)}</b>${f.quien ? ` · <span class="rep-quien">${esc(f.quien)}</span>` : ''}<small>${esc(f.area)}${f.que ? ' · ' + esc(f.que) : ''}</small></div>${f.est ? `<span class="chip ${({ verde: 'verde', amarillo: 'amarillo', rojo: 'rojo' })[tonoEstado(f.est)] || ''}">${esc(f.est)}</span>` : ''}</div>`).join('')
    : `<p class="cob-sub">${todas.length ? 'Nada coincide con el filtro.' : 'Todavía no hay nada registrado este día.'}</p>`;
}
REPORTES.dia = () => {
  const l = filasVisibles();
  return baseReporte(`Reporte del día · ${tituloDia(repDia)}${repPersona ? ' · ' + repPersona : ''}`, `reporte-${repDia}${repPersona ? '-' + sinAcentos(repPersona).replace(/\s+/g, '-') : ''}`, {
    subtitulo: `Todo lo que se registró ${verTodoRep() ? 'en todos los equipos' : 'en ' + SIS.nombre}${repArea !== 'todo' ? ' · ' + repArea : ''}. Bienestar va sin nombres.`,
    resumen: [[l.length, 'registros'], [l.filter(f => /Incidencia|No confirmó|Nivel [23]|SOS|Urgente/.test(f.tipo)).length, 'incidencias y alertas'], [l.filter(f => f.est === 'Pendiente').length, 'pendientes'], [new Set(l.map(f => f.quien).filter(Boolean)).size, 'personas']],
    columnas: [{ t: 'Hora', w: 10, pdf: 16 }, { t: 'Área', w: 18, pdf: 26 }, { t: 'Qué', w: 30 }, { t: 'Quién', w: 20, pdf: 30 }, { t: 'Detalle', w: 60 }, { t: 'Estado', w: 13, pdf: 22 }],
    filas: l.map(f => [f.t ? horaDR(f.t) : '', f.area, f.tipo, f.quien, f.que, f.est]), estadoCol: 5, estado: tonoEstado,
  });
};
$('#reportes').addEventListener('click', e => {
  const d = e.target.closest('[data-dia]'); if (d) { repDia = d.dataset.dia; repPersona = ''; pintarReportes(); return; }
  const a = e.target.closest('[data-area]'); if (a) { repArea = a.dataset.area; pintarReportes(); }
});
$('#repPersona').addEventListener('change', e => { repPersona = e.target.value; pintarReportes(); });
$('#repBuscar').addEventListener('input', e => { repBuscar = e.target.value; const sec = $('#reportes'); const f = document.activeElement; f.blur(); pintarReportes(); f.focus(); });
addEventListener('storage', e => { if (e.key && e.key.startsWith('minume.compartido.') && !document.hidden && seccionActualEs('reportes')) pintarReportes(); });
const seccionActualEs = id => { const s = document.getElementById(id); return !!s && (s.classList.contains('activa') || !document.body.classList.contains('app')); };
setInterval(() => { archivarReporte(); if (!document.hidden && seccionActualEs('reportes')) pintarReportes(); }, 60000);
setTimeout(archivarReporte, 15000);
window.REPORTES_DIA_LISTO = true;
