// =================== Datos editables: cronogramas, asignaciones y listas del evento ===================
// Los datos de ejemplo se pueden cambiar desde la página. Lo editado se guarda en claves compartidas
// ("config.*"); en la versión real son tablas de Supabase y todos lo ven al instante.
const ASISTENTES = {}; // comisión → asistente asignado
const CFG = k => 'config.' + k;
const aHora = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})/); return m ? `${+m[1]}:${m[2]}` : ''; };
const aInputHora = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
const SEDE_OPC = () => Object.entries(SEDES).map(([k, s]) => [k, s.nombre]);
const DATOS = {
  programa: {
    titulo: 'Programa del evento', icono: 'reloj', quien: ['coordinacion'],
    ayuda: 'La agenda que ve todo el staff en «Programa». Cada fila es una actividad.',
    campos: [{ k: 'dia', t: 'Día', tipo: 'opc', opc: () => DIAS_PROG, req: 1 }, { k: 'i', t: 'Empieza', tipo: 'hora', req: 1 }, { k: 'f', t: 'Termina', tipo: 'hora', req: 1 }, { k: 'titulo', t: 'Actividad', req: 1, ancho: 2 }, { k: 'lugar', t: 'Lugar' }, { k: 'para', t: 'Para', tipo: 'opc', opc: () => ['Todos', 'Staff', 'Delegados', 'Seguridad', 'Mesa directiva'].map(x => [x, x]) }],
    leer: () => Object.entries(PROGRAMA).flatMap(([dia, l]) => l.map(([i, f, titulo, lugar, para]) => ({ dia, i, f, titulo, lugar, para }))),
    aplicar: recs => { Object.keys(PROGRAMA).forEach(d => { PROGRAMA[d] = []; }); recs.forEach(r => (PROGRAMA[r.dia] = PROGRAMA[r.dia] || []).push([r.i, r.f, r.titulo, r.lugar || '', r.para || 'Todos'])); Object.values(PROGRAMA).forEach(l => l.sort((a, b) => aMinutos(a[0]) - aMinutos(b[0]))); },
  },
  eventos: {
    titulo: 'Eventos y su horario', icono: 'bandera', quien: ['eventos', 'coordinacion'],
    ayuda: 'Cada ceremonia o actividad con su montaje, horario, lugar y responsable.',
    campos: [{ k: 'dia', t: 'Día', tipo: 'opc', opc: () => DIAS_PROG, req: 1 }, { k: 'n', t: 'Evento', req: 1, ancho: 2 }, { k: 'tipo', t: 'Tipo', tipo: 'opc', opc: () => [['ceremonia', 'Ceremonia'], ['comida', 'Comida'], ['cultura', 'Cultural'], ['registro', 'Registro'], ['foto', 'Foto'], ['reunion', 'Reunión']] }, { k: 'lugar', t: 'Lugar', req: 1 }, { k: 'm', t: 'Montaje desde', tipo: 'hora' }, { k: 'i', t: 'Empieza', tipo: 'hora', req: 1 }, { k: 'f', t: 'Termina', tipo: 'hora', req: 1 }, { k: 'resp', t: 'Responsable' }, { k: 'vip', t: 'Con invitados especiales', tipo: 'si' }],
    leer: () => EV_LISTA.map(e => ({ ...e })),
    aplicar: recs => EV_LISTA.splice(0, EV_LISTA.length, ...recs.map(r => ({ ...r, id: r.id || nuevoId('v'), tipo: r.tipo || 'reunion', m: r.m || r.i }))),
  },
  invitados: {
    titulo: 'Invitados especiales', icono: 'gente', quien: ['eventos', 'coordinacion'],
    ayuda: 'Quién viene a cada evento, cómo saludarle, dónde se sienta y quién le recibe.',
    campos: [{ k: 'ev', t: 'Evento', tipo: 'opc', opc: () => EV_LISTA.map(e => [e.id, `${e.n} · ${(DIAS_PROG.find(([d]) => d === e.dia) || ['', e.dia])[1]}`]), req: 1, ancho: 2 }, { k: 'n', t: 'Nombre', req: 1 }, { k: 'cargo', t: 'Cargo' }, { k: 'trato', t: 'Saludar como' }, { k: 'lugar', t: 'Su lugar' }, { k: 'll', t: 'Llega', tipo: 'hora' }, { k: 'puerta', t: 'Entra por' }, { k: 'recibe', t: 'Le recibe' }, { k: 'nota', t: 'Nota', ancho: 2 }],
    leer: () => INV_LISTA.map(g => ({ ...g })),
    aplicar: recs => INV_LISTA.splice(0, INV_LISTA.length, ...recs.map(r => ({ ...r, id: r.id || nuevoId('g') }))),
  },
  comisiones: {
    titulo: 'Comisiones, salones y asistentes', icono: 'bandera', quien: ['coordinacion'], fijo: true,
    ayuda: 'Dónde sesiona cada comisión y qué asistente la acompaña.',
    campos: [{ k: 'com', t: 'Comisión', solo: 1 }, { k: 'sede', t: 'Sede', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'salon', t: 'Salón', req: 1 }, { k: 'asistente', t: 'Asistente asignado', ancho: 2 }],
    leer: () => COMISIONES.map(([c]) => ({ com: c, sede: (ASIGNA[c] || ['jaragua'])[0], salon: (ASIGNA[c] || ['', ''])[1], asistente: ASISTENTES[c] || '' })),
    aplicar: recs => recs.forEach(r => { ASIGNA[r.com] = [r.sede, r.salon]; ASISTENTES[r.com] = r.asistente || ''; }),
  },
  staff: {
    titulo: 'Staff de Seguridad y Traslado', icono: 'gente', quien: ['seguridad', 'traslado', 'coordinacion'],
    ayuda: 'Las personas que se pueden asignar a los puntos y turnos. El código es corto, por ejemplo S08.',
    campos: [{ k: 'cod', t: 'Código', req: 1, mayus: 1 }, { k: 'nombre', t: 'Nombre', req: 1, ancho: 2 }, { k: 'area', t: 'Equipo', tipo: 'opc', opc: () => ['Seguridad', 'Traslado', 'Dirección'].map(x => [x, x]) }],
    leer: () => Object.entries(COB_STAFF).map(([cod, [nombre, area]]) => ({ cod, nombre, area })),
    aplicar: recs => { Object.keys(COB_STAFF).forEach(k => delete COB_STAFF[k]); recs.forEach(r => { COB_STAFF[String(r.cod).toUpperCase()] = [r.nombre, r.area || 'Seguridad']; }); },
  },
  puntos: {
    titulo: 'Puntos que se deben cubrir', icono: 'mapa', quien: ['seguridad', 'coordinacion'],
    ayuda: 'Los lugares que siempre deben tener a alguien: puertas, pasillos y el camino entre las sedes.',
    campos: [{ k: 'id', t: 'Código', req: 1, mayus: 1, soloViejo: 1 }, { k: 'n', t: 'Nombre del punto', req: 1, ancho: 2 }, { k: 'sede', t: 'Sede', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'tipo', t: 'Tipo', tipo: 'opc', opc: () => ['Puerta', 'Interior', 'Pasillo', 'Movilización', 'Nocturno', 'Perímetro'].map(x => [x, x]) }],
    leer: () => COB_PUNTOS.map(p => ({ id: p.id, n: p.n, sede: p.sede, tipo: p.tipo })),
    aplicar: recs => { const viejos = Object.fromEntries(COB_PUNTOS.map(p => [p.id, p])); COB_PUNTOS.splice(0, COB_PUNTOS.length, ...recs.map(r => { const v = viejos[r.id] || {}; return { ...v, id: String(r.id).toUpperCase(), n: r.n, sede: r.sede, tipo: r.tipo || 'Puerta', turnos: v.turnos || [] }; })); },
  },
  turnos: {
    titulo: 'Turnos y personas asignadas', icono: 'reloj', quien: ['seguridad', 'coordinacion'],
    ayuda: 'Quién va en cada punto y a qué hora. Para poner a dos personas en el mismo turno, agrega dos filas con el mismo punto y horario.',
    campos: [{ k: 'punto', t: 'Punto', tipo: 'opc', opc: () => COB_PUNTOS.map(p => [p.id, `${p.id} · ${p.n}`]), req: 1, ancho: 2 }, { k: 'i', t: 'Desde', tipo: 'hora', req: 1 }, { k: 'f', t: 'Hasta', tipo: 'hora', req: 1 }, { k: 'turno', t: 'Turno', req: 1 }, { k: 'persona', t: 'Persona', tipo: 'opc', opc: () => Object.entries(COB_STAFF).map(([c, [n]]) => [c, `${n} · ${c}`]) }, { k: 'tarea', t: 'Qué hace', ancho: 2 }],
    leer: () => COB_PUNTOS.flatMap(p => p.turnos.flatMap(t => (t[3].length ? t[3] : [['', '']]).map(([persona, tarea]) => ({ punto: p.id, i: cobHora(t[0]), f: cobHora(t[1]), turno: t[2], persona, tarea })))),
    aplicar: recs => {
      COB_PUNTOS.forEach(p => { p.turnos = []; });
      for (const r of recs) {
        const p = COB_PUNTOS.find(x => x.id === r.punto); if (!p) continue;
        const ini = aMinutos(r.i), fin = r.f === '0:00' ? 24 * 60 : aMinutos(r.f);
        let t = p.turnos.find(x => x[0] === ini && x[1] === fin && x[2] === r.turno);
        if (!t) { t = [ini, fin, r.turno, []]; p.turnos.push(t); }
        if (r.persona) t[3].push([r.persona, r.tarea || '']);
      }
      COB_PUNTOS.forEach(p => p.turnos.sort((a, b) => a[0] - b[0]));
    },
  },
  rutas: {
    titulo: 'Rutas de ronda', icono: 'lista', quien: ['seguridad', 'coordinacion'],
    ayuda: 'Cada ruta con cada cuánto se hace y sus puntos en orden, separados por comas.',
    campos: [{ k: 'n', t: 'Ruta', req: 1, ancho: 2 }, { k: 'cada', t: 'Cada (min)', tipo: 'num', req: 1 }, { k: 'puntos', t: 'Puntos en orden (separados por comas)', req: 1, ancho: 3 }],
    leer: () => RUTAS.map(r => ({ id: r.id, n: r.n, cada: r.cada, puntos: r.puntos.join(', '), horario: r.horario })),
    aplicar: recs => RUTAS.splice(0, RUTAS.length, ...recs.map(r => ({ id: r.id || nuevoId('R'), n: r.n, cada: +r.cada || 60, horario: r.horario, puntos: String(r.puntos).split(',').map(x => x.trim()).filter(Boolean) }))),
  },
  autobuses: {
    titulo: 'Movilizaciones a pie', icono: 'bus', quien: ['traslado', 'seguridad', 'coordinacion'],
    ayuda: 'Cada salida de un grupo entre sedes. Si se retrasa, cámbiale el estado y todos lo ven.',
    campos: [{ k: 'h', t: 'Sale', tipo: 'hora', req: 1 }, { k: 'de', t: 'Desde', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'a', t: 'Hacia', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'nota', t: 'Para qué', ancho: 2 }, { k: 'estado', t: 'Estado', tipo: 'opc', opc: () => ['A tiempo', 'Retrasado 10 min', 'Retrasado 20 min', 'Retrasado 30 min', 'Cancelado'].map(x => [x, x]) }],
    leer: () => VIAJES.map(v => ({ ...v })),
    aplicar: recs => VIAJES.splice(0, VIAJES.length, ...recs.map(r => ({ ...r, estado: r.estado || 'A tiempo' })).sort((a, b) => aMinutos(a.h) - aMinutos(b.h))),
  },
  responsables: {
    titulo: 'Responsables por área', icono: 'gente', quien: ['coordinacion'],
    ayuda: 'A quién acudir en cada área. Sin números de teléfono: cada uno se contacta por el canal oficial.',
    campos: [{ k: 'area', t: 'Área', req: 1, ancho: 2 }, { k: 'persona', t: 'Responsable', req: 1, ancho: 2 }],
    leer: () => AREAS.map(([k, area, persona]) => ({ k, area, persona })),
    aplicar: recs => AREAS.splice(0, AREAS.length, ...recs.map(r => [r.k || nuevoId('ar'), r.area, r.persona])),
  },
};
const ORDEN_DATOS = ['programa', 'eventos', 'invitados', 'comisiones', 'staff', 'puntos', 'turnos', 'rutas', 'autobuses', 'responsables'];
const EJEMPLO_DATOS = Object.fromEntries(ORDEN_DATOS.map(k => [k, JSON.parse(JSON.stringify(DATOS[k].leer()))]));
const puedeEditar = k => !!estado.usuario && DATOS[k].quien.includes(estado.usuario.rol);
// Lo guardado antes del cambio de sedes (Dominican Fiesta, Sede 2 y 3) ya no sirve: se usa el ejemplo nuevo
const deSedesViejas = r => Array.isArray(r) && r.some(x => x && ['sede', 'de', 'a'].some(k => x[k] && !SEDES[x[k]]));
function aplicarDatosGuardados() {
  for (const k of ORDEN_DATOS) { let r = leerComp(CFG(k), null); if (deSedesViejas(r)) r = null; DATOS[k].aplicar(r || JSON.parse(JSON.stringify(EJEMPLO_DATOS[k]))); }
}
aplicarDatosGuardados();
function refrescarTodo() {
  try { pintarNuevas(); pintarCobertura(); pintarTraslado(); pintarDatos(); if (estado.usuario) pintarTablero(); $('#contactos').innerHTML = AREAS.map(([, a, p]) => `<div class="dato"><span>${esc(a)}</span><b>${esc(p)}</b></div>`).join(''); if (estado.comision) pintarPanel(); } catch (e) { console.warn(e); }
}

// ---------- Ventana de edición ----------
let edK = null, edRecs = [], edQuitados = [], edRestaurar = false;
function abrirEditorDatos(k) {
  if (!puedeEditar(k)) return toast('Esta parte la edita otro equipo o coordinación');
  edK = k; edRecs = JSON.parse(JSON.stringify(DATOS[k].leer())).map(r => ({ ...r, _viejo: 1 })); edQuitados = []; edRestaurar = false;
  $('#edTitulo').textContent = DATOS[k].titulo; $('#edAyuda').textContent = DATOS[k].ayuda;
  $('#edAgregar').hidden = !!DATOS[k].fijo; $('#edBuscar').value = ''; $('#edEstado').textContent = '';
  $('#edRestaurar').textContent = 'Volver a los datos de ejemplo';
  $('#edPegar').hidden = k !== 'staff'; $('#edPegar').open = false; $('#edPegarTxt').value = '';
  pintarEditorDatos(); $('#editor').hidden = false; document.body.style.overflow = 'hidden';
  setTimeout(() => $('#edBuscar').focus(), 50);
}
function cerrarEditorDatos() { $('#editor').hidden = true; document.body.style.overflow = ''; edK = null; }
function campoHtml(c, r, i) {
  const v = r[c.k] ?? '', id = `ed-${i}-${c.k}`, ro = c.solo || (c.soloViejo && r._viejo);
  let h;
  if (c.tipo === 'opc') h = `<select id="${id}" data-i="${i}" data-k="${c.k}"${ro ? ' disabled' : ''}><option value="">Elige…</option>${c.opc().map(([val, t]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  else if (c.tipo === 'hora') h = `<input id="${id}" type="time" data-i="${i}" data-k="${c.k}" value="${aInputHora(v)}">`;
  else if (c.tipo === 'num') h = `<input id="${id}" type="number" min="1" data-i="${i}" data-k="${c.k}" value="${esc(v)}">`;
  else if (c.tipo === 'si') return `<label class="ed-si" for="${id}"><input id="${id}" type="checkbox" data-i="${i}" data-k="${c.k}"${v ? ' checked' : ''}>${c.t}</label>`;
  else h = `<input id="${id}" data-i="${i}" data-k="${c.k}" value="${esc(v)}"${ro ? ' readonly' : ''}${c.mayus ? ' style="text-transform:uppercase"' : ''}>`;
  return `<div class="ed-campo ancho-${c.ancho || 1}"><label for="${id}">${c.t}${c.req ? ' <i>*</i>' : ''}</label>${h}</div>`;
}
function pintarEditorDatos() {
  const d = DATOS[edK], q = $('#edBuscar').value.toLowerCase().trim();
  const vis = edRecs.map((r, i) => [r, i]).filter(([r]) => !q || Object.values(r).join(' ').toLowerCase().includes(q));
  $('#edCuenta').textContent = `${edRecs.length} ${edRecs.length === 1 ? 'fila' : 'filas'}${q ? ` · ${vis.length} coinciden` : ''}`;
  $('#edLista').innerHTML = vis.length ? vis.map(([r, i]) => `<div class="ed-fila${r._error ? ' con-error' : ''}${r._nuevo ? ' nueva' : ''}" data-fila="${i}"><div class="ed-campos">${d.campos.map(c => campoHtml(c, r, i)).join('')}</div>${d.fijo ? '' : `<button class="ed-quitar" type="button" data-quitar="${i}" aria-label="Quitar esta fila" title="Quitar esta fila"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`}${r._error ? `<p class="ed-error">${esc(r._error)}</p>` : ''}</div>`).join('') : '<p class="cob-sub">Nada coincide con la búsqueda.</p>';
}
const alEditarCampo = e => {
  const x = e.target, i = +x.dataset.i, k = x.dataset.k; if (!k) return;
  const c = DATOS[edK].campos.find(y => y.k === k);
  edRecs[i][k] = x.type === 'checkbox' ? x.checked : c.tipo === 'hora' ? aHora(x.value) : c.mayus ? x.value.toUpperCase() : x.value;
  if (edRecs[i]._error) { delete edRecs[i]._error; x.closest('.ed-fila').classList.remove('con-error'); const p = x.closest('.ed-fila').querySelector('.ed-error'); if (p) p.remove(); }
  $('#edEstado').textContent = 'Cambios sin guardar';
};
$('#edLista').addEventListener('input', alEditarCampo);
$('#edLista').addEventListener('change', alEditarCampo);
$('#edLista').addEventListener('click', e => {
  const b = e.target.closest('[data-quitar]'); if (!b) return;
  const i = +b.dataset.quitar; edQuitados.push(edRecs[i]); edRecs.splice(i, 1); pintarEditorDatos();
  $('#edEstado').innerHTML = `Fila quitada · <button class="mini" type="button" id="edDeshacer">Deshacer</button>`;
});
$('#edEstado').addEventListener('click', e => { if (e.target.id === 'edDeshacer' && edQuitados.length) { edRecs.push(edQuitados.pop()); pintarEditorDatos(); $('#edEstado').textContent = 'Cambios sin guardar'; } });
$('#edBuscar').addEventListener('input', pintarEditorDatos);
$('#edPegarOk').addEventListener('click', () => {
  const equipo = t => /trasl|movil/i.test(t) ? 'Traslado' : /direc|coord/i.test(t) ? 'Dirección' : /segur/i.test(t) ? 'Seguridad' : '';
  const usados = new Set(edRecs.map(r => String(r.cod || '').toUpperCase())), nombres = new Set(edRecs.map(r => String(r.nombre || '').toLowerCase().trim()));
  const codigo = area => { const l = { Traslado: 'T', 'Dirección': 'D' }[area] || 'S'; let n = 1; while (usados.has(l + String(n).padStart(2, '0'))) n++; const c = l + String(n).padStart(2, '0'); usados.add(c); return c; };
  let agregadas = 0;
  for (const linea of $('#edPegarTxt').value.split(/\r?\n/)) {
    const partes = linea.split(/\t|;|,/).map(x => x.trim()).filter(Boolean); if (!partes.length) continue;
    const area = partes.slice(1).map(equipo).find(Boolean) || 'Seguridad', nombre = partes.find(x => !equipo(x) && !/^[A-Z]{1,3}-?\d+$/i.test(x)) || '';
    if (!nombre || nombres.has(nombre.toLowerCase())) continue;
    nombres.add(nombre.toLowerCase()); edRecs.push({ cod: codigo(area), nombre, area, _nuevo: 1 }); agregadas++;
  }
  $('#edPegarTxt').value = ''; pintarEditorDatos();
  $('#edEstado').textContent = agregadas ? `${agregadas} ${agregadas === 1 ? 'persona agregada' : 'personas agregadas'} · falta tocar «Guardar cambios»` : 'No había personas nuevas en la lista';
});
$('#edAgregar').addEventListener('click', () => {
  const d = DATOS[edK], ult = edRecs[edRecs.length - 1] || {}, r = { _nuevo: 1 };
  d.campos.forEach(c => { if (['dia', 'punto', 'sede', 'ev', 'de', 'a', 'tipo', 'area', 'para'].includes(c.k) && ult[c.k] != null) r[c.k] = ult[c.k]; }); // copia lo más común de la fila anterior
  edRecs.push(r); $('#edBuscar').value = ''; pintarEditorDatos(); $('#edEstado').textContent = 'Fila nueva al final';
  const filas = $$('#edLista .ed-fila'); const f = filas[filas.length - 1]; if (f) { f.scrollIntoView({ block: 'center' }); const inp = f.querySelector('input:not([readonly]), select'); if (inp) inp.focus(); }
});
function validar() {
  const d = DATOS[edK]; let malas = 0;
  edRecs.forEach(r => {
    delete r._error;
    const falta = d.campos.filter(c => c.req && (r[c.k] == null || String(r[c.k]).trim() === '')).map(c => c.t);
    if (falta.length) r._error = 'Falta: ' + falta.join(', ');
    else if (r.i && r.f && d.campos.some(c => c.k === 'f') && aMinutos(r.f) <= aMinutos(r.i) && r.f !== '0:00') r._error = 'La hora de terminar debe ser después de la de empezar';
    if (r._error) malas++;
  });
  if (d.campos.some(c => c.k === 'cod')) { const vistos = {}; edRecs.forEach(r => { const c = String(r.cod || '').toUpperCase(); if (c && vistos[c]) { r._error = `El código ${c} está repetido`; malas++; } vistos[c] = 1; }); }
  if (d.campos.some(c => c.k === 'id' && c.soloViejo)) { const vistos = {}; edRecs.forEach(r => { const c = String(r.id || '').toUpperCase(); if (c && vistos[c]) { r._error = `El código ${c} está repetido`; malas++; } vistos[c] = 1; }); }
  return malas;
}
$('#edGuardar').addEventListener('click', () => {
  if (!edRestaurar) {
    const malas = validar();
    if (malas) { pintarEditorDatos(); $('#edEstado').textContent = `Revisa ${malas} ${malas === 1 ? 'fila marcada' : 'filas marcadas'} en rojo`; const f = $('#edLista .con-error'); if (f) f.scrollIntoView({ block: 'center' }); return; }
  }
  const k = edK, limpio = edRecs.map(r => Object.fromEntries(Object.entries(r).filter(([x]) => !x.startsWith('_'))));
  if (edRestaurar) { const ej = JSON.parse(JSON.stringify(EJEMPLO_DATOS[k])); guardarComp(CFG(k), ej); DATOS[k].aplicar(ej); }
  else { guardarComp(CFG(k), limpio); DATOS[k].aplicar(limpio); }
  guardarComp(CFG(k) + '.quien', { por: yoNombre(), t: ahoraMs(), ejemplo: !!edRestaurar });
  registrar('✏️ Datos editados', `${DATOS[k].titulo}${edRestaurar ? ' · volvió a los datos de ejemplo' : ''}`);
  cerrarEditorDatos(); refrescarTodo(); toast(`Guardado: ${DATOS[k].titulo}. Todos lo ven al instante.`);
});
$('#edRestaurar').addEventListener('click', () => {
  if (!edRestaurar) { edRestaurar = true; $('#edRestaurar').textContent = '¿Seguro? Toca «Guardar cambios» para confirmar'; $('#edEstado').textContent = 'Se borrarán tus cambios en esta lista'; return; }
});
$('#edCerrar').addEventListener('click', cerrarEditorDatos);
$('#edCancelar').addEventListener('click', cerrarEditorDatos);
$('#editor').addEventListener('click', e => { if (e.target.id === 'editor') cerrarEditorDatos(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#editor').hidden) cerrarEditorDatos(); });
// Botones «Editar» repartidos en cada sección: solo se ven si a tu equipo le toca editar eso
document.addEventListener('click', e => { const b = e.target.closest('[data-editar]'); if (b) abrirEditorDatos(b.dataset.editar); });
function pintarBotonesEditar() { $$('[data-editar]').forEach(b => { b.hidden = !puedeEditar(b.dataset.editar); }); }

// ---------- «Datos del evento»: todo lo editable en un solo lugar (coordinación) ----------
function pintarDatos() {
  pintarBotonesEditar();
  const sec = $('#datos'); if (!sec || !estado.usuario) return;
  $('#datosGrid').innerHTML = ORDEN_DATOS.filter(puedeEditar).map(k => {
    const d = DATOS[k], n = d.leer().length, q = leerComp(CFG(k) + '.quien', null), cambiado = !!leerComp(CFG(k), null);
    return `<div class="tarjeta datos-card"><div class="datos-cab"><span class="datos-ic">${n}</span><div><b>${d.titulo}</b><small>${d.ayuda}</small></div></div>
      <small class="datos-meta">${cambiado && q && !q.ejemplo ? `Editado por ${esc(q.por)} · ${haceMin(q.t)}` : 'Con los datos de ejemplo'}</small>
      <button class="boton" type="button" data-editar="${k}">Editar</button></div>`;
  }).join('');
}
addEventListener('storage', e => { if (e.key && e.key.startsWith(CLAVE_COMP('config.'))) { aplicarDatosGuardados(); refrescarTodo(); } });
