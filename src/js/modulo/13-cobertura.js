// ---------- Cobertura de áreas (Seguridad y Traslado) ----------
// Cada punto del evento tiene sus turnos del día: a qué hora, quién debe estar y qué hace. El staff confirma que llegó
// a su puesto; dirección ve qué punto se quedó solo y manda un refuerzo de los que están libres.
// Datos de EJEMPLO: en la versión real salen del Excel de agenda del equipo y se guardan en Supabase.
const COB_STAFF = {
  'DIR-S': ['Brahyant Pérez', 'Dirección'], S01: ['Luis Gómez', 'Seguridad'], S02: ['Yaneris Cruz', 'Seguridad'], S03: ['Kelvin Rosario', 'Seguridad'],
  S04: ['Mariel Santos', 'Seguridad'], S05: ['José Peña', 'Seguridad'], S06: ['Darlin Féliz', 'Seguridad'], S07: ['Nathaly Reyes', 'Seguridad'],
  T01: ['Ana Rosario', 'Traslado'], T02: ['Rosa Almonte', 'Traslado'], T03: ['Carlos Méndez', 'Traslado'], T04: ['Wendy Jiménez', 'Traslado'],
};
const COB_CODIGO = { 'SE-1093': 'S01', 'TR-5570': 'T01' }; // código de entrada → código de staff
const hm = (h, m = 0) => h * 60 + m;
const COB_PUNTOS = [
  { id: 'ENT-J', n: 'Entrada y lobby del Jaragua', sede: 'jaragua', tipo: 'Puerta', lugar: 'j-lobby', turnos: [
    [hm(6, 30), hm(12, 30), 'Acreditación y sesiones de la mañana', [['S01', 'Control de acceso en la puerta'], ['S03', 'Ordena la fila y orienta hacia los salones']]],
    [hm(12, 30), hm(14), 'Almuerzo · el equipo come en tandas', [['S03', 'Cubre la entrada mientras S01 come']]],
    [hm(14), hm(19), 'Sesiones de la tarde', [['S01', 'Control de acceso en la puerta'], ['S03', 'Vigila el lobby y la salida']]],
    [hm(19), hm(21), 'Salida y cierre de jornada', [['S05', 'Controla la salida de delegados por el lobby']]]] },
  { id: 'SAL-J', n: 'Salones del Jaragua · Anacaona y salones pequeños', sede: 'jaragua', tipo: 'Pasillo', lugar: 'anacaona', turnos: [
    [hm(8), hm(12, 30), 'Sesiones de la mañana', [['S06', 'Ronda por Anacaona, Marién, Maguá, Higüey, Maguana y Las Olas']]],
    [hm(12, 30), hm(14), 'Almuerzo · tanda 2', [['S07', 'Cubre el pasillo mientras S06 come']]],
    [hm(14), hm(18, 30), 'Sesiones de la tarde', [['S06', 'Ronda por los salones y salidas de emergencia']]]] },
  { id: 'PUE-E', n: 'Puerta este del Jaragua · salida hacia el Sheraton', sede: 'jaragua', tipo: 'Movilización', lugar: 'j-este', turnos: [
    [hm(7, 15), hm(8), 'Salida de las comisiones del Sheraton', [['T01', 'Cuenta y despacha cada grupo'], ['T02', 'Ordena la fila por comisión']]],
    [hm(12, 15), hm(12, 45), 'Salida al almuerzo', [['T01', 'Despacha los grupos hacia el Malecón Terrace']]],
    [hm(18, 15), hm(19), 'Llegada del cierre', [['T01', 'Recibe los grupos que vienen del Sheraton']]]] },
  { id: 'CAM-JS', n: 'Camino Jaragua – Sheraton · canchas de tenis', sede: 'jaragua', tipo: 'Movilización', lugar: 'canchas', turnos: [
    [hm(7, 20), hm(8, 10), 'Movilización de la mañana', [['T03', 'Guía al grupo por el borde del parqueo y las canchas']]],
    [hm(12, 10), hm(12, 50), 'Movilización al almuerzo', [['T03', 'Guía hacia la calle interna y la carpa']]],
    [hm(18, 20), hm(18, 50), 'Movilización del cierre', [['T03', 'Guía al grupo de vuelta al Jaragua']]]] },
  { id: 'ENT-S', n: 'Entrada oeste del Sheraton', sede: 'sheraton', tipo: 'Puerta', lugar: 's-oeste', turnos: [
    [hm(7, 15), hm(18, 45), 'Jornada del Sheraton', [['S02', 'Control de acceso de los grupos que llegan a pie']]]] },
  { id: 'SAL-S', n: 'Salones del Sheraton', sede: 'sheraton', tipo: 'Pasillo', lugar: 'samana', turnos: [
    [hm(8), hm(18, 30), 'Sesiones del día', [['S04', 'Ronda por Samaná, Bonanza, Constanza, Yarey, Da Vinci, Este y Board Room']]]] },
  { id: 'LOB-S', n: 'Lobby del Sheraton', sede: 'sheraton', tipo: 'Interior', lugar: 's-lobby', turnos: [
    [hm(7, 30), hm(18, 45), 'Orientación y control', [['S07', 'Orienta y vigila el lobby']]]] },
  { id: 'MAL-T', n: 'Malecón Terrace · carpa', sede: 'malecon', tipo: 'Movilización', lugar: 'malecon-terrace', turnos: [
    [hm(12), hm(14), 'Almuerzo general', [['T04', 'Recibe los grupos y cuenta por comisión'], ['S05', 'Control de acceso a la carpa']]]] },
  { id: 'NOC-J', n: 'Control nocturno · Jaragua', sede: 'jaragua', tipo: 'Nocturno', turnos: [
    [hm(21), hm(24), 'Control nocturno', [['S06', 'Ronda por los pisos de habitaciones'], ['S07', 'Parqueo y entrada del hotel']]]] },
];
const COB_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function cobAhora() { const p = Object.fromEntries(COB_FMT.formatToParts(ahoraEvento()).map(x => [x.type, x.value])); return { dia: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute }; }
const cobHora = m => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
const cobNombre = c => (COB_STAFF[c] || [c])[0];
const cobCorto = c => cobNombre(c).split(' ')[0];
const slotDe = (p, min) => p.turnos.find(t => min >= t[0] && min < t[1]) || null;
const claveSlot = (p, t) => `${p.id}@${t[0]}`;
const miCodCob = () => (estado.usuario && COB_CODIGO[estado.usuario.codigo]) || null;
const puedeAsignar = () => !!estado.usuario && ['seguridad', 'traslado', 'coordinacion'].includes(estado.usuario.rol);
function cobEstado() {
  const { dia } = cobAhora(); let c = leerComp('cobertura', null);
  if (!c || c.dia !== dia) c = { dia, conf: {}, refs: [], sembrado: {} }; // cada día empieza limpio
  estado.cob = c; return c;
}
const cobGuardar = () => guardarComp('cobertura', estado.cob);
// Demo: el staff de ejemplo confirma solo al empezar su turno (menos Kelvin y Wendy, para que se vea un punto incompleto).
// Tú sí confirmas el tuyo con el botón.
function cobSembrar(min) {
  const c = estado.cob, yo = miCodCob(); let cambio = false;
  for (const p of COB_PUNTOS) {
    const t = slotDe(p, min); if (!t) continue; const k = claveSlot(p, t); if (c.sembrado[k]) continue;
    c.sembrado[k] = 1; cambio = true;
    t[3].forEach(([cod], i) => { if (cod === 'S03' || cod === 'T04' || cod === yo) return; c.conf[k + '#' + cod] = Math.min(min, t[0] + 3 + i * 4); });
  }
  if (cambio) cobGuardar();
}
function cobOcupacion(min) { const o = {}; for (const p of COB_PUNTOS) { const t = slotDe(p, min); if (t) t[3].forEach(([cod, tarea]) => { o[cod] = { p, t, tarea }; }); } return o; }
function cobLibres(min) { const o = cobOcupacion(min), r = new Set(estado.cob.refs.map(x => x.cod)); return Object.keys(COB_STAFF).filter(c => c !== 'DIR-S' && !o[c] && !r.has(c)); }
function cobProximo(cod, min) { let m = null; for (const p of COB_PUNTOS) for (const t of p.turnos) if (t[0] > min && t[3].some(([c]) => c === cod) && (!m || t[0] < m.t[0])) m = { p, t }; return m; }
function cobFilas(min) {
  return COB_PUNTOS.map(p => {
    const t = slotDe(p, min), k = t && claveSlot(p, t), refs = estado.cob.refs.filter(r => r.punto === p.id);
    const gente = (t ? t[3] : []).map(([cod, tarea]) => { const r = estado.cob.refs.find(x => x.cod === cod); return { cod, tarea, conf: estado.cob.conf[k + '#' + cod], fuera: r && r.punto !== p.id ? r.punto : null }; });
    const estan = gente.filter(g => g.conf != null && !g.fuera).length + refs.length, req = gente.length;
    const est = !t && !refs.length ? 'libre' : estan === 0 ? 'descubierta' : estan < req ? 'incompleta' : 'cubierta';
    return { p, t, k, gente, refs, estan, req, est, prox: p.turnos.find(x => x[0] > min) || null };
  });
}
function cobConflictos(min) {
  return estado.cob.refs.filter(r => !r.mantener).map(r => { const n = cobProximo(r.cod, min); return n && n.t[0] - min <= 30 ? { r, ...n, falta: n.t[0] - min } : null; }).filter(Boolean);
}
const COB_EST = { cubierta: ['Cubierto', 'verde'], incompleta: ['Falta gente', 'amarillo'], descubierta: ['Sin nadie', 'rojo'], libre: ['Sin turno ahora', ''] };
let cobSede = 'todas', cobAbierto = null, cobPlan = null;
function pintarCobertura() {
  const sec = $('#cobertura');
  if (!sec || !estado.usuario || !['seguridad', 'traslado', 'coordinacion'].includes(estado.usuario.rol)) return;
  cobEstado(); const { min } = cobAhora(); cobSembrar(min);
  const filas = cobFilas(min), activas = filas.filter(f => f.est !== 'libre');
  const desc = activas.filter(f => f.est === 'descubierta'), inc = activas.filter(f => f.est === 'incompleta');
  const esperados = activas.reduce((s, f) => s + f.req, 0), llegaron = activas.reduce((s, f) => s + f.gente.filter(g => g.conf != null && !g.fuera).length, 0);
  const libres = cobLibres(min), confl = cobConflictos(min), yo = miCodCob();
  $('#cobReloj').textContent = `Ahora · ${cobHora(min)}`;
  $('#cobTiles').innerHTML = tile(`${activas.length - desc.length - inc.length}/${activas.length}`, 'puntos cubiertos ahora', '#2fd38c', '')
    + tile(desc.length, desc.length === 1 ? 'punto sin nadie' : 'puntos sin nadie', '#ff4d5e', '', desc.length > 0)
    + tile(`${llegaron}/${esperados}`, 'confirmaron que llegaron', '#45c8ff', '')
    + tile(libres.length, 'libres para reforzar', '#ffd23f', '');

  // Mi puesto
  const ref = yo && estado.cob.refs.find(r => r.cod === yo), mio = yo && cobOcupacion(min)[yo], prox = yo && cobProximo(yo, min);
  const lineaProx = prox ? `<div class="dato"><span>Tu próximo turno</span><b>${cobHora(prox.t[0])} · ${prox.p.id} ${esc(prox.p.n)}</b></div>` : '';
  let h;
  if (!yo) {
    const cambios = COB_PUNTOS.flatMap(p => p.turnos.filter(t => t[0] > min && t[0] - min <= 45).map(t => ({ p, t }))).sort((a, b) => a.t[0] - b.t[0]);
    h = `<span class="chip">Vista de coordinación</span><h3 class="cob-mio-t">${desc.length ? `${desc.length} punto${desc.length > 1 ? 's' : ''} sin nadie` : 'Ningún punto está solo'}</h3>
      <p class="cob-sub">${inc.length ? `${inc.length} punto${inc.length > 1 ? 's tienen' : ' tiene'} gente que no ha confirmado. ` : ''}${libres.length} persona${libres.length === 1 ? '' : 's'} libre${libres.length === 1 ? '' : 's'} para reforzar.</p>
      <b class="cob-mini-t">Cambios de turno en los próximos 45 min</b>${cambios.length ? cambios.map(({ p, t }) => `<div class="dato"><span>${cobHora(t[0])} · ${p.id} ${esc(p.n)}</span><b>${t[3].map(([c]) => esc(cobCorto(c))).join(', ')}</b></div>`).join('') : '<p class="cob-sub">No hay cambios de turno pronto.</p>'}`;
  } else if (ref) {
    const p = COB_PUNTOS.find(x => x.id === ref.punto);
    h = `<span class="chip" style="color:#c7a6ff;border-color:rgba(169,116,255,.5)">Estás de refuerzo</span><h3 class="cob-mio-t">${p.id} · ${esc(p.n)}</h3><p class="cob-sub">${SEDES[p.sede].nombre} · desde las ${cobHora(ref.desde)}${ref.por ? ' · te asignó ' + esc(ref.por) : ''}</p>
      ${mio ? `<div class="cob-tarea">Tu puesto de este turno (${mio.p.id} ${esc(mio.p.n)}) se ve como “de refuerzo”. Vuelve cuando coordinación te libere.</div>` : ''}
      <button class="boton" data-cob="volver" style="margin-top:6px">Volver a mi puesto</button>${lineaProx}`;
  } else if (mio) {
    const k = claveSlot(mio.p, mio.t), c = estado.cob.conf[k + '#' + yo], comp = mio.t[3].filter(([x]) => x !== yo);
    h = `<span class="chip">Tu puesto ahora</span><h3 class="cob-mio-t">${mio.p.id} · ${esc(mio.p.n)}</h3><p class="cob-sub">${SEDES[mio.p.sede].nombre} · ${cobHora(mio.t[0])} a ${cobHora(mio.t[1])} · ${esc(mio.t[2])}</p>
      <div class="cob-tarea"><b>Tu tarea:</b> ${esc(mio.tarea)}${comp.length ? `<br><small>Contigo: ${comp.map(([x, ta]) => `${esc(cobNombre(x))} (${esc(ta.toLowerCase())})`).join(', ')}</small>` : ''}</div>
      ${c != null ? `<div class="cob-ok">✓ Confirmaste que llegaste a las ${cobHora(c)}</div>` : `<button class="boton" data-cob="llegue" data-k="${k}" data-cod="${yo}">Ya estoy en mi puesto</button>`}${lineaProx}`;
  } else {
    h = `<span class="chip verde">Libre ahora</span><h3 class="cob-mio-t">${prox ? 'Tu turno empieza a las ' + cobHora(prox.t[0]) : 'No tienes más turnos hoy'}</h3>
      <p class="cob-sub">${prox ? `${prox.p.id} · ${esc(prox.p.n)} · ${esc(prox.t[2])}` : 'Gracias por tu trabajo.'}</p>
      <div class="cob-tarea">Mientras estás libre, coordinación puede mandarte como refuerzo a un punto que se quedó solo. Si te asignan, aparece aquí.</div>`;
  }
  $('#cobMio').innerHTML = h;

  // Qué atender
  const al = [
    ...desc.map(f => `<div class="cob-alerta"><span class="pt" style="background:var(--rojo)"></span><div><b>${f.p.id} · ${esc(f.p.n)} está sin nadie</b><small>${esc(f.t ? f.t[2] : '')}${f.gente.length ? ' · esperaba a ' + f.gente.map(g => esc(cobCorto(g.cod))).join(', ') : ''}</small></div><div class="acc"><button class="mini" data-cob="abrir" data-p="${f.p.id}">Mandar refuerzo</button></div></div>`),
    ...confl.map(x => `<div class="cob-alerta"><span class="pt" style="background:#a974ff"></span><div><b>${esc(cobNombre(x.r.cod))} tiene turno en ${x.falta} min</b><small>Está de refuerzo en ${x.r.punto} y le toca ${x.p.id} a las ${cobHora(x.t[0])}</small></div><div class="acc"><button class="mini" data-cob="mantener" data-cod="${x.r.cod}">Mantener</button><button class="mini" data-cob="quitar" data-cod="${x.r.cod}">Liberar</button></div></div>`),
    ...inc.map(f => `<div class="cob-alerta"><span class="pt" style="background:var(--amarillo)"></span><div><b>${f.p.id} · falta ${f.gente.filter(g => g.conf == null && !g.fuera).map(g => esc(cobCorto(g.cod))).join(', ') || 'gente'}</b><small>${f.estan} de ${f.req} en su puesto · ${esc(f.t ? f.t[2] : '')}</small></div><div class="acc"><button class="mini" data-cob="abrir" data-p="${f.p.id}">Ver</button></div></div>`),
  ];
  $('#cobAlertas').innerHTML = `<b class="cond" style="font-size:24px">Qué atender ahora</b>` + (al.length ? al.join('') : '<div class="cob-alerta"><span class="pt" style="background:var(--verde)"></span><div><b>Todo cubierto</b><small>Cada punto con turno tiene a su gente confirmada.</small></div></div>');

  // Puntos
  $$('#cobSedes button').forEach(b => b.classList.toggle('on', b.dataset.s === cobSede));
  const orden = { descubierta: 0, incompleta: 1, cubierta: 2, libre: 3 };
  const vista = filas.filter(f => cobSede === 'todas' || f.p.sede === cobSede).sort((a, b) => orden[a.est] - orden[b.est]);
  $('#cobLista').innerHTML = vista.map(f => {
    const [et, cl] = COB_EST[f.est];
    const per = [
      ...f.gente.map(g => g.fuera ? `<span class="cob-per fuera"><i>${g.cod}</i>${esc(cobNombre(g.cod))}<small>de refuerzo en ${g.fuera}</small></span>`
        : g.conf != null ? `<span class="cob-per ok" title="${esc(g.tarea)}"><i>${g.cod}</i>${esc(cobNombre(g.cod))}<small>llegó ${cobHora(g.conf)}</small></span>`
        : `<span class="cob-per falta" title="${esc(g.tarea)}"><i>${g.cod}</i>${esc(cobNombre(g.cod))}<small>no ha confirmado</small>${puedeAsignar() ? `<button class="mini" data-cob="llegue" data-k="${f.k}" data-cod="${g.cod}">Llegó</button>` : ''}</span>`),
      ...f.refs.map(r => `<span class="cob-per ref"><i>${r.cod}</i>${esc(cobNombre(r.cod))}<small>refuerzo desde ${cobHora(r.desde)}</small>${puedeAsignar() ? `<button class="mini" data-cob="quitar" data-cod="${r.cod}">Quitar</button>` : ''}</span>`),
    ].join('');
    const abierto = cobAbierto === f.p.id;
    return `<div class="cob-punto est-${f.est}">
      <div class="cob-p-cab"><span class="cob-cod">${f.p.id}</span><div class="cob-p-n"><b>${esc(f.p.n)}</b><small>${SEDES[f.p.sede].nombre} · ${f.p.tipo}${f.t ? ` · ${esc(f.t[2])} · ${cobHora(f.t[0])} a ${cobHora(f.t[1])}` : ''}</small></div><span class="chip ${cl}">${et}</span></div>
      ${per ? `<div class="cob-gente">${per}</div>` : ''}
      <div class="cob-acc">${f.prox ? `<span>Sigue: ${cobHora(f.prox[0])} · ${esc(f.prox[2])} (${f.prox[3].map(([c]) => esc(cobCorto(c))).join(', ')})</span>` : '<span>No tiene más turnos hoy</span>'}
        <span class="der">${puedeAsignar() ? `<button class="mini${abierto ? ' on' : ''}" data-cob="abrir" data-p="${f.p.id}">Refuerzo</button>` : ''}<button class="mini" data-cob="mapa" data-p="${f.p.id}">Ver en el mapa</button><button class="mini" data-cob="plan" data-p="${f.p.id}">Plan del día</button></span></div>
      ${abierto ? `<div class="cob-asignar"><span>Libres ahora:</span>${libres.length ? libres.map(c => `<button class="mini" data-cob="asignar" data-p="${f.p.id}" data-cod="${c}">${c} · ${esc(cobNombre(c))}</button>`).join('') : '<span>No hay nadie libre. Libera a alguien de un punto que tenga gente de más.</span>'}</div>` : ''}
    </div>`;
  }).join('') || '<p class="cob-sub">No hay puntos en esta sede.</p>';

  // Staff libre
  const necesitan = activas.filter(f => f.est !== 'cubierta');
  $('#cobLibres').innerHTML = libres.length ? libres.map(c => {
    const n = cobProximo(c, min);
    return `<div class="cob-libre"><div><b>${c} · ${esc(cobNombre(c))}</b><small>${COB_STAFF[c][1]} · ${n ? `libre hasta las ${cobHora(n.t[0])} (${n.p.id})` : 'libre el resto del día'}</small></div>${puedeAsignar() && necesitan.length ? necesitan.slice(0, 3).map(f => `<button class="mini" data-cob="asignar" data-p="${f.p.id}" data-cod="${c}">→ ${f.p.id}</button>`).join('') : ''}</div>`;
  }).join('') : '<p class="cob-sub">Todo el staff tiene puesto en este momento.</p>';

  // Plan del día
  const sel = $('#cobPlanSel'), opciones = (yo ? [['mio', 'Mi plan del día']] : []).concat(COB_PUNTOS.map(p => [p.id, `${p.id} · ${p.n}`]));
  if (!cobPlan || !opciones.some(o => o[0] === cobPlan)) cobPlan = opciones[0][0];
  sel.innerHTML = opciones.map(([v, t]) => `<option value="${v}"${v === cobPlan ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const bloques = cobPlan === 'mio'
    ? COB_PUNTOS.flatMap(p => p.turnos.filter(t => t[3].some(([c]) => c === yo)).map(t => ({ p, t, quien: esc(t[3].find(([c]) => c === yo)[1]) }))).sort((a, b) => a.t[0] - b.t[0])
    : COB_PUNTOS.find(p => p.id === cobPlan).turnos.map((t, ti) => ({ p: COB_PUNTOS.find(p => p.id === cobPlan), t, quien: personasDelTurno(cobPlan, t, ti) }));
  $('#cobPlan').innerHTML = bloques.length ? bloques.map(({ p, t, quien }) => `<div class="cob-bloque${min >= t[0] && min < t[1] ? ' ahora' : min >= t[1] ? ' paso' : ''}"><b>${cobHora(t[0])} – ${cobHora(t[1])}</b><div>${cobPlan === 'mio' ? `<strong>${p.id} · ${esc(p.n)}</strong> · ` : ''}${esc(t[2])}<small>${quien}</small></div></div>`).join('') : '<p class="cob-sub">No tienes turnos asignados hoy.</p>';
}
// Quién va en cada turno: coordinación y seguridad agregan o quitan personas de la lista del staff
const editaTurnos = () => typeof puedeEditar === 'function' && puedeEditar('turnos');
function personasDelTurno(pid, t, ti) {
  const ed = editaTurnos();
  const chips = t[3].map(([c, ta], j) => `<span class="cob-asig"><i>${esc(c)}</i>${esc(cobNombre(c))}${ta ? ` · ${esc(ta)}` : ''}${ed ? `<button type="button" class="cob-x" data-cob="sacar" data-p="${pid}" data-t="${ti}" data-j="${j}" aria-label="Quitar a ${esc(cobNombre(c))}">×</button>` : ''}</span>`).join('');
  if (!ed) return chips || 'Sin nadie asignado';
  const ya = new Set(t[3].map(([c]) => c));
  const opciones = Object.entries(COB_STAFF).filter(([c]) => !ya.has(c)).map(([c, [n, a]]) => `<option value="${esc(c)}">${esc(n)} · ${esc(a)}</option>`).join('');
  return `${chips || '<span class="cob-sin">Sin nadie asignado</span>'}<select class="cob-agregar" data-p="${pid}" data-t="${ti}" aria-label="Agregar persona a este turno"><option value="">+ Agregar persona…</option>${opciones}<option value="__nueva">+ Persona nueva (escribir el nombre)</option></select>`;
}
function nuevoCodigoStaff(area) {
  const letra = { Traslado: 'T', 'Dirección': 'D' }[area] || 'S';
  let n = 1; while (COB_STAFF[letra + String(n).padStart(2, '0')]) n++;
  return letra + String(n).padStart(2, '0');
}
function guardarTurnos(staffNuevo) {
  if (staffNuevo) guardarComp(CFG('staff'), DATOS.staff.leer());
  guardarComp(CFG('turnos'), DATOS.turnos.leer());
  pintarCobertura();
}
$('#cobertura').addEventListener('change', e => {
  const s = e.target.closest('.cob-agregar'); if (!s || !s.value) return;
  const p = COB_PUNTOS.find(x => x.id === s.dataset.p), t = p && p.turnos[+s.dataset.t]; if (!t) return;
  let cod = s.value, nueva = false;
  if (cod === '__nueva') {
    const nombre = (prompt('Nombre y apellido de la persona') || '').trim(); if (!nombre) { s.value = ''; return; }
    const igual = Object.entries(COB_STAFF).find(([, [n]]) => n.toLowerCase() === nombre.toLowerCase());
    cod = igual ? igual[0] : nuevoCodigoStaff(p.tipo === 'Movilización' ? 'Traslado' : 'Seguridad');
    if (!igual) { COB_STAFF[cod] = [nombre, p.tipo === 'Movilización' ? 'Traslado' : 'Seguridad']; nueva = true; }
  }
  if (!t[3].some(([c]) => c === cod)) t[3].push([cod, '']);
  registrar('🗓️ Turno', `${cobNombre(cod)} → ${p.id} · ${cobHora(t[0])} a ${cobHora(t[1])}`);
  toast(`${cobNombre(cod)} quedó en ${p.id} de ${cobHora(t[0])} a ${cobHora(t[1])}`);
  guardarTurnos(nueva);
});
$('#cobertura').addEventListener('click', e => {
  const sb = e.target.closest('#cobSedes button'); if (sb) { cobSede = sb.dataset.s; pintarCobertura(); return; }
  const b = e.target.closest('[data-cob]'); if (!b) return;
  const a = b.dataset.cob, { min } = cobAhora(), c = estado.cob, quien = estado.usuario ? estado.usuario.nombre.split(' ')[0] : '';
  const punto = id => COB_PUNTOS.find(p => p.id === id);
  if (a === 'llegue') {
    c.conf[b.dataset.k + '#' + b.dataset.cod] = min; cobGuardar();
    const p = b.dataset.k.split('@')[0];
    registrar('📍 Llegó a su puesto', `${cobNombre(b.dataset.cod)} → ${p} ${punto(p).n}`);
    toast(b.dataset.cod === miCodCob() ? 'Coordinación ya sabe que estás en tu puesto' : `${cobNombre(b.dataset.cod)} quedó en su puesto`);
  } else if (a === 'abrir') { cobAbierto = cobAbierto === b.dataset.p ? null : b.dataset.p; if (cobAbierto) setTimeout(() => { const el = $$('#cobLista .cob-asignar')[0]; if (el) el.scrollIntoView({ block: 'nearest' }); }, 50); }
  else if (a === 'asignar') {
    c.refs = c.refs.filter(r => r.cod !== b.dataset.cod); c.refs.push({ cod: b.dataset.cod, punto: b.dataset.p, desde: min, por: quien }); cobGuardar(); cobAbierto = null;
    registrar('🛡️ Refuerzo', `${cobNombre(b.dataset.cod)} → ${b.dataset.p} ${punto(b.dataset.p).n}`);
    toast(`${cobNombre(b.dataset.cod)} va de refuerzo a ${b.dataset.p}`);
  } else if (a === 'quitar' || a === 'volver') {
    const cod = a === 'volver' ? miCodCob() : b.dataset.cod; c.refs = c.refs.filter(r => r.cod !== cod); cobGuardar();
    toast(a === 'volver' ? 'Listo: vuelve a tu puesto y confírmalo' : `${cobNombre(cod)} quedó libre del refuerzo`);
  } else if (a === 'mantener') { const r = c.refs.find(x => x.cod === b.dataset.cod); if (r) r.mantener = true; cobGuardar(); toast(`${cobNombre(b.dataset.cod)} se queda de refuerzo`); }
  else if (a === 'sacar') {
    const p = punto(b.dataset.p), t = p.turnos[+b.dataset.t], [cod] = t[3][+b.dataset.j];
    t[3].splice(+b.dataset.j, 1); guardarTurnos();
    toast(`${cobNombre(cod)} ya no está en ${p.id} de ${cobHora(t[0])} a ${cobHora(t[1])}`); return;
  }
  else if (a === 'plan') { cobPlan = b.dataset.p; pintarCobertura(); $('#cobPlanSel').scrollIntoView({ block: 'center' }); return; }
  else if (a === 'mapa') {
    const p = punto(b.dataset.p); $('#mapa').scrollIntoView();
    setTimeout(() => p.lugar ? mostrarLugar(p.lugar, `${p.id} · ${p.n}`) : elegirSede(p.sede), 300);
    return;
  }
  pintarCobertura();
});
$('#cobPlanSel').addEventListener('change', e => { cobPlan = e.target.value; pintarCobertura(); });
const punto_nombre = id => (COB_PUNTOS.find(p => p.id === id) || { n: '' }).n;
setInterval(pintarCobertura, 30000);

// Resumen para el tablero de Seguridad
function resumenCobertura() {
  cobEstado(); const { min } = cobAhora(); cobSembrar(min);
  const f = cobFilas(min).filter(x => x.est !== 'libre'), sn = f.filter(x => x.est === 'descubierta').length, fg = f.filter(x => x.est === 'incompleta').length;
  return tile(`${f.length - sn - fg}/${f.length}`, 'puntos cubiertos ahora', '#2fd38c', 'ir-cobertura') + tile(sn, sn === 1 ? 'punto sin nadie' : 'puntos sin nadie', '#ff4d5e', 'ir-cobertura', sn > 0)
    + tile(fg, 'con gente por llegar', '#ffd23f', 'ir-cobertura', fg > 0) + tile(cobLibres(min).length, 'libres para reforzar', '#45c8ff', 'ir-cobertura');
}
