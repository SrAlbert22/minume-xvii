// ---------- Comunicados de dirección ----------
const COM_TIPO = { info: ['Información', ''], importante: ['Importante', 'amarillo'], urgente: ['Urgente', 'rojo'] };
const COM_PARA = { todos: 'Todo el staff', asistencia: 'Asistencia', seguridad: 'Seguridad y Traslado', bienestar: 'Bienestar', eventos: 'Eventos y Protocolo' };
const COM_PLANTILLAS = [
  ['Cambio de salón', 'importante', 'La comisión ___ cambia al salón ___ a partir de las ___.'],
  ['Cambio de horario', 'importante', 'La sesión de la tarde empieza a las ___ en vez de las ___.'],
  ['Código amarillo', 'urgente', 'Código amarillo en ___. Mantengan a sus comisiones en el salón y esperen instrucciones por este canal.'],
  ['Movilización retrasada', 'info', 'El grupo de las ___ hacia ___ sale con ___ minutos de retraso. Esperen en ___.'],
  ['Recordatorio', 'info', 'Recuerden cerrar la bitácora y reportar las novedades antes de retirarse.'],
];
const leerComs = () => leerComp('comunicados', []);
const comParaMi = m => { if (SISTEMA === 'todo' || SISTEMA === 'coordinacion') return true; return m.para === 'todos' || m.para === SISTEMA; };
// Quién debe leer cada comunicado. En la demo son los códigos de prueba; en la versión real, todo el staff del equipo.
const rosterCom = para => window.MINUME_PERSONAL ? window.MINUME_PERSONAL.filter(p => p.sistema !== 'coordinacion' && (para === 'todos' || p.sistema === para)).map(p => ({ c: 'r:' + p.ref, n: p.nombre })) : Object.entries(CODIGOS).filter(([c]) => { const s = SIS_DE_CODIGO(c); return s && s !== 'coordinacion' && (para === 'todos' || s === para); }).map(([c, u]) => ({ c, n: u.nombre }));
const sinLeer = () => { const yo = yoCod(); if (!yo) return []; return leerComs().filter(m => comParaMi(m) && m.deCod !== yo && !(m.leidos || {})[yo] && diaDR(m.t) === hoyDR()).sort((a, b) => b.t - a.t); };
function marcarLeido(id) {
  const l = leerComs(), m = l.find(x => x.id === id), yo = yoCod(); if (!m || !yo) return;
  m.leidos = m.leidos || {}; m.leidos[yo] = { n: yoNombre(), t: ahoraMs() }; guardarComp('comunicados', l); borrarNotificaciones(['com-' + id]);
  pintarComunicados(); pintarBanner();
}
let comAvisados = new Set(leerComs().map(m => m.id));
function pintarBanner() {
  const b = $('#bannerCom'); if (!b) return;
  const l = sinLeer(); if (!l.length) { b.hidden = true; return; }
  const m = l[0], [tt, cl] = COM_TIPO[m.tipo] || COM_TIPO.info;
  b.className = 'banner-com ' + cl; b.hidden = false;
  b.innerHTML = `<div class="bc-txt"><b>${tt} · ${esc(m.de)}</b><span>${esc(m.texto)}</span><small>${horaDR(m.t)}${l.length > 1 ? ` · y ${l.length - 1} comunicado${l.length > 2 ? 's' : ''} más sin leer` : ''}</small></div><div class="bc-acc"><button class="mini on" data-leido="${m.id}">Leído</button>${l.length > 1 ? '<button class="mini" data-ver-com>Ver todos</button>' : ''}</div>`;
  for (const x of l) if (!comAvisados.has(x.id)) {
    comAvisados.add(x.id);
    if (x.tipo === 'urgente') { if (alertasOn()) { tono(1046, .25); setTimeout(() => tono(1318, .35), 260); } vibrar([300, 150, 300]); notificar('Comunicado urgente', x.texto); }
    else if (x.tipo === 'importante' && alertasOn()) tono(880, .2, .12, 'sine');
  }
}
$('#bannerCom').addEventListener('click', e => {
  const b = e.target.closest('[data-leido]'); if (b) { marcarLeido(b.dataset.leido); toast('Marcado como leído'); return; }
  if (e.target.closest('[data-ver-com]')) $('#comunicados').scrollIntoView();
});
// Mandan comunicados: Coordinación general (a todos o a un equipo) y la dirección de cada equipo (solo a su equipo).
// Cada jefe ve solo los comunicados de su subsecretaría; el panorama general es de Coordinación general.
const puedeComunicar = () => esDir();
function pintarComunicados() {
  const sec = $('#comunicados'); if (!sec || !estado.usuario) return;
  $('#comRedactar').hidden = !puedeComunicar(); $('#comExp').hidden = !puedeComunicar();
  const sel = $('#comPara');
  if (SISTEMA !== 'coordinacion' && SISTEMA !== 'todo' && sel && (sel.options.length !== 1 || sel.value !== SISTEMA)) sel.innerHTML = `<option value="${SISTEMA}">${esc(COM_PARA[SISTEMA] || SIS.nombre)}</option>`;
  const yo = yoCod();
  const l = leerComs().filter(m => comParaMi(m)).sort((a, b) => b.t - a.t).slice(0, 30);
  $('#comLista').innerHTML = l.length ? l.map(m => {
    const [tt, cl] = COM_TIPO[m.tipo] || COM_TIPO.info, le = m.leidos || {}, mio = m.deCod === yo;
    let pie;
    if (puedeComunicar()) {
      const r = rosterCom(m.para), ya = r.filter(p => le[p.c]), faltan = r.filter(p => !le[p.c]);
      pie = `<div class="com-leido"><div class="cv-barra"><i style="width:${r.length ? ya.length / r.length * 100 : 0}%;background:var(--verde)"></i></div><b>Leído por ${ya.length} de ${r.length}</b>${faltan.length ? `<small>Falta: ${faltan.map(p => esc(p.n)).join(', ')}</small>` : '<small style="color:var(--verde)">Todos lo leyeron</small>'}</div>`;
    } else pie = mio ? '<small class="com-meta">Lo enviaste tú</small>' : le[yo] ? `<small class="com-meta" style="color:var(--verde)">✓ Leído a las ${horaDR(le[yo].t)}</small>` : `<button class="boton" data-leido="${m.id}">Leído</button>`;
    return `<div class="tarjeta com-item ${cl}"><div class="com-cab"><span class="chip ${cl}">${tt}</span><span class="chip">Para: ${COM_PARA[m.para] || m.para}</span><small class="com-meta">${esc(m.de)} · ${diaDR(m.t) === hoyDR() ? horaDR(m.t) : diaDR(m.t) + ' ' + horaDR(m.t)}</small></div><p class="com-texto">${esc(m.texto)}</p>${pie}</div>`;
  }).join('') : `<div class="tarjeta"><b>No hay comunicados todavía</b><p class="cob-sub">${puedeComunicar() ? 'Escribe el primero arriba o usa una plantilla.' : 'Cuando dirección envíe algo, te aparece aquí y arriba de la pantalla.'}</p></div>`;
}
$('#comPlant').innerHTML = COM_PLANTILLAS.map(([n], i) => `<button class="mini" data-pl="${i}">${n}</button>`).join('');
$('#comPlant').onclick = e => { const b = e.target.closest('[data-pl]'); if (!b) return; const [, t, x] = COM_PLANTILLAS[+b.dataset.pl]; $('#comTexto').value = x; $('#comTipo').value = t; $('#comTexto').focus(); };
$('#comLista').onclick = e => { const b = e.target.closest('[data-leido]'); if (b) marcarLeido(b.dataset.leido); };
$('#comEnviar').onclick = () => {
  const t = $('#comTexto').value.trim(); if (!t) return $('#comTexto').focus();
  if (/___/.test(t)) return toast('Completa los espacios ___ de la plantilla');
  const l = leerComs(), m = { id: nuevoId('cm'), t: ahoraMs(), deCod: yoCod(), de: yoNombre(), para: $('#comPara').value, tipo: $('#comTipo').value, texto: t, leidos: {} };
  l.push(m); guardarComp('comunicados', l.slice(-60)); comAvisados.add(m.id);
  $('#comTexto').value = ''; registrar('📣 Comunicado', `${COM_PARA[m.para]}: ${t}`);
  toast(`Comunicado enviado a ${COM_PARA[m.para]}`); pintarComunicados();
};
// Demo: el staff de prueba "lee" los comunicados solo, menos una persona, para que se vea quién falta
function demoLeer() {
  if (window.MINUME_PERSONAL) return;   // con el staff real no se inventa nada
  const l = leerComs(); let cambio = false;
  for (const m of l) {
    const r = rosterCom(m.para).filter(p => p.c !== yoCod() && p.c !== m.deCod); r.pop();
    r.forEach((p, i) => { m.leidos = m.leidos || {}; if (!m.leidos[p.c] && ahoraMs() - m.t > 7000 + i * 9000) { m.leidos[p.c] = { n: p.n, t: ahoraMs() }; cambio = true; } });
  }
  if (cambio) { guardarComp('comunicados', l); pintarComunicados(); }
}
