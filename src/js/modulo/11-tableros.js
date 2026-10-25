// MINUME XVII · Tablero de cada equipo (su propio inicio) · Albert Silvestre
// ---------- Tablero de cada equipo (su propio inicio) ----------
// Turnos de cada asistente (por su nombre); se editan en «Datos del evento → Turnos de asistentes»
const TURNOS_ASIS = { 'María Pérez': [{ de: '7:30', a: '13:00', salon: 'Anacaona 2', tarea: 'Montaje, agua y conteo de delegados' }, { de: '14:00', a: '18:30', salon: 'Anacaona 2', tarea: 'Sesión de la tarde y cierre del salón' }] };
estado.pedidos = leer('pedidos', [{ id: 'q0', ic: '', que: 'Batería para micrófono', salon: 'Anacaona 1', com: 'CSNU', por: 'Laura Peña', t: hoyA(9, 5), est: 'camino', quien: 'Pedro' }]);
estado.codigoAlerta = leer('codigoAlerta', 'verde'); estado.busEstado = leer('busEstado', {});
const NECESITO = [['', 'Agua'], ['', 'Micrófono o batería'], ['', 'Sillas'], ['', 'Proyector o sonido'], ['', 'Limpieza'], ['', 'Material']];
const EST_PED = { pendiente: ['Enviado', 'amarillo'], visto: ['Coordinación lo vio', 'amarillo'], camino: ['En camino', ''], listo: ['Resuelto ✓', 'verde'] };
const NIVEL = { verde: ['Verde', '#1f9e68'], amarillo: ['Amarillo', '#b8951c'], rojo: ['Rojo', '#c23545'] };
const tile = (n, txt, c, acc, alerta) => `<div class="tile${alerta ? ' alerta' : ''}" style="--c:${c}" data-acc="${acc || ''}"><b>${n}</b><small>${txt}</small></div>`;
function filaPedido(q, coord) {
  const [e, cl] = EST_PED[q.est];
  const der = coord && q.est !== 'listo' ? `<button class="mini" data-acc="ped-${q.est === 'camino' ? 'listo' : 'camino'}" data-id="${q.id}">${q.est === 'camino' ? '✓Resuelto' : 'Lo llevo'}</button>` : `<span class="chip ${cl}">${e}</span>`;
  return `<div class="pedido"><span style="font-size:20px">${q.ic}</span><div><b>${esc(q.que)}</b><small>Salón ${esc(q.salon)} · ${esc(q.com)} · ${esc(q.por)} · ${hora(q.t)}${q.quien ? ' · lo lleva ' + esc(q.quien) : ''}</small></div>${der}</div>`;
}
// Grupos que se mueven a pie entre las sedes (los guía el equipo de Traslado)
function estadoGrupos(t) {
  return EQUIPO.filter(p => p.rol === 'traslado').map(p => { const x = { p, ...posicion(p, t) }, s = sedeMasCerca(x.pos); return { p, x, txt: x.mov ? `Caminando con el grupo · a ${Math.round(s[1])} m de ${SEDES[s[0]].corto}` : `Esperando en ${SEDES[s[0]].corto}`, est: estado.busEstado[p.id] || 'A tiempo' }; });
}
// Lo que ve cada rol, en una línea (lo usa el saludo del inicio)
function descRol(u) { return (esVol() ? { asistencia: 'Tu turno, tu salón, cómo llegar y lo que necesites, en un toque.', acreditacion: 'Tu herramienta es el escáner de delegados. Funciona aunque se vaya el internet.', seguridad: 'Aquí ves solo lo que te toca: tu puesto, tus turnos, tus regionales y tus rondas.', traslado: 'Aquí ves solo lo que te toca: tu puesto, tus turnos y las regionales que tienes a cargo.', bienestar: 'Aquí ves solo lo que te toca: tu puesto, tus turnos y los casos que atiendes.', eventos: 'Aquí ves solo lo que te toca: tu puesto, tus turnos y los eventos a tu cargo.' } : { asistencia: 'Tu turno, tu salón, cómo llegar y lo que necesites, en un toque.', acreditacion: 'Tu herramienta es el escáner de delegados. Funciona aunque se vaya el internet.', seguridad: 'Ves el evento completo en vivo: staff, alertas y el mapa de las sedes con los puntos de seguridad.', traslado: 'Ves el evento completo en vivo: staff, alertas, tus puntos y las regionales que tienes a cargo.', coordinacion: SISTEMA === 'asistencia' ? 'Ves las incidencias de los asistentes, los pedidos de los salones y lo que se escaló a Bienestar o Seguridad.' : 'Ves todo: cada equipo, las sedes, las movilizaciones, las alertas y los pedidos de los salones.', eventos: 'Toca el botón de cada evento cuando avance y marca a cada invitado cuando llegue. Coordinación lo ve al instante.', bienestar: 'Te llegan al instante los casos que escalan los equipos. Hazles el triaje, atiéndelos y ciérralos; lo más grave sale primero.' })[u.rol]; }
function pintarBienvenida() {
  const u = estado.usuario; if (!u) return; const [txt, color] = ROLES[u.rol], nv = NIVEL[estado.codigoAlerta];
  const desc = descRol(u);
  $('#flujo').innerHTML = `<span class="chip" style="color:${color};border-color:${color}88">${txt}</span><h3 style="font-size:30px;margin:10px 0 4px">Hola, ${esc(u.nombre.split(' ')[0])}</h3><p style="color:var(--suave);font-size:14px;line-height:1.6;margin:0 0 10px">${desc}</p><div class="dato"><span>Código del evento</span><b style="color:${nv[1]}">${nv[0]}</b></div>`;
  if (window.NAV_LISTA) pintarSaludo();
}
let ultimoTablero = '';
function pintarTablero() {
  const u = estado.usuario; if (!u) return;
  const t = performance.now() / 1000, eq = equipoAhora(t), mov = eq.filter(x => x.mov).length;
  const lejos = eq.filter(x => !x.lugar && sedeMasCerca(x.pos)[1] > 250).length;
  const sos = estado.bitacora.filter(b => /SOS|Urgente|Nivel 3/.test(b.tipo)).length, pend = estado.pedidos.filter(q => q.est !== 'listo');
  const delOk = DELEGADOS.filter(d => estado.delAcr[d.id]).length, nv = NIVEL[estado.codigoAlerta];
  let h = '';
  if (esVol() && ['seguridad', 'traslado', 'bienestar', 'eventos'].includes(u.rol)) h = tableroVoluntario();
  else if (u.rol === 'asistencia') {
    const tur = TURNOS_ASIS[u.nombre] || [{ de: '8:00', a: '13:00', salon: miSalon() || '—', tarea: 'Apoyo a tu comisión' }], m = new Date().getHours() * 60 + new Date().getMinutes();
    const ahora = tur.find(x => minutos(x.de) <= m && m < minutos(x.a)), tt = ahora || tur.find(x => minutos(x.de) > m) || tur[0];
    const mios = estado.pedidos.filter(q => q.por === u.nombre).slice(-3).reverse(), lista = LISTAS[estado.etapa], hechas = (estado.marcas[estado.etapa] || []).length;
    h = `<div class="rejilla r2"><div class="tarjeta turno"><span class="chip">${ahora ? '● Tu turno ahora' : 'Tu próximo turno'}</span>
        <div class="hora-grande" style="margin-top:10px">${tt.de} – ${tt.a}</div>
        <b class="cond" style="font-size:26px;display:block;margin-top:4px">Salón ${tt.salon} · ${estado.comision || ''}</b>
        <div style="color:var(--suave);font-size:13.5px">${SEDES[(ASIGNA[estado.comision] || ['jaragua'])[0]].corto} · ${tt.tarea}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="boton" data-acc="ruta">Cómo llegar</button><button class="boton sec" data-acc="ir-listas">Mi checklist · ${hechas}/${lista.length}</button></div>
        ${tur.length > 1 ? `<div style="color:var(--suave);font-size:12.5px;margin-top:10px">Tus turnos de hoy: ${tur.map(x => `${x.de}–${x.a}`).join(' · ')}</div>` : ''}</div>
      <div class="tarjeta"><b class="cond" style="font-size:24px">Necesito en mi salón</b><div style="color:var(--suave);font-size:13px">Un toque y le llega a coordinación con tu salón.</div>
        <div class="necesito">${NECESITO.map(([ic, n], i) => `<button data-acc="necesito" data-i="${i}"><span>${ic}</span>${n}</button>`).join('')}</div>
        ${mios.length ? `<div style="margin-top:8px">${mios.map(q => filaPedido(q)).join('')}</div>` : ''}</div></div>
      <div class="tarjeta"><b class="cond" style="font-size:24px">Me moví a…</b><div style="color:var(--suave);font-size:13px">Avísale a coordinación dónde estás, sin escribir.</div>
        <div style="display:flex;gap:8px;margin-top:8px"><select id="lugar2">${opcionesLugar()}</select><button class="boton sec" data-acc="lugar2" style="flex:none">Avisar</button></div>
        <div style="color:var(--suave);font-size:12.5px;margin-top:6px">${textoLugar()}</div></div>`;
    const misAv = leerAvisos().filter(a => a.por === u.nombre).reverse().slice(0, 3);
    if (misAv.length) h += `<div class="tarjeta"><b class="cond" style="font-size:24px">Lo que escalaste</b><div style="color:var(--suave);font-size:13px">Ves en vivo cuando el otro equipo lo toma.</div>${misAv.map(a => filaAviso(a)).join('')}</div>`;
  } else if (u.rol === 'acreditacion') {
    const tot = DELEGADOS.length;
    h = `<div class="tiles">${tile(delOk, 'delegados acreditados', '#2fd38c', 'ir-delegados')}${tile(tot - delOk, 'faltan por llegar', '#ffd23f', 'ir-delegados')}${tile(colaDel.length, colaDel.length ? 'guardadas sin internet' : 'todo subido a la nube', '#ff9a3c', 'ir-delegados')}${tile(Math.round(tot ? delOk / tot * 100 : 0) + '%', 'del total', '#a974ff', 'ir-delegados')}</div>
      <div><button class="boton" data-acc="ir-delegados">Empezar a escanear</button></div>`;
  } else if (u.rol === 'seguridad' || u.rol === 'traslado') {
    const al = avisosPara('seguridad').reverse().slice(0, 5), abiertos = avisosPara('seguridad').filter(a => !CERRADO(a)).length;
    h = `<div class="tiles">${tile(eq.length, 'staff compartiendo ubicación', '#2fd38c', 'ir-ubicacion')}${tile(mov, 'en movimiento ahora', '#ff9a3c', 'ir-mapa')}${tile(lejos, 'fuera de la zona de su sede', '#ffd23f', 'ir-ubicacion', lejos > 0)}${tile(abiertos, 'avisos abiertos', '#ff4d5e', '', abiertos > 0)}</div>
      <div class="tiles">${resumenCobertura()}</div>
      <div class="rejilla r2"><div class="tarjeta"><b class="cond" style="font-size:24px">Código del evento</b><div style="color:var(--suave);font-size:13px">Lo que elijas aquí lo ve todo el staff al instante.</div>
        <div class="niveles">${Object.entries(NIVEL).map(([k, [n, c]]) => `<button data-acc="nivel" data-k="${k}" class="${estado.codigoAlerta === k ? 'on' : ''}" style="background:${c}">${n}</button>`).join('')}</div></div>
      <div class="tarjeta"><b class="cond" style="font-size:24px">Avisos y SOS</b>${al.length ? al.map(a => filaAviso(a, ACC_SEG)).join('') : '<div class="pedido"><span style="font-size:18px"></span><div><b>Sin alertas abiertas</b><small>Si alguien toca SOS, aparece aquí con su ubicación.</small></div></div>'}
        <button class="boton" data-acc="ir-mapa" style="margin-top:12px">Ver todo en el mapa en vivo</button></div></div>`;
  } else if (u.rol === 'eventos') {
    h = tableroEventos();
  } else if (u.rol === 'bienestar') {
    h = tableroBienestar();
  } else if (SISTEMA === 'asistencia') {
    h = tableroCoordAsistencia();
  } else {
    const bs = estadoGrupos(t), staffOk = Object.keys(estado.acreditados).length, movs = estado.bitacora.filter(b => /Me moví|Llegó a su puesto/.test(b.tipo)).slice(-3).reverse();
    h = `<div class="tiles">${resumenGeneral()}</div><div class="tiles">${tile(`${delOk}/${DELEGADOS.length}`, 'delegados acreditados', '#a974ff', 'ir-delegados')}${tile(pend.length, 'pedidos de los salones', '#ffd23f', '', pend.length > 0)}${tile(sos, 'alertas SOS', '#ff4d5e', 'ir-incidencias', sos > 0)}${tile(eq.length, 'staff en vivo', '#2fd38c', 'ir-ubicacion')}${tile(mov, 'en movimiento', '#ff9a3c', 'ir-mapa')}${tile(`${bs.filter(b => b.x.mov).length}/${bs.length}`, 'grupos caminando', '#ff9a3c', 'ir-traslado')}${tile(nv[0], 'código del evento', nv[1], 'ir-seguridad')}</div>
      <div class="rejilla r2"><div class="tarjeta"><b class="cond" style="font-size:24px">Pedidos de los salones</b>${estado.pedidos.slice().reverse().slice(0, 5).map(q => filaPedido(q, true)).join('')}</div>
      <div class="tarjeta"><b class="cond" style="font-size:24px">Movilizaciones</b>${bs.map(b => `<div class="pedido"><span style="font-size:20px"></span><div><b>${b.p.n} · ${b.est}</b><small>${b.txt}</small></div></div>`).join('')}
        <b class="cond" style="font-size:22px;display:block;margin-top:12px">Movimientos del staff</b>${movs.length ? movs.map(b => `<div class="pedido"><span></span><div><b>${esc(b.texto)}</b><small>${b.hora}</small></div></div>`).join('') : '<div style="color:var(--suave);font-size:13px;padding:6px 0">Cuando alguien avise "Me moví a…", aparece aquí.</div>'}</div></div>`;
  }
  if (h === ultimoTablero) return;
  const elegido = $('#lugar2') && $('#lugar2').value; ultimoTablero = h; $('#tablero').innerHTML = h;
  if (elegido && $('#lugar2')) $('#lugar2').value = elegido; // no perder lo que la persona estaba eligiendo
}
setInterval(() => { if (seVe($('#tablero'))) pintarTablero(); }, 2500);
const ACC_SEG = [['camino', 'Voy en camino'], ['atencion', 'Atendiendo'], ['resuelto', 'Resuelto']];
const ACC_COORD = [['visto', 'Lo vi'], ['camino', 'Voy en camino'], ['resuelto', 'Resuelto']];
const ACC_BIEN = [['camino', 'Voy en camino'], ['atencion', 'Atendiendo'], ['resuelto', 'Resuelto'], ['derivado', 'Derivar al 911']];
// Inicio del voluntario: solo lo que le toca. Su puesto y turnos, y según el equipo sus regionales, su ronda, sus casos o sus eventos.
function tableroVoluntario() {
  const u = estado.usuario, tarjetas = [];
  const fila = (h, b, sm, cl = '', der = '') => `<div class="vol-fila ${cl}"><span class="h">${h}</span><div><b>${b}</b>${sm ? `<small>${sm}</small>` : ''}</div>${der}</div>`;
  if (!$('#cobertura').classList.contains('sin-permiso')) {
    cobEstado(); const { min } = cobAhora(); const yo = miCodCob();
    if (!yo) tarjetas.push(`<div class="tarjeta"><span class="chip">Tu puesto</span><h3 class="cob-mio-t">Todavía no tienes un puesto asignado</h3><p class="cob-sub">Cuando tu coordinación te asigne un punto y un turno, aparece aquí con tu tarea.</p></div>`);
    else {
      const ref = estado.cob.refs.find(r => r.cod === yo), mio = cobOcupacion(min)[yo], prox = cobProximo(yo, min);
      const turnos = COB_PUNTOS.flatMap(p => p.turnos.filter(t => t[3].some(([c]) => c === yo)).map(t => ({ p, t, tarea: t[3].find(([c]) => c === yo)[1] }))).sort((a, b) => a.t[0] - b.t[0]);
      const pr = ref && COB_PUNTOS.find(x => x.id === ref.punto);
      const conf = mio && estado.cob.conf[claveSlot(mio.p, mio.t) + '#' + yo];
      const cab = pr ? `<span class="chip" style="color:#c7a6ff;border-color:rgba(169,116,255,.5)">Estás de refuerzo</span><h3 class="cob-mio-t">${pr.id} · ${esc(pr.n)}</h3><p class="cob-sub">${SEDES[pr.sede].nombre} · desde las ${cobHora(ref.desde)}</p>`
        : mio ? `<span class="chip">Tu puesto ahora</span><h3 class="cob-mio-t">${mio.p.id} · ${esc(mio.p.n)}</h3><p class="cob-sub">${SEDES[mio.p.sede].nombre} · ${cobHora(mio.t[0])} a ${cobHora(mio.t[1])}</p><div class="cob-tarea"><b>Tu tarea:</b> ${esc(mio.tarea)}</div>${conf != null ? `<div class="cob-ok">✓Confirmaste que llegaste a las ${cobHora(conf)}</div>` : ''}`
        : `<span class="chip verde">Libre ahora</span><h3 class="cob-mio-t">${prox ? 'Tu turno empieza a las ' + cobHora(prox.t[0]) : 'No tienes más turnos hoy'}</h3><p class="cob-sub">${prox ? `${prox.p.id} · ${esc(prox.p.n)} · ${esc(prox.t[2])}` : 'Gracias por tu trabajo.'}</p>`;
      tarjetas.push(`<div class="tarjeta">${cab}<div class="vol-acc"><button class="boton" data-acc="ir-cobertura">${mio && conf == null && !pr ? 'Confirmar que llegué' : 'Ver mi puesto'}</button><button class="boton sec" data-acc="ir-mapa">Cómo llegar</button></div></div>`);
      tarjetas.push(`<div class="tarjeta"><b class="cond" style="font-size:24px">Tus turnos de hoy</b><div class="vol-lista">${turnos.length ? turnos.map(({ p, t, tarea }) => fila(`${cobHora(t[0])}–${cobHora(t[1])}`, `${p.id} · ${esc(p.n)}`, esc(tarea), min >= t[0] && min < t[1] ? 'ahora' : min >= t[1] ? 'pasado' : '')).join('') : '<div class="vol-vacio">No tienes turnos hoy.</div>'}</div></div>`);
    }
  }
  if ((u.rol === 'seguridad' || u.rol === 'traslado') && !$('#traslado').classList.contains('sin-permiso')) {
    const mias = misRegionales(), mom = momentoAhora();
    if (mias.length) tarjetas.push(`<div class="tarjeta"><b class="cond" style="font-size:24px">Tus regionales</b><div class="vol-lista">${mias.map(r => { const e = estadoReg(r, mom); return fila(esc(r.id.slice(1)), esc(r.n), r.zona ? esc(r.zona) : '', '', `<span class="chip ${TONO_REG[e.k]}">${e.txt}</span>`); }).join('')}</div><div class="vol-acc"><button class="boton" data-acc="ir-traslado">Marcar mis regionales</button></div></div>`);
  }
  if (u.rol === 'seguridad' && !$('#rondas').classList.contains('sin-permiso')) {
    const act = miRonda(leerRondas()), r = act && RUTAS.find(x => x.id === act.ruta);
    tarjetas.push(`<div class="tarjeta"><b class="cond" style="font-size:24px">Rondas</b><p class="cob-sub">${r ? `Tienes en curso la ronda <b>${esc(r.n)}</b>: ${Object.keys(act.marcas).length} de ${r.puntos.length} puntos marcados.` : 'No tienes una ronda en curso. Cuando te toque, empiézala y marca cada punto.'}</p><div class="vol-acc"><button class="boton${r ? '' : ' sec'}" data-acc="ir-rondas">${r ? 'Seguir mi ronda' : 'Empezar una ronda'}</button></div></div>`);
  }
  if (u.rol === 'bienestar') {
    const { reportes, abiertos } = colaTriaje(), yo = sinAcentos(u.nombre);
    const mios = abiertos.filter(x => x.encargado && sinAcentos(x.encargado) === yo), libres = abiertos.filter(x => !x.encargado);
    const fc = x => { const p = PRIO[prioDe(x)]; return fila(`<span class="tr-punto" style="--p:${p.c}"></span>`, `${esc(codigoDe(x))} · ${esc(x.nombre)}`, `${p.n} · ${esc(x.donde || 'sin lugar')} · ${minDesde(x.llega)} min`); };
    tarjetas.push(`<div class="tarjeta"><b class="cond" style="font-size:24px">Casos que atiendes</b><div class="vol-lista">${mios.length ? mios.map(fc).join('') : '<div class="vol-vacio">No tienes casos a tu cargo ahora.</div>'}</div>
      ${reportes.length || libres.length ? `<b class="cond" style="font-size:20px;display:block;margin-top:14px">Esperando a alguien · ${reportes.length + libres.length}</b><div class="vol-lista">${reportes.slice(0, 3).map(a => filaAviso(a)).join('')}${libres.slice(0, 3).map(fc).join('')}</div>` : ''}
      <div class="vol-acc"><button class="boton" data-acc="ir-casos">Abrir mis casos</button><button class="boton sec" data-acc="ir-protocolos">Protocolos</button></div></div>`);
  }
  if (u.rol === 'eventos') {
    const { dia } = partesDR(ahoraEvento()), mios = misEventos().sort((a, b) => a.dia.localeCompare(b.dia) || aMinutos(a.i) - aMinutos(b.i)), hoy = mios.filter(e => e.dia === dia);
    const lista = hoy.length ? hoy : mios;
    tarjetas.push(`<div class="tarjeta"><b class="cond" style="font-size:24px">${hoy.length ? 'Tus eventos de hoy' : 'Tus eventos'}</b><div class="vol-lista">${lista.length ? lista.map(e => { const [t] = EST_EV[estEv(e).est]; return fila(e.i, esc(e.n), `${esc(e.lugar)}${hoy.length ? '' : ' · ' + e.dia.slice(8) + ' nov'} · montaje ${e.m}`, '', `<span class="chip">${t}</span>`); }).join('') : '<div class="vol-vacio">Todavía no tienes eventos a tu cargo. Cuando tu coordinación te ponga como responsable de uno, aparece aquí.</div>'}</div>${lista.length ? '<div class="vol-acc"><button class="boton" data-acc="ir-eventos">Avanzar mis eventos</button></div>' : ''}</div>`);
  }
  return `<div class="rejilla r2">${tarjetas.join('')}</div>`;
}
function tableroCoordAsistencia() {
  const av = avisosPara('asistencia').reverse(), abiertos = av.filter(a => !CERRADO(a)), pend = estado.pedidos.filter(q => q.est !== 'listo');
  const fuera = leerAvisos().filter(a => a.de === 'asistencia' && a.para !== 'asistencia' && !CERRADO(a));
  return `<div class="tiles">${tile(abiertos.length, 'incidencias por atender', '#ffd23f', 'ir-incidencias', abiertos.length > 0)}${tile(pend.length, 'pedidos de los salones', '#45c8ff', '', pend.length > 0)}${tile(fuera.length, 'casos con Bienestar o Seguridad', '#ff4d5e', '', fuera.length > 0)}${tile(15, 'comisiones con asistente', '#2fd38c', 'ir-cumplimiento')}</div>
    <div class="rejilla r2"><div class="tarjeta"><b class="cond" style="font-size:24px">Incidencias de los asistentes</b>${av.length ? av.slice(0, 6).map(a => filaAviso(a, ACC_COORD)).join('') : '<div style="color:var(--suave);font-size:13px;padding:6px 0">Cuando un asistente reporte un nivel 2 o 3 para Coordinación, aparece aquí al instante.</div>'}</div>
    <div class="tarjeta"><b class="cond" style="font-size:24px">Pedidos de los salones</b>${estado.pedidos.slice().reverse().slice(0, 5).map(q => filaPedido(q, true)).join('')}
      ${fuera.length ? `<b class="cond" style="font-size:22px;display:block;margin-top:12px">Escalados a otros equipos</b>${fuera.map(a => filaAviso(a)).join('')}` : ''}</div></div>`;
}
function tableroBienestar() {
  const r = resumenTriaje(), { reportes, abiertos } = colaTriaje(), kit = (estado.marcas.kit || []).length;
  const fila = x => { const p = PRIO[prioDe(x)]; return `<div class="pedido"><span class="tr-punto" style="--p:${p.c}"></span><div><b>${esc(codigoDe(x))} · ${esc(x.nombre)}</b><small>${p.n} · ${esc(x.motivo || '')} · ${esc(x.donde || 'sin lugar')} · ${minDesde(x.llega)} min</small></div></div>`; };
  return `<div class="tiles">${tile(r.emergencias, 'emergencias', PRIO.emergencia.c, 'ir-casos', r.emergencias > 0)}${tile(r.reportes, 'reportes sin triaje', '#ff8a3d', 'ir-casos', r.reportes > 0)}${tile(r.activos, 'casos activos', '#ffd23f', 'ir-casos')}${tile(r.resueltos, 'cerrados hoy', '#2fd38c', 'ir-casos')}${tile(`${kit}/${KIT.length}`, 'kit del punto revisado', '#45c8ff', 'ir-punto', kit < KIT.length)}</div>
    <div class="tarjeta"><b class="cond" style="font-size:24px">Cola de triaje</b>${reportes.length || abiertos.length ? reportes.slice(0, 3).map(a => filaAviso(a)).join('') + abiertos.slice(0, 5).map(fila).join('') : '<div style="color:var(--suave);font-size:13px;padding:6px 0">No hay casos activos. Cuando un equipo escale un caso a Bienestar o alguien toque SOS por una persona enferma, aparece aquí al instante.</div>'}
      <button class="boton" data-acc="ir-casos" style="margin-top:12px">Abrir la cola de triaje</button></div>`;
}
