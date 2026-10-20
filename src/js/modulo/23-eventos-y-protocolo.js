// =================== Eventos y Protocolo ===================
// Pensado para usarse rápido: cada evento tiene UN botón con el siguiente paso, y cada invitado UN botón para marcar que llegó.
// Eventos, horarios e invitados son de EJEMPLO; en la versión real salen de la agenda oficial y se guardan en Supabase.
const EV_LISTA = [
  { id: 'v1', dia: '2026-11-14', n: 'Reunión general del staff', tipo: 'reunion', lugar: 'Anacaona · Jaragua', m: '18:00', i: '19:00', f: '20:00', resp: 'Coordinación general' },
  { id: 'v2', dia: '2026-11-15', n: 'Registro de delegados', tipo: 'registro', lugar: 'Lobby · Renaissance Jaragua', m: '6:00', i: '6:30', f: '8:00', resp: 'Equipo de lobby · Carla' },
  { id: 'v3', dia: '2026-11-15', n: 'Ceremonia de apertura', tipo: 'ceremonia', lugar: 'Teatro La Fiesta · Jaragua', m: '6:00', i: '8:00', f: '9:30', resp: 'Producción · Jonathan', vip: true },
  { id: 'v4', dia: '2026-11-15', n: 'Almuerzo general', tipo: 'comida', lugar: 'Malecón Terrace', m: '11:30', i: '12:30', f: '14:00', resp: 'Alimentos · Diana' },
  { id: 'v5', dia: '2026-11-15', n: 'Noche cultural', tipo: 'cultura', lugar: 'Malecón Terrace', m: '17:30', i: '20:00', f: '22:00', resp: 'Producción · Jonathan' },
  { id: 'v6', dia: '2026-11-16', n: 'Almuerzo general', tipo: 'comida', lugar: 'Malecón Terrace', m: '11:30', i: '12:30', f: '14:00', resp: 'Alimentos · Diana' },
  { id: 'v7', dia: '2026-11-16', n: 'Clausura y premiación', tipo: 'ceremonia', lugar: 'Teatro La Fiesta · Jaragua', m: '14:30', i: '17:00', f: '19:00', resp: 'Producción · Jonathan', vip: true },
  { id: 'v8', dia: '2026-11-16', n: 'Foto oficial', tipo: 'foto', lugar: 'Lobby · Renaissance Jaragua', m: '18:30', i: '19:00', f: '19:30', resp: 'Comunicación · Abel' },
];
const EV_LISTA_MONTAJE = {
  ceremonia: ['Tarima y presídium armados', 'Sonido y micrófonos probados', 'Banderas y banner en su lugar', 'Sillas reservadas para invitados', 'Agua en la mesa principal', 'Guion en manos del maestro de ceremonia'],
  comida: ['Mesas y sillas listas', 'Comida servida a tiempo', 'Agua y vasos', 'Zona separada para el staff'],
  cultura: ['Tarima y luces', 'Sonido probado', 'Orden de presentaciones confirmado', 'Camerino listo'],
  registro: ['Mesas de registro armadas', 'Listas de delegados a mano', 'Señalización hacia los salones'],
  foto: ['Gradas o escalones listos', 'Fotógrafo confirmado', 'Banner de fondo'],
  reunion: ['Proyector y pantalla', 'Sillas para el staff', 'Lista de asistencia'],
};
const INV_LISTA = [
  { id: 'g1', ev: 'v3', n: 'Elena Marte Rosario', cargo: 'Ministra de Educación (ejemplo)', trato: 'Señora Ministra', ll: '7:40', puerta: 'Entrada VIP, lateral norte', recibe: 'Laura', lugar: 'Presídium · centro', nota: 'Llega con dos escoltas. Entregarle el programa impreso.' },
  { id: 'g2', ev: 'v3', n: 'Carmen Lluberes', cargo: 'Coordinadora de la ONU en el país (ejemplo)', trato: 'Señora Coordinadora', ll: '7:30', puerta: 'Entrada VIP, lateral norte', recibe: 'Laura', lugar: 'Presídium · 2', nota: 'Dará unas palabras de 3 minutos.' },
  { id: 'g3', ev: 'v3', n: 'Ramón Ureña Castillo', cargo: 'Rector universitario (ejemplo)', trato: 'Señor Rector', ll: '7:25', puerta: 'Entrada VIP, lateral norte', recibe: 'Marcos', lugar: 'Presídium · 3', nota: 'Prefiere entrar por la rampa.' },
  { id: 'g4', ev: 'v3', n: 'Julio César Abreu', cargo: 'Viceministro de Juventud (ejemplo)', trato: 'Señor Viceministro', ll: '7:35', puerta: 'Lobby principal', recibe: 'Marcos', lugar: 'Presídium · 4', nota: '' },
  { id: 'g5', ev: 'v3', n: 'Ana Lucía Féliz', cargo: 'Secretaria General de MINUME XVII', trato: 'Señora Secretaria General', ll: '7:00', puerta: 'Lobby principal', recibe: 'Coordinación', lugar: 'Presídium · 5', nota: 'Abre la ceremonia después del himno.' },
  { id: 'g6', ev: 'v3', n: 'Miguel Ángel Tejada', cargo: 'Senador (ejemplo)', trato: 'Honorable Senador', ll: '7:45', puerta: 'Lobby principal', recibe: 'Sofía', lugar: 'Primera fila · A1', nota: 'Confirmado a última hora.' },
  { id: 'g7', ev: 'v3', n: 'Pedro Almonte', cargo: 'Director del colegio anfitrión (ejemplo)', trato: 'Señor Director', ll: '7:15', puerta: 'Lobby principal', recibe: 'Sofía', lugar: 'Primera fila · A2', nota: '' },
  { id: 'g8', ev: 'v3', n: 'Rosa Inés Durán', cargo: 'Patrocinadora principal (ejemplo)', trato: 'Señora Durán', ll: '7:30', puerta: 'Lobby principal', recibe: 'Sofía', lugar: 'Primera fila · A3', nota: 'Entregarle la placa de agradecimiento al final.' },
  { id: 'g9', ev: 'v7', n: 'Julio César Abreu', cargo: 'Viceministro de Juventud (ejemplo)', trato: 'Señor Viceministro', ll: '16:30', puerta: 'Entrada VIP, lateral norte', recibe: 'Laura', lugar: 'Presídium · centro', nota: 'Entrega el premio a la mejor delegación.' },
  { id: 'g10', ev: 'v7', n: 'Ana Lucía Féliz', cargo: 'Secretaria General de MINUME XVII', trato: 'Señora Secretaria General', ll: '16:00', puerta: 'Lobby principal', recibe: 'Coordinación', lugar: 'Presídium · 2', nota: 'Discurso de clausura.' },
  { id: 'g11', ev: 'v7', n: 'Pedro Almonte', cargo: 'Director del colegio anfitrión (ejemplo)', trato: 'Señor Director', ll: '16:40', puerta: 'Lobby principal', recibe: 'Sofía', lugar: 'Presídium · 3', nota: '' },
];
const EST_EV = { pendiente: ['Por montar', '#8a96b8'], montaje: ['Montando', '#ffb547'], listo: ['Listo', '#45c8ff'], curso: ['En curso', '#2fd38c'], fin: ['Terminó', '#6c7aa3'] };
const PASOS_EV = ['pendiente', 'montaje', 'listo', 'curso', 'fin'];
const BOTON_EV = { pendiente: 'Empezar montaje', montaje: 'Ya está listo', listo: 'Empezó el evento', curso: 'Terminó' };
const PROBLEMAS_EV = ['Sonido o micrófono', 'Pantalla o luces', 'Mesas o sillas', 'Falta personal', 'Invitado o protocolo', 'Otro'];
const leerEv = () => leerComp('eventos', {});
const leerInv = () => leerComp('invitados', {});
const estEv = e => leerEv()[e.id] || { est: 'pendiente', checks: [] };
const iniciales2 = n => n.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();
let evDia = null, evProblema = null, invEvento = null;
function guardarEv(id, cambios) { const o = leerEv(); o[id] = { ...(o[id] || { est: 'pendiente', checks: [] }), ...cambios, t: ahoraMs(), por: yoNombre() }; guardarComp('eventos', o); }
function avisoEv(e) {
  const { dia, min } = partesDR(ahoraEvento()), s = estEv(e);
  if (e.dia !== dia || s.est === 'fin') return '';
  if (['pendiente', 'montaje'].includes(s.est) && min >= aMinutos(e.i) - 15 && min < aMinutos(e.f)) return `<div class="ev-aviso rojo">${min >= aMinutos(e.i) ? 'Ya debía haber empezado' : `Empieza en ${aMinutos(e.i) - min} min`} y todavía no está listo.</div>`;
  if (s.est === 'pendiente' && min >= aMinutos(e.m)) return `<div class="ev-aviso">El montaje debía empezar a las ${e.m}.</div>`;
  if (s.est === 'curso' && min > aMinutos(e.f) + 10) return `<div class="ev-aviso">Debía terminar a las ${e.f}. Si ya terminó, márcalo.</div>`;
  return '';
}
function tarjetaEv(e) {
  const s = estEv(e), [tEst, col] = EST_EV[s.est], paso = PASOS_EV.indexOf(s.est), lista = EV_LISTA_MONTAJE[e.tipo] || [], hechos = (s.checks || []).length;
  return `<div class="tarjeta ev-card${s.problema ? ' con-problema' : ''}" style="--c:${col}">
    <div class="ev-cab"><div class="ev-hora"><b>${e.i}</b><small>a ${e.f}</small></div><div class="ev-info"><b>${e.n}${e.vip ? ' <span class="chip amarillo">Con invitados</span>' : ''}</b><small>${e.lugar} · ${e.resp} · montaje desde las ${e.m}</small></div><span class="chip" style="color:${col};border-color:${col}88">${tEst}</span></div>
    <div class="ev-pasos">${PASOS_EV.map((k, n) => `<span class="${n < paso ? 'hecho' : n === paso ? 'ahora' : ''}"><i></i>${EST_EV[k][0]}</span>`).join('')}</div>
    ${avisoEv(e)}
    ${s.problema ? `<div class="ev-problema"><div><b>Problema: ${esc(s.problema.tipo)}</b><small>${s.problema.nota ? esc(s.problema.nota) + ' · ' : ''}${esc(s.problema.por || '')} · ${haceMin(s.problema.t)} · coordinación ya lo sabe</small></div><button class="mini on" data-ev="resuelto" data-id="${e.id}">Ya se resolvió</button></div>` : ''}
    ${s.est === 'montaje' && lista.length ? `<div class="ev-lista"><b>Lista de montaje · ${hechos} de ${lista.length}</b>${lista.map((t, n) => `<button class="${(s.checks || []).includes(n) ? 'ok' : ''}" data-ev="check" data-id="${e.id}" data-n="${n}"><i></i>${t}</button>`).join('')}</div>` : ''}
    <div class="ev-acc">${s.est !== 'fin' ? `<button class="boton ev-btn" data-ev="avanzar" data-id="${e.id}">${BOTON_EV[s.est]}</button>` : `<span class="cob-sub" style="margin:0">Terminó${s.t ? ' a las ' + horaDR(s.t) : ''}</span>`}
      ${paso > 0 ? `<button class="mini" data-ev="atras" data-id="${e.id}">Deshacer</button>` : ''}${s.est !== 'fin' && !s.problema ? `<button class="mini ev-mini-rojo" data-ev="problema" data-id="${e.id}">Tengo un problema</button>` : ''}</div>
    ${evProblema === e.id ? `<div class="ev-elige"><b>¿Qué pasa?</b><div>${PROBLEMAS_EV.map(p => `<button class="mini" data-ev="tipo" data-id="${e.id}" data-t="${p}">${p}</button>`).join('')}</div><input id="evNota" placeholder="Detalle (opcional): qué falta o qué se dañó"><small class="cob-sub">Toca el tipo de problema y coordinación recibe el aviso al instante.</small></div>` : ''}
  </div>`;
}
function pintarEventos() {
  const sec = $('#eventos'); if (!sec || !estado.usuario) return;
  if (escribiendo(sec)) return;
  const { dia } = partesDR(ahoraEvento());
  if (!evDia) evDia = DIAS_PROG.some(([d]) => d === dia) ? dia : '2026-11-15';
  $('#evDias').innerHTML = DIAS_PROG.map(([d, t]) => `<button data-d="${d}" class="${d === evDia ? 'on' : ''}">${t}${d === dia ? ' · hoy' : ''}</button>`).join('');
  const lista = EV_LISTA.filter(e => e.dia === evDia).sort((a, b) => aMinutos(a.i) - aMinutos(b.i));
  const st = lista.map(estEv);
  $('#evResumen').innerHTML = `<span class="chip verde">${st.filter(s => s.est === 'curso').length} en curso</span><span class="chip">${st.filter(s => s.est === 'listo').length} listos</span><span class="chip amarillo">${st.filter(s => s.est === 'montaje').length} montando</span>${st.some(s => s.problema) ? `<span class="chip rojo">${st.filter(s => s.problema).length} con problema</span>` : ''}<span class="chip">${st.filter(s => s.est === 'fin').length} terminados</span>`;
  $('#evLista').innerHTML = lista.map(tarjetaEv).join('') || '<p class="cob-sub">No hay eventos este día.</p>';
}
$('#evDias').onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; evDia = b.dataset.d; pintarEventos(); };
$('#evLista').onclick = e => {
  const b = e.target.closest('[data-ev]'); if (!b) return;
  const ev = EV_LISTA.find(x => x.id === b.dataset.id), s = estEv(ev), a = b.dataset.ev;
  if (a === 'avanzar') {
    const sig = PASOS_EV[PASOS_EV.indexOf(s.est) + 1]; guardarEv(ev.id, { est: sig });
    registrar('🎤 Evento', `${ev.n}: ${EST_EV[sig][0]}`); toast(`${ev.n}: ${EST_EV[sig][0].toLowerCase()}`);
  } else if (a === 'atras') guardarEv(ev.id, { est: PASOS_EV[Math.max(0, PASOS_EV.indexOf(s.est) - 1)] });
  else if (a === 'check') { const c = new Set(s.checks || []), n = +b.dataset.n; c.has(n) ? c.delete(n) : c.add(n); guardarEv(ev.id, { checks: [...c] }); if (c.size === (EV_LISTA_MONTAJE[ev.tipo] || []).length) toast('Lista completa: toca «Ya está listo»'); }
  else if (a === 'problema') { evProblema = evProblema === ev.id ? null : ev.id; pintarEventos(); setTimeout(() => $('#evNota') && $('#evNota').scrollIntoView({ block: 'nearest' }), 30); return; }
  else if (a === 'tipo') {
    const nota = ($('#evNota') && $('#evNota').value.trim()) || '';
    guardarEv(ev.id, { problema: { tipo: b.dataset.t, nota, t: ahoraMs(), por: yoNombre() } }); evProblema = null;
    enviarAviso('coordinacion', { tipo: `Evento · ${b.dataset.t}`, texto: `${ev.n}${nota ? ': ' + nota : ''}`, donde: ev.lugar, sede: '', por: yoNombre() });
    registrar('⚠️ Problema en evento', `${ev.n} · ${b.dataset.t}${nota ? ': ' + nota : ''}`); toast('Coordinación ya sabe del problema');
  } else if (a === 'resuelto') { guardarEv(ev.id, { problema: null }); registrar('✅ Problema resuelto', ev.n); toast('Marcado como resuelto'); }
  pintarEventos(); pintarInvitados();
};

// ---------- Invitados especiales ----------
const evConInvitados = () => EV_LISTA.filter(e => INV_LISTA.some(g => g.ev === e.id));
function pintarInvitados() {
  const sec = $('#invitados'); if (!sec || !estado.usuario) return;
  if (escribiendo($('#invLista'))) return;
  const evs = evConInvitados(), { dia, min } = partesDR(ahoraEvento());
  if (!invEvento) { const prox = evs.find(e => e.dia > dia || (e.dia === dia && aMinutos(e.f) > min)); invEvento = (prox || evs[0]).id; }
  $('#invEventos').innerHTML = evs.map(e => `<button data-e="${e.id}" class="${e.id === invEvento ? 'on' : ''}">${e.n} · ${DIAS_PROG.find(([d]) => d === e.dia)[1]}</button>`).join('');
  const st = leerInv(), q = ($('#invBuscar').value || '').toLowerCase().trim();
  const todos = INV_LISTA.filter(g => g.ev === invEvento), vienen = todos.filter(g => (st[g.id] || {}).est !== 'no');
  const llegaron = vienen.filter(g => ['llego', 'sentado'].includes((st[g.id] || {}).est)).length, sentados = vienen.filter(g => (st[g.id] || {}).est === 'sentado').length;
  $('#invConteo').innerHTML = `<div class="inv-num"><b>${llegaron}</b> de ${vienen.length} llegaron · <b>${sentados}</b> en su lugar</div><div class="cv-barra"><i style="width:${vienen.length ? llegaron / vienen.length * 100 : 0}%;background:var(--verde)"></i></div>`;
  const vista = todos.filter(g => !q || [g.n, g.cargo, g.lugar, g.recibe].join(' ').toLowerCase().includes(q)).sort((a, b) => aMinutos(a.ll) - aMinutos(b.ll));
  $('#invLista').innerHTML = vista.map(g => {
    const s = st[g.id] || {}, e = s.est;
    const boton = e === 'no' ? `<span class="chip">No vendrá</span><button class="mini" data-inv="limpiar" data-id="${g.id}">Deshacer</button>`
      : e === 'sentado' ? `<span class="chip verde">✓ En su lugar · ${horaDR(s.t)}</span><button class="mini" data-inv="limpiar" data-id="${g.id}">Deshacer</button>`
      : e === 'llego' ? `<button class="boton ev-btn" data-inv="sentado" data-id="${g.id}">Ya está en su lugar</button><small class="cob-sub" style="margin:0">Llegó a las ${horaDR(s.t)}</small>`
      : `<button class="boton ev-btn" data-inv="llego" data-id="${g.id}">Llegó</button><button class="mini" data-inv="no" data-id="${g.id}">No vendrá</button>`;
    return `<div class="tarjeta inv-card ${e || ''}"><div class="inv-av">${iniciales2(g.n)}</div><div class="inv-info"><b>${g.n}</b><small>${g.cargo}</small>
      <div class="inv-datos"><span>Saludar como<b>${g.trato}</b></span><span>Su lugar<b>${typeof asientoDe === 'function' && asientoDe(g.ev, g.n) ? `Asiento ${asientoDe(g.ev, g.n)} · ` : ''}${g.lugar}</b></span><span>Llega<b>${g.ll} · ${g.puerta}</b></span><span>La recibe<b>${g.recibe}</b></span></div>
      ${g.nota ? `<p class="inv-nota">${g.nota}</p>` : ''}</div><div class="inv-acc">${boton}</div></div>`;
  }).join('') || '<p class="cob-sub">Nadie coincide con esa búsqueda.</p>';
}
$('#invEventos').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; invEvento = b.dataset.e; pintarInvitados(); };
$('#invBuscar').oninput = pintarInvitados;
$('#invLista').onclick = e => {
  const b = e.target.closest('[data-inv]'); if (!b) return;
  const st = leerInv(), g = INV_LISTA.find(x => x.id === b.dataset.id), a = b.dataset.inv;
  st[g.id] = a === 'limpiar' ? { est: null, t: ahoraMs(), por: yoNombre() } : { est: a, t: ahoraMs(), por: yoNombre() };
  guardarComp('invitados', st);
  if (a === 'llego') { registrar('🎤 Invitado llegó', `${g.n} · ${g.cargo}`); toast(`${g.trato} ya llegó`); }
  if (a === 'sentado') toast(`${g.n} está en su lugar`);
  pintarInvitados();
};
function tableroEventos() {
  const { dia, min } = partesDR(ahoraEvento()), hoy = EV_LISTA.filter(e => e.dia === dia), st = leerInv();
  const ahora = hoy.find(e => estEv(e).est === 'curso'), sig = hoy.filter(e => !['curso', 'fin'].includes(estEv(e).est)).sort((a, b) => aMinutos(a.i) - aMinutos(b.i))[0];
  const prob = EV_LISTA.filter(e => estEv(e).problema).length, inv = INV_LISTA.filter(g => g.ev === (ahora || sig || {}).id), lleg = inv.filter(g => ['llego', 'sentado'].includes((st[g.id] || {}).est)).length;
  const caja = (t, e) => e ? `<div class="tarjeta"><span class="chip">${t}</span><b class="cond" style="font-size:28px;display:block;margin-top:8px">${e.n}</b><small class="cob-sub">${e.i} a ${e.f} · ${e.lugar}</small><div style="margin-top:10px"><span class="chip" style="color:${EST_EV[estEv(e).est][1]}">${EST_EV[estEv(e).est][0]}</span></div><button class="boton" data-acc="ir-eventos" style="margin-top:12px">Ir a Eventos de hoy</button></div>` : '';
  return `<div class="tiles">${tile(hoy.filter(e => estEv(e).est === 'fin').length + '/' + hoy.length, 'eventos de hoy terminados', '#2fd38c', 'ir-eventos')}${tile(prob, prob === 1 ? 'evento con problema' : 'eventos con problema', '#ff4d5e', 'ir-eventos', prob > 0)}${tile(inv.length ? `${lleg}/${inv.length}` : '—', 'invitados llegaron', '#f472b6', 'ir-invitados')}${tile(hoy.filter(e => estEv(e).est === 'listo').length, 'listos para empezar', '#45c8ff', 'ir-eventos')}</div>
    <div class="rejilla r2">${caja('Ahora', ahora) || caja('Lo siguiente', sig) || '<div class="tarjeta"><b class="cond" style="font-size:26px">No hay eventos hoy</b><p class="cob-sub">Mira el programa de los otros días en Eventos de hoy.</p><button class="boton" data-acc="ir-eventos" style="margin-top:12px">Ver eventos</button></div>'}${ahora && sig ? caja('Lo siguiente', sig) : '<div class="tarjeta"><b class="cond" style="font-size:24px">Cómo se usa</b><p class="cob-sub">Cada evento tiene un solo botón con el siguiente paso: <b>Empezar montaje → Ya está listo → Empezó → Terminó</b>. Si algo falla, toca <b>Tengo un problema</b> y coordinación lo sabe al instante.</p></div>'}</div>`;
}
