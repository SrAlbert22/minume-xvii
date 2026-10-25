// ---------- Mi subdirección: el panel de quien dirige cada equipo ----------
// La subdirección (y la coordinación de cada equipo) entra directo a su gente: el staff de su equipo separado por rol
// (Seguridad y Traslado es un solo equipo), quién está activo, quién no ha entrado,
// quién tiene los avisos al teléfono y los datos que puede editar. Coordinación general (la dirección) ve todo el evento.
// La lista sale de la base (minume_mi_equipo): solo devuelve el equipo de quien la pide.
const GRUPOS_SD = { seguridad: '🛡️ Seguridad y Traslado', asistencia: '🔷 Asistentes de comisión', coordinacion: '⭐ Coordinación', bienestar: '💚 Bienestar', eventos: '🎤 Eventos y Protocolo' };
const sd = { filas: null, vista: null, cargado: 0, cargando: false, error: '', abiertos: new Set() };
function veSubdireccion() { return esDir() && !['coordinacion', 'asistencia', 'todo'].includes(SISTEMA); }   // declarada así porque el arranque la usa antes de llegar aquí

// Todo el staff del equipo: los que tienen código y, en Seguridad y Traslado, también los de la lista del staff
// (Datos del evento → Staff y sus áreas) aunque todavía no tengan código. Se juntan por nombre.
const SIS_DE_AREA = { Seguridad: 'seguridad', Traslado: 'seguridad', 'Dirección': 'seguridad', Bienestar: 'bienestar', 'Eventos y Protocolo': 'eventos' };
function staffDelEquipo(filas) {
  const l = filas.map(p => ({ ...p }));
  for (const [cod, [n, area]] of Object.entries(COB_STAFF)) {
    if ((SIS_DE_AREA[area] || 'seguridad') !== SISTEMA) continue;
    const ya = l.find(p => mismoNombre(p.nombre, n));
    if (ya) ya.cob = cod; else l.push({ nombre: n, rol: 'seguridad', cob: cod, sinCodigo: true, nivel: cod === 'DIR-S' ? 'subdirector' : 'voluntario' });
  }
  for (const p of l) if (!p.cob) { const c = Object.entries(COB_STAFF).find(([, [n]]) => mismoNombre(n, p.nombre)); if (c) p.cob = c[0]; }
  return l;
}
// Lo que le toca a cada persona ahora: su punto y tarea (o el refuerzo), si ya confirmó, su siguiente turno, sus regionales y su comisión
function queLeToca(p) {
  const l = [];
  if (p.cob) {
    cobEstado(); const { min } = cobAhora(), o = cobOcupacion(min)[p.cob], ref = estado.cob.refs.find(r => r.cod === p.cob), prox = cobProximo(p.cob, min);
    if (ref) { const pt = COB_PUNTOS.find(x => x.id === ref.punto); l.push(['📍', `Refuerzo en ${ref.punto}${pt ? ' · ' + pt.n : ''}`, 'sd-ahora']); }
    else if (o) {
      const ok = estado.cob.conf[claveSlot(o.p, o.t) + '#' + p.cob] != null;
      l.push(['📍', `${o.p.id} · ${o.p.n}`, 'sd-ahora'], ['🛠️', `${o.tarea} · hasta las ${cobHora(o.t[1])}`, ''], [ok ? '✅' : '⏳', ok ? 'Ya está en su puesto' : 'No ha confirmado que llegó', ok ? 'sd-verde' : 'sd-amarillo']);
    } else if (p.cob !== 'DIR-S') l.push(['🟢', 'Libre ahora (se puede mandar de refuerzo)', '']);
    if (prox) l.push(['⏭️', `Después: ${cobHora(prox.t[0])} · ${prox.p.id} ${prox.p.n}`, '']);
  }
  const regs = REGIONALES.filter(r => mismoNombre(r.enc, p.nombre));
  if (regs.length) l.push(['🧑‍🤝‍🧑', `Encargado de ${regs.map(r => r.n).join(', ')}`, '']);
  if (p.comision && ASIGNA[p.comision]) l.push(['🔷', `Comisión ${p.comision} · ${ASIGNA[p.comision][1]}`, '']);
  return l;
}

// Todos los turnos del día de una persona (en todos los puntos), en orden de hora
const turnosDe = cod => COB_PUNTOS.flatMap(pt => pt.turnos.filter(t => t[3].some(([c]) => c === cod)).map(t => ({ pt, t, tarea: (t[3].find(([c]) => c === cod) || [])[1] }))).sort((a, b) => a.t[0] - b.t[0]);
function turnosHtml(p) {
  const l = turnosDe(p.cob), { min } = cobAhora();
  const botones = `<div class="sd-turnos-acc">${puedeEditar('turnos') ? `<button class="mini" type="button" data-editar-de="turnos" data-cod="${esc(p.cob)}">✏️ Editar sus turnos</button>` : ''}${puedeEditar('staff') ? `<button class="mini" type="button" data-editar-de="staff" data-cod="${esc(p.cob)}">✏️ Editar sus datos</button>` : ''}</div>`;
  return `<details class="sd-turnos" data-cob="${esc(p.cob)}"${sd.abiertos.has(p.cob) ? ' open' : ''}><summary>🕒 ${l.length ? `Sus turnos de hoy (${l.length})` : 'Sin turnos asignados'}</summary>
    ${l.length ? `<ol>${l.map(({ pt, t, tarea }) => `<li class="${min >= t[0] && min < t[1] ? 'sd-ahora' : t[1] <= min ? 'sd-paso' : ''}"><b>${cobHora(t[0])}–${cobHora(t[1])}</b><span>${esc(pt.id)} · ${esc(pt.n)}${tarea ? `<small>${esc(tarea)}</small>` : ''}</span></li>`).join('')}</ol>` : ''}${botones}</details>`;
}

async function cargarSubdireccion(forzar) {
  if (!veSubdireccion() || sd.cargando || (!forzar && Date.now() - sd.cargado < 60000)) return pintarSubdireccion();
  sd.cargando = true;
  try { sd.filas = await window.MINUME_RPC('minume_mi_equipo', {}); sd.cargado = Date.now(); sd.error = ''; }
  catch (e) { sd.error = navigator.onLine === false ? 'Sin internet: se muestra la última lista.' : e.message; }
  sd.cargando = false; pintarSubdireccion();
}

function pintarSubdireccion() {
  if (!veSubdireccion() || !$('#subdireccion')) return;
  const u = estado.usuario, cargo = cargoDe(u) || 'Coordinación';
  $('#sdTitulo').textContent = `${cargo === 'Subdirección' ? 'Subdirección' : 'Coordinación'} de ${SIS.nombre}`;
  // sin la base (o antes de que responda) se usa la lista del staff que ya bajó la sincronización
  const filas = sd.vista = sd.filas || (window.MINUME_PERSONAL || []).filter(p => p.sistema === SISTEMA).map(p => ({ ...p, yo: p.ref === u.ref }));
  const ahora = Date.now(), activo = p => p.ultima && ahora - Date.parse(p.ultima) < 3 * 60000;
  const conDatos = !!sd.filas, gente = filas.filter(p => !p.prueba), todos = staffDelEquipo(filas), sinCod = todos.filter(p => p.sinCodigo).length;
  const cifra = (n, t, c = '') => `<div class="bus-cifra ${c}"><b>${n}</b><small>${t}</small></div>`;
  const abiertos = avisosPara(SISTEMA).filter(a => !CERRADO(a)).length;
  $('#sdCifras').innerHTML = cifra(todos.filter(p => !p.prueba).length, 'personas en tu equipo', 'azul')
    + (sinCod ? cifra(sinCod, sinCod === 1 ? 'sin código todavía' : 'sin código todavía', 'amarillo') : '')
    + (conDatos ? cifra(gente.filter(activo).length, 'activas ahora', 'verde')
      + cifra(gente.filter(p => !p.usado).length, 'no han entrado nunca', gente.some(p => !p.usado) ? 'rojo' : '')
      + cifra(`${gente.filter(p => p.avisos).length}<span>/${gente.length}</span>`, 'con avisos al teléfono', gente.every(p => p.avisos) ? 'verde' : 'amarillo') : '')
    + cifra(abiertos, abiertos === 1 ? 'aviso abierto para tu equipo' : 'avisos abiertos para tu equipo', abiertos ? 'rojo' : 'verde');
  const q = sinAcentos($('#sdBuscar').value || '');
  const grupos = {};
  const grupoDe = rol => rol === 'traslado' ? 'seguridad' : rol;   // Seguridad y Traslado es un solo equipo
  for (const p of todos) if (!q || sinAcentos(p.nombre).includes(q)) (grupos[grupoDe(p.rol)] = grupos[grupoDe(p.rol)] || []).push(p);
  const orden = Object.keys(grupos).sort((a, b) => (a === 'coordinacion') - (b === 'coordinacion') || a.localeCompare(b));
  $('#sdGrupos').innerHTML = (sd.error ? `<p class="cob-sub">${esc(sd.error)}</p>` : '') + (orden.length ? orden.map(rol => {
    const l = grupos[rol].sort((a, b) => (activo(b) - activo(a)) || a.nombre.localeCompare(b.nombre, 'es'));
    return `<div class="sd-grupo"><div class="sd-grupo-t"><b>${GRUPOS_SD[rol] || esc(rol)}</b><span class="chip">${l.length}</span>${conDatos ? `<small>${l.filter(activo).length} activas ahora</small>` : ''}</div>
      <div class="sd-lista">${l.map(p => {
        const est = p.sinCodigo ? ['', 'Sin código todavía'] : !conDatos ? ['', ''] : activo(p) ? ['verde', 'Activo ahora'] : p.ultima ? ['', `Hoy: ${p.minutos} min · visto ${haceMin(Date.parse(p.ultima))}`] : p.usado ? ['', `Entró ${haceMin(Date.parse(p.usado))} · hoy no`] : ['rojo', 'Nunca ha entrado'];
        const ult = ultimaOrden(p.ref);
        return `<div class="sd-persona"><span class="sd-punto ${est[0]}"></span><div><b>${esc(p.nombre)}${p.yo ? ' (tú)' : ''}</b>
          <small>${p.nivel && p.nivel !== 'voluntario' ? `<b style="color:var(--amarillo)">${NIVELES[p.nivel] || esc(p.nivel)}</b> · ` : ''}${p.comision ? esc(p.comision) + ' · ' : ''}${p.area ? (p.area === 'emocional' ? 'Emocional · ' : 'Físico · ') : ''}${est[1]}${p.prueba ? ' · código de prueba' : ''}</small>
          ${(() => { const t = queLeToca(p); return t.length ? `<ul class="sd-toca">${t.map(([i, x, c]) => `<li class="${c}"><span>${i}</span>${esc(x)}</li>`).join('')}</ul>` : ''; })()}
          ${p.cob && p.cob !== 'DIR-S' ? turnosHtml(p) : ''}
          ${ult ? `<small class="sd-orden">📣 ${esc(ult.que)} · <span class="chip ${EST_ORD[ult.estado][1]}">${EST_ORD[ult.estado][0]}</span> ${horaDR(ult.tE || ult.t)}</small>` : ''}</div>
          ${!p.yo && p.ref ? `<button class="mini sd-mandar" type="button" data-mandar="${esc(p.ref)}">📣 Mandar</button>` : ''}
          ${conDatos && !p.sinCodigo ? `<span class="sd-push ${p.avisos ? 'on' : ''}" title="${p.avisos ? 'Tiene los avisos al teléfono activados' : 'No ha activado los avisos al teléfono: los SOS no le suenan con el teléfono bloqueado'}">${p.avisos ? '📱 ✓' : '📱 ✗'}</span>` : ''}</div>`;
      }).join('')}</div></div>`;
  }).join('') : `<p class="cob-sub">${q ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay códigos para tu equipo. Coordinación general los crea en «Datos del evento → Códigos de acceso».'}</p>`);
  // solo las listas que este equipo edita (las mismas reglas que la base)
  const editables = ORDEN_DATOS.filter(puedeEditar);
  $('#sdEditar').innerHTML = editables.length ? editables.map(k => `<button class="sd-edita" type="button" data-editar="${k}"><span class="acceso-ic">${ico(DATOS[k].icono === 'gente' ? 'grupo' : DATOS[k].icono === 'bandera' ? 'estrella' : DATOS[k].icono === 'bus' ? 'caminar' : DATOS[k].icono)}</span><b>${esc(DATOS[k].titulo)}</b></button>`).join('')
    : '<p class="cob-sub">Tu equipo no tiene listas propias para editar. Lo general lo edita Coordinación general.</p>';
}

$('#sdActualizar').onclick = () => cargarSubdireccion(true);
$('#sdGrupos').addEventListener('click', e => {
  const ed = e.target.closest('[data-editar-de]'); if (!ed) return;
  abrirEditorDatos(ed.dataset.editarDe);
  setTimeout(() => { const b = $('#edBuscar'); if (b) { b.value = ed.dataset.cod; b.dispatchEvent(new Event('input')); } }, 80);
});
$('#sdGrupos').addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details[data-cob]'); if (d) sd.abiertos[d.open ? 'add' : 'delete'](d.dataset.cob); }, true);
$('#sdGrupos').addEventListener('click', e => { const b = e.target.closest('[data-mandar]'); if (b) ventanaMandar((sd.vista || []).find(p => p.ref === b.dataset.mandar)); });
$('#sdBuscar').addEventListener('input', pintarSubdireccion);
setInterval(() => { if (!document.hidden && seccionActual === 'subdireccion') cargarSubdireccion(true); }, 60000);
addEventListener('storage', e => { if (e.key === CLAVE_AVISOS && seccionActual === 'subdireccion') pintarSubdireccion(); });
window.SUBDIR_LISTO = true;
