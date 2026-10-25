// MINUME XVII · Bienestar: casos y cola de triaje · Albert Silvestre
// ---------- Bienestar: casos y cola de triaje ----------
// Cada caso es una atención en la lista protegida (solo Bienestar y Coordinación general la leen) con prioridad,
// categoría y estado. Los avisos que escalan otros equipos esperan arriba hasta que alguien les hace el triaje;
// al cerrarse el caso, quien lo reportó ve «Resuelto» o «Derivado al 911», pero nunca los datos de salud.
const PRIO = {
  emergencia: { n: 'Emergencia', d: 'Llamar al 911', c: '#ff3b4e', r: 4 },
  urgente: { n: 'Urgente', d: 'Atender ya', c: '#ff8a3d', r: 3 },
  prioritaria: { n: 'Prioritaria', d: 'En menos de 20 min', c: '#ffd23f', r: 2 },
  rutina: { n: 'Rutinaria', d: 'Puede esperar', c: '#2fd38c', r: 1 },
};
const PASOS_CASO = [['triaje', 'Recibido'], ['atencion', 'En atención'], ['seguimiento', 'Seguimiento']];
const AREA_TXT = { medico: ['Médica', 'Síntomas, golpes, alergias'], fisico: ['Física', 'Cansancio, comida, calor'], emocional: ['Emocional', 'Ansiedad, llanto, estrés'] };
const prioDe = x => PRIO[x.prio] ? x.prio : 'rutina';
const pasoDe = x => x.est || 'atencion';
const codigoDe = x => x.codigo || 'AT-' + String(x.id).slice(-4).toUpperCase();   // las atenciones de antes no tenían número de caso
const TR_SVG = {
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2', mas: 'M12 5v14M5 12h14', doc: 'M7 3h7l5 5v13H7zM14 3v5h5M9.5 13h5M9.5 16.5h3.5',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  foto: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', alerta: 'M12 3l10 18H2zM12 10v5M12 18h.01', x: 'M6 6l12 12M18 6L6 18',
};
const trIco = (k, t = 18) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TR_SVG[k]}"/></svg>`;
const minDesde = ms => Math.max(0, Math.round((ahoraMs() - ms) / 60000));
const esBien = () => !!estado.usuario && estado.usuario.rol === 'bienestar';

// ---- Personas: delegados de la lista de acreditación y el staff ----
let personasCache = null, personasDe = null;
function personasBien() {
  const staff = window.MINUME_PERSONAL || Object.entries(GAFETES).map(([id, g]) => ({ ref: id, nombre: g.n, rol: g.rol }));
  if (personasCache && personasDe === DELEGADOS.length + staff.length) return personasCache;
  personasDe = DELEGADOS.length + staff.length;
  personasCache = DELEGADOS.map(d => ({ id: d.id, n: d.n, es: 'Delegado', com: d.com, del: d.del || '', col: d.col || '' }))
    .concat(staff.map(p => ({ id: String(p.ref), n: p.nombre, es: 'Staff', com: '', del: (ROLES[p.rol] || [''])[0], col: '' })));
  personasCache.forEach(p => { p.k = norm(`${p.n} ${p.id} ${p.com} ${p.del} ${p.col}`); });
  return personasCache;
}
const buscarPersonas = q => { q = norm(q.trim()); if (q.length < 2) return []; return personasBien().filter(p => p.k.includes(q)).slice(0, 8); };
// Lee un gafete: el de un delegado (M17D…) o el de alguien del staff (M17…)
function personaDeQR(txt) {
  const m = /^M17D\.(D-\d{3,5})\.([A-Z0-9]{6})$/.exec((txt || '').trim());
  if (m) return firma('D.' + m[1]) === m[2] ? personasBien().find(p => p.id === m[1]) || null : null;
  const r = validarQR(txt); if (r.mal && r.nivel === 'rojo') return null;
  const g = GAFETES[r.id]; return g ? { id: r.id, n: g.n, es: 'Staff', com: g.com || '', del: (ROLES[g.rol] || [''])[0], col: '' } : null;
}

// ---- Alergias y alertas médicas ----
const leerAlertas = () => leerBien().filter(x => esAlerta(x) && !x.borrado);
const alertasDe = p => !p ? [] : leerAlertas().filter(a => (a.pid && a.pid === p.id) || norm(a.nombre) === norm(p.n || p.nombre || ''));
function guardarBienItem(x) { const l = leerBien(), i = l.findIndex(y => y.id === x.id); i < 0 ? l.push(x) : (l[i] = x); guardarComp('atenciones', l); }

// ---- Fotos para el expediente (tabla de fotos, clave bie.<id del caso>) ----
const claveFotoBien = id => 'bie.' + String(id).toLowerCase().replace(/[^a-z0-9_-]/g, '');
const fotoBien = id => fotos.get(claveFotoBien(id)) || null;
async function pedirFotosBien(ids, alLlegar) {
  if (!window.MINUME_RPC) return;
  const faltan = ids.map(claveFotoBien).filter(k => !fotos.has(k) && !fotosPidiendo.has(k)).slice(0, 40); if (!faltan.length) return;
  faltan.forEach(k => fotosPidiendo.add(k));
  try { const r = await window.MINUME_RPC('minume_foto_leer', { p_claves: faltan }) || {}; faltan.forEach(k => fotos.set(k, r[k] || null)); alLlegar && alLlegar(); }
  catch {} finally { faltan.forEach(k => fotosPidiendo.delete(k)); }
}
async function subirFotoBien(id, data) {
  fotos.set(claveFotoBien(id), data);
  if (!window.MINUME_RPC) return;
  try { await window.MINUME_RPC('minume_foto_guardar', { p_clave: claveFotoBien(id), p_data: data }); }
  catch (e) { toast(navigator.onLine === false ? 'Sin internet: la foto no se pudo subir' : 'La foto no se pudo guardar en la nube'); }
}
const tomarFoto = document.createElement('input'); tomarFoto.type = 'file'; tomarFoto.accept = 'image/*'; tomarFoto.hidden = true; document.body.appendChild(tomarFoto);
let fotoListo = null;
tomarFoto.addEventListener('change', async () => {
  const f = tomarFoto.files && tomarFoto.files[0], cb = fotoListo; tomarFoto.value = ''; fotoListo = null;
  if (!f || !cb) return;
  try { cb(await achicarFoto(f)); } catch { toast('No se pudo leer la foto'); }
});
const pedirFoto = cb => { fotoListo = cb; tomarFoto.click(); };

// ---- Lo que hay en la cola ----
function colaTriaje() {
  const casos = leerAtenciones(), ligados = new Set(casos.map(x => x.aviso).filter(Boolean));
  const reportes = avisosPara('bienestar').filter(a => !CERRADO(a) && !ligados.has(a.id));
  const abiertos = casos.filter(x => !x.sale).sort((a, b) => PRIO[prioDe(b)].r - PRIO[prioDe(a)].r || a.llega - b.llega);
  return { casos, reportes, abiertos };
}
function resumenTriaje() {
  const { casos, reportes, abiertos } = colaTriaje(), hoy = hoyDR();
  return {
    emergencias: abiertos.filter(x => prioDe(x) === 'emergencia').length + reportes.filter(esUrgente).length,
    activos: abiertos.length + reportes.length, reportes: reportes.length,
    atencion: abiertos.filter(x => pasoDe(x) === 'atencion').length,
    alergias: leerAlertas().length,
    resueltos: casos.filter(x => x.sale && diaDR(x.sale) === hoy).length,
  };
}

// ---- Pintar la sección ----
let trVer = 'activos', trCerrando = null;
function tarjetaReporte(a) {
  const lugar = a.salon ? 'Salón ' + a.salon : a.donde || a.sede || '', urg = esUrgente(a);
  return `<article class="tr-caso tr-reporte${urg ? ' tr-urgente' : ''}" style="--p:${urg ? PRIO.emergencia.c : '#7da2ff'}">
    <div class="tr-caso-cab"><div class="tr-quien"><small>Reporta ${esc(NOMBRE_SIS[a.de] || a.de)} · ${esc(a.por || '')}</small><b>${esc(a.tipo)}</b><span>${esc(a.texto || '')}</span></div><div class="tr-min"><b>${minDesde(a.t)}</b><small>min</small></div></div>
    <div class="tr-linea">${trIco('pin', 15)}<span>${esc(lugar || 'Sin lugar')}${a.comision ? ' · ' + esc(a.comision) : ''}</span><span class="tr-estado">${EST_AVISO[a.estado][0]}</span></div>
    <div class="tr-botones"><button class="boton" type="button" data-tr="triaje" data-id="${a.id}">Hacer triaje</button>${a.estado === 'camino' ? '' : `<button class="boton sec" type="button" data-tr="camino" data-id="${a.id}">Voy en camino</button>`}</div>
  </article>`;
}
function pasosHtml(x) {
  const i = PASOS_CASO.findIndex(([k]) => k === pasoDe(x));
  return `<ol class="tr-pasos">${PASOS_CASO.map(([, t], j) => `<li class="${j < i || x.sale ? 'hecho' : j === i ? 'aqui' : ''}">${t}</li>`).join('')}<li class="${x.sale ? 'aqui' : ''}">${x.sale ? esc(x.salida || 'Cerrado') : 'Cerrado'}</li></ol>`;
}
function tarjetaCaso(x) {
  const p = PRIO[prioDe(x)], al = alertasDe({ id: x.pid, n: x.nombre }), foto = fotoBien(x.id), paso = pasoDe(x);
  const sig = paso === 'triaje' ? ['atencion', 'Empezar a atender'] : paso === 'atencion' ? ['seguimiento', 'Pasar a seguimiento'] : null;
  const min = x.sale ? Math.round((x.sale - x.llega) / 60000) : minDesde(x.llega);
  return `<article class="tr-caso${x.sale ? ' tr-cerrado' : ''}" style="--p:${p.c}" data-caso="${x.id}">
    <div class="tr-caso-cab">
      <button class="tr-av" type="button" data-tr="foto" data-id="${x.id}" aria-label="Foto de ${esc(x.nombre)}">${foto ? `<img src="${foto}" alt="">` : iniciales(x.nombre)}</button>
      <div class="tr-quien"><small>${esc(codigoDe(x))} · ${horaDR(x.llega)}</small><b>${esc(x.nombre)}</b><span>${esc(x.persona || '')}${x.com ? ' · ' + esc(x.com) : ''}${x.del ? ' · ' + esc(x.del) : ''}</span></div>
      <div class="tr-min"><b>${min}</b><small>${x.sale ? 'min en total' : 'min'}</small></div>
    </div>
    <div class="tr-tags"><span class="tr-prio">${p.n}</span><span class="tr-cat">${(AREA_TXT[x.area] || AREA_TXT.medico)[0]}</span><span>${esc(x.motivo || '')}</span></div>
    ${al.length ? `<div class="tr-alerta">${trIco('alerta', 16)}<span><b>Alergia o alerta:</b> ${al.map(a => esc(a.que)).join(' · ')}</span></div>` : ''}
    <div class="tr-linea">${trIco('pin', 15)}<span>${esc(x.donde || 'Sin lugar')}</span>${x.encargado ? `<span class="tr-quien-at">Lo atiende ${esc(x.encargado.split(' ')[0])}</span>` : ''}</div>
    ${x.que ? `<p class="tr-nota">${esc(x.que)}${x.hizo ? ` <span>· Se hizo: ${esc(x.hizo)}</span>` : ''}</p>` : x.hizo ? `<p class="tr-nota"><span>Se hizo: ${esc(x.hizo)}</span></p>` : ''}
    ${pasosHtml(x)}
    ${x.sale ? `<div class="tr-botones"><button class="boton sec" type="button" data-tr="exp" data-id="${x.id}">${trIco('doc', 16)} Expediente PDF</button></div>`
      : trCerrando === x.id ? `<div class="tr-cierre"><label for="trSal">¿Cómo terminó?</label><select id="trSal">${AT_SALIDA.map(s => `<option>${esc(s)}</option>`).join('')}</select>
        <label for="trHizo">Qué se hizo</label><textarea id="trHizo" rows="2" placeholder="Agua, reposo, respiración, se llamó a…">${esc(x.hizo || '')}</textarea>
        <div class="tr-botones"><button class="boton" type="button" data-tr="cerrar-ok" data-id="${x.id}">Cerrar caso</button><button class="boton sec" type="button" data-tr="cerrar-no">Cancelar</button></div></div>`
      : `<div class="tr-botones">${sig ? `<button class="boton" type="button" data-tr="paso" data-e="${sig[0]}" data-id="${x.id}">${sig[1]}</button>` : ''}<button class="boton sec" type="button" data-tr="cerrar" data-id="${x.id}">Cerrar caso</button>
        <select class="tr-cambiar" data-tr-prio="${x.id}" aria-label="Cambiar la gravedad">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}"${k === prioDe(x) ? ' selected' : ''}>${v.n}</option>`).join('')}</select>
        <button class="mini" type="button" data-tr="exp" data-id="${x.id}">${trIco('doc', 14)} PDF</button></div>`}
  </article>`;
}
function pintarCasos() {
  if (!esBien() || !$('#casos')) return;
  const r = resumenTriaje();
  $('#trTiles').innerHTML = tile(r.emergencias, 'emergencias', PRIO.emergencia.c, '', r.emergencias > 0) + tile(r.activos, 'casos activos', '#ffd23f', '') + tile(r.atencion, 'en atención', '#45c8ff', '') + tile(r.alergias, 'con alergias', '#ff8a3d', '') + tile(r.resueltos, 'cerrados hoy', '#2fd38c', '');
  $$('#trVer button').forEach(b => b.classList.toggle('on', b.dataset.v === trVer));
  const al = leerAlertas();
  $('#trAlCuenta').textContent = al.length;
  if (!escribiendo($('#trAlergiasCaja'))) $('#trAlLista').innerHTML = al.length ? al.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(a => `<div class="tr-al"><div><b>${esc(a.nombre)}</b><small>${esc(a.que)}${a.com ? ' · ' + esc(a.com) : ''}</small></div><button class="mini" type="button" data-al-quitar="${a.id}" aria-label="Quitar la alerta de ${esc(a.nombre)}">Quitar</button></div>`).join('') : '<p class="cob-sub">No hay alergias registradas todavía.</p>';
  if (escribiendo($('#trCola'))) return;
  const { casos, reportes } = colaTriaje();
  // el voluntario ve los reportes nuevos (para tomarlos), los casos sin encargado y los que atiende él
  const esMio = x => !esVol() || !x.encargado || sinAcentos(x.encargado) === sinAcentos(yoNombre());
  const abiertos = colaTriaje().abiertos.filter(esMio);
  let h;
  if (trVer === 'activos') h = reportes.map(tarjetaReporte).join('') + abiertos.map(tarjetaCaso).join('') || '<div class="tr-vacio"><b>No hay casos activos</b><span>Cuando un equipo escale un caso a Bienestar, aparece aquí al instante.</span></div>';
  else { const hoy = hoyDR(), l = casos.filter(x => x.sale && diaDR(x.sale) === hoy && (!esVol() || (x.encargado && esMio(x)))).sort((a, b) => b.sale - a.sale); h = l.map(tarjetaCaso).join('') || '<div class="tr-vacio"><b>Todavía no se ha cerrado ningún caso hoy</b></div>'; }
  $('#trCola').innerHTML = h;
  pedirFotosBien(casos.filter(x => !x.sale || trVer === 'cerrados').map(x => x.id), () => pintarCasos());
}

// ---- Cambios desde la cola ----
function pasoCaso(x, est) { x.est = est; (x.hist = x.hist || []).push([est, ahoraMs(), yoNombre()]); if (est === 'atencion') x.encargado = yoNombre(); }
function cerrarAvisoDeCaso(x) {
  if (x.aviso) cambiarAviso(x.aviso, /Derivado al 9-?1-?1/.test(x.salida || '') ? 'derivado' : 'resuelto');
}
$('#trCola').addEventListener('change', e => {
  const s = e.target.closest('[data-tr-prio]'); if (!s) return;
  const x = leerAtenciones().find(y => y.id === s.dataset.trPrio); if (!x) return;
  s.blur(); x.prio = s.value; (x.hist = x.hist || []).push(['Gravedad: ' + PRIO[x.prio].n, ahoraMs(), yoNombre()]); guardarBienItem(x);
  if (x.prio === 'emergencia') avisarEmergencia(x);
  toast(`Gravedad cambiada a ${PRIO[x.prio].n}`); pintarCasos(); pintarTablero();
});
$('#trCola').addEventListener('click', async e => {
  const b = e.target.closest('[data-tr]'); if (!b) return;
  const a = b.dataset.tr, id = b.dataset.id;
  if (a !== 'cerrar' && $('#trCola').contains(document.activeElement)) document.activeElement.blur();   // si no, la cola no se repinta
  if (a === 'triaje') { const av = leerAvisos().find(y => y.id === id); return av && ventanaCaso({ aviso: av }); }
  if (a === 'camino') { cambiarAviso(id, 'camino'); toast('Quien lo reportó ve que vas en camino'); pintarCasos(); pintarTablero(); return; }
  if (a === 'cerrar-no') { trCerrando = null; pintarCasos(); return; }
  const x = leerAtenciones().find(y => y.id === id); if (!x) return;
  if (a === 'foto') { const f = fotoBien(x.id); return f ? verFotoBien(x) : pedirFoto(async d => { await subirFotoBien(x.id, d); toast('Foto guardada en el expediente'); pintarCasos(); }); }
  if (a === 'exp') return exportarExpedienteCaso(x);
  if (a === 'paso') { pasoCaso(x, b.dataset.e); guardarBienItem(x); if (x.aviso) cambiarAviso(x.aviso, 'atencion'); registrar('Caso', `${codigoDe(x)}: ${PASOS_CASO.find(([k]) => k === b.dataset.e)[1]}`); pintarCasos(); pintarTablero(); return; }
  if (a === 'cerrar') { trCerrando = x.id; pintarCasos(); setTimeout(() => $('#trSal') && $('#trSal').focus(), 30); return; }
  if (a === 'cerrar-ok') {
    x.sale = ahoraMs(); x.salida = $('#trSal').value; x.hizo = $('#trHizo').value.trim(); trCerrando = null;
    (x.hist = x.hist || []).push(['Cerrado: ' + x.salida, x.sale, yoNombre()]); guardarBienItem(x); cerrarAvisoDeCaso(x);
    if (/Derivado al 9-?1-?1/.test(x.salida || '') && !x.ambulancia) avisarEmergencia(x);
    registrar('Caso cerrado', `${codigoDe(x)} · ${x.motivo} · ${x.salida}`);
    toast(`Caso ${codigoDe(x)} cerrado`); pintarCasos(); pintarTablero(); pintarAtenciones();
  }
});
$('#trVer').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; trVer = b.dataset.v; trCerrando = null; if ($('#trCola').contains(document.activeElement)) document.activeElement.blur(); pintarCasos(); };
$('#trNuevo').onclick = () => ventanaCaso({});
$('#trEscanear').onclick = () => ventanaCaso({ escanear: true });

// Emergencia: Seguridad y Coordinación reciben un SOS para abrir paso a la ambulancia (sin datos de salud)
function avisarEmergencia(x) {
  if (x.ambulancia) return; x.ambulancia = true; guardarBienItem(x);
  enviarAviso('seguridad', { tipo: 'SOS · Emergencia de salud', texto: 'Bienestar llamó al 911: abrir paso a la ambulancia', comision: x.com || '', donde: x.donde || '', sede: '', por: yoNombre() });
}

// ---- Alertas médicas ----
$('#trAlGuardar').onclick = () => {
  const nom = $('#trAlNombre').value.trim(), que = $('#trAlQue').value.trim();
  if (!nom) return $('#trAlNombre').focus(); if (!que) return $('#trAlQue').focus();
  const p = personasBien().find(y => norm(y.n) === norm(nom) || y.id.toLowerCase() === nom.toLowerCase());
  guardarBienItem({ id: nuevoId('al'), tipo: 'alerta', nombre: p ? p.n : nom, pid: p ? p.id : '', com: p ? p.com : '', que, por: yoNombre(), t: ahoraMs() });
  $('#trAlNombre').value = ''; $('#trAlQue').value = ''; toast(`Alerta guardada para ${p ? p.n : nom}`); pintarCasos(); pintarTablero();
};
$('#trAlLista').addEventListener('click', e => {
  const b = e.target.closest('[data-al-quitar]'); if (!b) return;
  const x = leerAlertas().find(y => y.id === b.dataset.alQuitar); if (!x || !confirm(`¿Quitar la alerta de ${x.nombre}?`)) return;
  x.borrado = true; x.tBorrado = ahoraMs(); x.borradoPor = yoNombre(); guardarBienItem(x); pintarCasos();
});
$('#trAlNombre').addEventListener('focus', () => { if (!$('#trPersonas').children.length) $('#trPersonas').innerHTML = personasBien().map(p => `<option value="${esc(p.n)}">${esc(p.id)}${p.com ? ' · ' + esc(p.com) : ''}</option>`).join(''); });

// ---- Ver la foto en grande ----
function verFotoBien(x) {
  const d = fotoBien(x.id); if (!d) return;
  const v = document.createElement('div'); v.className = 'sos-velo on push-velo foto-velo'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = `<div class="tarjeta"><img src="${d}" alt="Foto de ${esc(x.nombre)}"><b class="cond" style="font-size:26px">${esc(x.nombre)}</b><p>${esc(codigoDe(x))} · ${esc(x.persona || '')}${x.com ? ' · ' + esc(x.com) : ''}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="boton sec" type="button" data-f="cambiar">Cambiar foto</button><button class="boton" type="button" data-f="cerrar">Cerrar</button></div></div>`;
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b && e.target !== v) return; v.remove();
    if (b && b.dataset.f === 'cambiar') pedirFoto(async f => { await subirFotoBien(x.id, f); toast('Foto cambiada'); pintarCasos(); });
  });
  document.body.appendChild(v);
}

// ---- Nuevo caso: quién, qué le pasa, qué tan grave y dónde ----
function ventanaCaso({ aviso = null, escanear = false }) {
  if (!esBien()) return;
  const nc = { p: null, area: null, motivo: null, prio: aviso && esUrgente(aviso) ? 'emergencia' : null, donde: aviso ? (aviso.salon ? 'Salón ' + aviso.salon : aviso.donde || aviso.sede || '') : '', notas: aviso ? aviso.texto || '' : '', foto: null };
  let lector = null;
  const v = document.createElement('div'); v.className = 'sos-velo on push-velo tr-velo'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Nuevo caso');
  v.innerHTML = `<div class="tarjeta tr-hoja">
    <div class="tr-hoja-cab"><div><small>${aviso ? `Reportado por ${esc(NOMBRE_SIS[aviso.de] || aviso.de)} · ${esc(aviso.tipo)}` : 'Bienestar'}</small><b>Nuevo caso</b></div><button class="tr-x" type="button" data-n="cerrar" aria-label="Cerrar">${trIco('x', 20)}</button></div>
    <div class="tr-bloque"><div class="tr-paso"><span>1</span>¿Quién es?</div><div id="ncQuien"></div></div>
    <div class="tr-bloque"><div class="tr-paso"><span>2</span>¿Qué le pasa?</div><div class="tr-areas">${Object.entries(AREA_TXT).map(([k, [n, d]]) => `<button type="button" data-area="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div><div id="ncMotivos" class="tr-motivos"></div></div>
    <div class="tr-bloque"><div class="tr-paso"><span>3</span>¿Qué tan grave es?</div><div class="tr-prios">${Object.entries(PRIO).reverse().map(([k, p]) => `<button type="button" data-prio="${k}" style="--p:${p.c}"><b>${p.n}</b><small>${p.d}</small></button>`).join('')}</div>
      <div id="ncEmerg" class="tr-emerg" hidden><b>Llama al 911 ahora</b><span>Al abrir el caso, Seguridad y Coordinación reciben la alerta para abrir paso a la ambulancia.</span><a class="boton" href="tel:911">${trIco('tel', 16)} Llamar al 911</a></div></div>
    <div class="tr-bloque"><div class="tr-paso"><span>4</span>¿Dónde está?</div><input id="ncDonde" placeholder="Salón, pasillo o punto de bienestar" value="${esc(nc.donde)}"><div id="ncLugares" class="tr-motivos"></div>
      <label for="ncNotas">Qué se ve (opcional)</label><textarea id="ncNotas" rows="2" placeholder="Corto: qué le pasa y desde cuándo">${esc(nc.notas)}</textarea>
      <div class="tr-foto-fila"><button class="boton sec" type="button" data-n="foto">${trIco('foto', 16)} Foto para el expediente</button><span id="ncFotoTxt" class="cob-sub">Opcional. Ayuda a reconocer a la persona.</span></div></div>
    <div class="tr-hoja-pie"><button class="boton tr-abrir" type="button" data-n="abrir">Abrir caso</button></div></div>`;
  const pintarQuien = () => {
    const box = v.querySelector('#ncQuien');
    if (nc.p) {
      const al = alertasDe(nc.p);
      box.innerHTML = `<div class="tr-persona"><div class="tr-av">${nc.foto ? `<img src="${nc.foto}" alt="">` : iniciales(nc.p.n)}</div><div><b>${esc(nc.p.n)}</b><small>${esc(nc.p.es)}${nc.p.com ? ' · ' + esc(nc.p.com) : ''}${nc.p.del ? ' · ' + esc(nc.p.del) : ''}</small></div><button class="mini" type="button" data-n="otra">Cambiar</button></div>
        ${al.length ? `<div class="tr-alerta grande">${trIco('alerta', 18)}<span><b>Tiene alergia o alerta médica:</b> ${al.map(a => esc(a.que)).join(' · ')}<br>Revísala antes de darle comida, bebida o primeros auxilios.</span></div>` : '<p class="cob-sub">Sin alergias registradas.</p>'}`;
      pintarLugares(); return;
    }
    box.innerHTML = `<div class="tr-buscar"><input id="ncBuscar" placeholder="Nombre, comisión o ID del gafete" autocomplete="off"><button class="boton sec" type="button" id="ncQR">${trIco('qr', 16)} Escanear</button></div>
      <div class="tr-escaner" id="ncVisor" hidden><video id="ncVideo" playsinline muted></video><div class="visor-msg" id="ncVisorMsg">La cámara está apagada.</div></div><div id="ncRes" class="tr-res"></div>`;
    lector = crearEscaner(v.querySelector('#ncVideo'), v.querySelector('#ncVisorMsg'), v.querySelector('#ncQR'), txt => {
      const p = personaDeQR(txt); if (!p) return toast('Ese QR no es un gafete de MINUME XVII');
      pitido(true); elegir(p);
    });
    v.querySelector('#ncQR').addEventListener('click', () => { v.querySelector('#ncVisor').hidden = false; });
    if (escanear) { escanear = false; v.querySelector('#ncVisor').hidden = false; lector.abrir(); }
  };
  const elegir = p => { if (lector) lector.cerrar(); lector = null; nc.p = p; pintarQuien(); };
  const pintarMotivos = () => {
    v.querySelectorAll('[data-area]').forEach(b => b.classList.toggle('on', b.dataset.area === nc.area));
    v.querySelector('#ncMotivos').innerHTML = nc.area ? (AT_MOTIVOS[nc.area] || []).map(m => `<button type="button" class="mini${m === nc.motivo ? ' on' : ''}" data-motivo="${esc(m)}">${esc(m)}</button>`).join('') : '';
  };
  const pintarPrio = () => { v.querySelectorAll('[data-prio]').forEach(b => b.classList.toggle('on', b.dataset.prio === nc.prio)); v.querySelector('#ncEmerg').hidden = nc.prio !== 'emergencia'; };
  function pintarLugares() {
    const sal = nc.p && nc.p.com && ASIGNA[nc.p.com] ? `Salón ${ASIGNA[nc.p.com][1]}` : null;
    v.querySelector('#ncLugares').innerHTML = ['Punto de bienestar', sal, 'Lobby', 'Pasillo'].filter(Boolean).map(t => `<button type="button" class="mini" data-lugar="${esc(t)}">${esc(t)}</button>`).join('');
  }
  const cerrar = () => { if (lector) lector.cerrar(); v.remove(); };
  v.addEventListener('input', e => {
    if (e.target.id === 'ncBuscar') {
      const q = e.target.value, r = buscarPersonas(q);
      v.querySelector('#ncRes').innerHTML = r.map(p => `<button type="button" class="tr-res-item" data-pid="${esc(p.id)}"><b>${esc(p.n)}</b><small>${esc(p.es)}${p.com ? ' · ' + esc(p.com) : ''}${p.del ? ' · ' + esc(p.del) : ''} · ${esc(p.id)}</small>${alertasDe(p).length ? '<span class="tr-res-al">Alergia</span>' : ''}</button>`).join('')
        + (q.trim().length > 2 ? `<button type="button" class="tr-res-item manual" data-manual="1"><b>Usar «${esc(q.trim())}»</b><small>No está en la lista: escribir el nombre a mano</small></button>` : '');
    }
  });
  v.addEventListener('click', e => {
    if (e.target === v) return cerrar();
    const t = e.target.closest('[data-n],[data-pid],[data-manual],[data-area],[data-motivo],[data-prio],[data-lugar]'); if (!t) return;
    if (t.dataset.pid) return elegir(personasBien().find(p => p.id === t.dataset.pid));
    if (t.dataset.manual) { const n = v.querySelector('#ncBuscar').value.trim(); return elegir({ id: '', n, es: 'Otro', com: '', del: '', col: '' }); }
    if (t.dataset.area) { nc.area = t.dataset.area; nc.motivo = null; return pintarMotivos(); }
    if (t.dataset.motivo) { nc.motivo = t.dataset.motivo; return pintarMotivos(); }
    if (t.dataset.prio) { nc.prio = t.dataset.prio; return pintarPrio(); }
    if (t.dataset.lugar) { v.querySelector('#ncDonde').value = t.dataset.lugar; return; }
    const n = t.dataset.n;
    if (n === 'cerrar') return cerrar();
    if (n === 'otra') { nc.p = null; return pintarQuien(); }
    if (n === 'foto') return pedirFoto(d => { nc.foto = d; v.querySelector('#ncFotoTxt').textContent = 'Foto lista ✓'; if (nc.p) pintarQuien(); });
    if (n === 'abrir') {
      if (!nc.p) { toast('Falta: ¿quién es?'); const b = v.querySelector('#ncBuscar'); return b && b.focus(); }
      if (!nc.area) return toast('Falta: ¿qué le pasa? (Médica, Física o Emocional)');
      if (!nc.prio) return toast('Falta: ¿qué tan grave es?');
      const l = leerAtenciones(), num = l.filter(x => x.codigo).length + 1, t0 = ahoraMs();
      const x = { id: nuevoId('at'), codigo: 'C-' + String(num).padStart(3, '0'), area: nc.area, nombre: nc.p.n, pid: nc.p.id, persona: nc.p.es === 'Otro' ? 'Otro' : nc.p.es, com: nc.p.com || '', del: nc.p.del || '', col: nc.p.col || '',
        motivo: nc.motivo || 'Otro', prio: nc.prio, est: 'triaje', que: v.querySelector('#ncNotas').value.trim(), hizo: '', donde: v.querySelector('#ncDonde').value.trim(), seguir: false,
        llega: t0, sale: null, por: yoNombre(), hist: [['triaje', t0, yoNombre()]], aviso: aviso ? aviso.id : null };
      guardarBienItem(x);
      if (aviso) cambiarAviso(aviso.id, 'atencion');
      if (x.prio === 'emergencia') avisarEmergencia(x);
      if (nc.foto) subirFotoBien(x.id, nc.foto);
      registrar('Caso abierto', `${x.codigo} · ${PRIO[x.prio].n} · ${x.motivo}`);
      cerrar(); trVer = 'activos'; toast(`Caso ${x.codigo} abierto · ${PRIO[x.prio].n}`); pintarCasos(); pintarTablero(); pintarAtenciones();
    }
  });
  document.body.appendChild(v);
  pintarQuien(); pintarMotivos(); pintarPrio();
  if (!escanear) setTimeout(() => { const b = v.querySelector('#ncBuscar'); b && b.focus(); }, 60);
}

// ---- Expediente en PDF (con la línea gráfica de MINUME y la foto) ----
async function exportarExpedienteCaso(x) {
  if (!window.exportarExpediente) return toast('No se pudo preparar el expediente');
  await pedirFotosBien([x.id]);
  const p = PRIO[prioDe(x)], com = (COMISIONES.find(c => c[0] === x.com) || [])[1] || '';
  const hist = (x.hist || [[pasoDe(x), x.llega, x.por]]).map(([e, t, por]) => [horaDR(t), (PASOS_CASO.find(([k]) => k === e) || [, e])[1], por || '']);
  window.exportarExpediente({
    codigo: codigoDe(x), nombre: x.nombre, persona: x.persona || '', id: x.pid || '', com: x.com || '', comNombre: com, del: x.del || '', col: x.col || '',
    area: (AREA_TXT[x.area] || AREA_TXT.medico)[0], motivo: x.motivo || '', prio: p.n, prioDesc: p.d, prioColor: p.c,
    estado: x.sale ? 'Cerrado' : (PASOS_CASO.find(([k]) => k === pasoDe(x)) || [, ''])[1],
    fecha: new Date(x.llega).toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo', day: 'numeric', month: 'long', year: 'numeric' }),
    llega: horaDR(x.llega), sale: x.sale ? horaDR(x.sale) : '', duracion: x.sale ? Math.round((x.sale - x.llega) / 60000) + ' min' : '', salida: x.salida || '',
    donde: x.donde || '', que: x.que || '', hizo: x.hizo || '', encargado: x.encargado || x.por || '', abrio: x.por || '',
    alergias: alertasDe({ id: x.pid, n: x.nombre }).map(a => a.que), hist, foto: fotoBien(x.id), autor: yoNombre(),
  });
}

// ---- Después del evento: borrar todos los datos de salud (subdirección de Bienestar o Coordinación general) ----
const puedeBorrarSalud = () => !!estado.usuario && (SISTEMA === 'coordinacion' || (SISTEMA === 'bienestar' && esDir()));
function pintarBorrarSalud() { const c = $('#atBorrar'); if (c) c.hidden = !puedeBorrarSalud(); }
$('#atBorrarBtn').onclick = async () => {
  if (!puedeBorrarSalud()) return;
  const l = leerBien(), casos = l.filter(x => !esAlerta(x));
  if (!l.length) return toast('No hay datos de salud guardados');
  if ((prompt(`Se van a borrar ${casos.length} casos y ${l.length - casos.length} alertas médicas, con sus fotos, en todos los teléfonos. No se puede deshacer.

Escribe BORRAR para confirmar.`) || '').trim().toUpperCase() !== 'BORRAR') return toast('No se borró nada');
  const b = $('#atBorrarBtn'); b.disabled = true; toast('Borrando…');
  let fotosMal = 0;
  if (window.MINUME_RPC) for (const x of casos) { try { await window.MINUME_RPC('minume_foto_borrar', { p_clave: claveFotoBien(x.id) }); fotos.delete(claveFotoBien(x.id)); } catch { fotosMal++; } }
  guardarComp('atenciones', []);
  registrar('Datos de salud', `Se borraron ${casos.length} casos y ${l.length - casos.length} alertas`);
  b.disabled = false; pintarCasos(); pintarAtenciones(); pintarTablero();
  toast(fotosMal ? `Casos borrados. ${fotosMal} fotos no se pudieron borrar: vuelve a intentarlo con internet.` : 'Listo: se borraron todos los datos de salud');
};
pintarBorrarSalud();
addEventListener('storage', e => { if (e.key === CLAVE_COMP('atenciones') || e.key === CLAVE_AVISOS) { pintarCasos(); } });
setInterval(() => { if (seVe($('#trCola'))) pintarCasos(); }, 20000);
