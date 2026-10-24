// ---------- Regionales: pase de lista de los delegados, mañana y noche ----------
// No hay autobuses (reunión del 21 de octubre): el staff llega el 14, las regionales el 15 con su encargado y todo es a pie.
// Cada regional tiene un encargado fijo del staff. Cada mañana y cada noche el encargado marca a cada delegado cuando
// baja al lobby y al final confirma «regional completa». Solo la dirección ve las 18 de un vistazo.
// Claves compartidas (la base las junta y no borra claves; para corregir una marca se pone t: 0):
//   «regpase»  = { dia: { regional: { manana|noche: { m: { delegado: { t, por } }, ok: { t, por, n, total } } } } }
//   «regextra» = delegados agregados el mismo día por el encargado, y los que se quitan ({ id, quita }).
const CLAVE_REGPASE = 'regpase', CLAVE_REGEXTRA = 'regextra';
const MOMENTOS_REG = { manana: ['☀️ Mañana', 'bajar al lobby'], noche: ['🌙 Noche', 'regreso al hotel'] };
let regMomento = null, regAbierta = null, regBuscar = '';
const momentoAhora = () => partesDR(ahoraEvento()).min < 15 * 60 ? 'manana' : 'noche';
const mismoNombre = (a, b) => !!sinAcentos(a) && sinAcentos(a) === sinAcentos(b);
const misRegionales = () => estado.usuario ? REGIONALES.filter(r => mismoNombre(r.enc, estado.usuario.nombre)) : [];
const puedeMarcarReg = r => esDir() || misRegionales().includes(r);
function delegadosDe(id) {
  const extra = leerComp(CLAVE_REGEXTRA, []), quitados = new Set(extra.filter(x => x.quita).map(x => x.quita));
  return REG_DELEGADOS.filter(d => d.reg === id).concat(extra.filter(x => x.reg === id && x.n))
    .filter(d => !quitados.has(d.id)).sort((a, b) => a.n.localeCompare(b.n, 'es'));
}
function paseDe(id, mom, dia = hoyDR()) { const v = leerComp(CLAVE_REGPASE, {}); return ((v[dia] || {})[id] || {})[mom] || { m: {} }; }
function guardarPase(id, mom, cambio) {
  const v = leerComp(CLAVE_REGPASE, {}), d = v[hoyDR()] = v[hoyDR()] || {}, r = d[id] = d[id] || {}, s = r[mom] = r[mom] || { m: {} };
  s.m = s.m || {}; cambio(s); guardarComp(CLAVE_REGPASE, v);
}
function estadoReg(r, mom) {
  const lista = delegadosDe(r.id), s = paseDe(r.id, mom), abajo = lista.filter(d => (s.m[d.id] || {}).t), faltan = lista.filter(d => !(s.m[d.id] || {}).t);
  const ok = s.ok && s.ok.t ? s.ok : null;
  let k, txt;
  if (!lista.length) [k, txt] = ['sin', 'Sin lista de delegados'];
  else if (ok) [k, txt] = ok.n < ok.total ? ['parcial', `Confirmó con ${ok.total - ok.n} faltando · ${horaDR(ok.t)}`] : ['completa', `Completa · ${horaDR(ok.t)}`];
  else if (!abajo.length) [k, txt] = ['espera', 'Sin empezar'];
  else [k, txt] = ['faltan', `Faltan ${faltan.length}`];
  return { lista, s, abajo, faltan, ok, k, txt };
}
const TONO_REG = { completa: 'verde', parcial: 'amarillo', faltan: 'amarillo', espera: '', sin: 'rojo' };

function pintarRegionales(forzar) {
  const caja = $('#regDetalle'); if (!caja || !estado.usuario) return;
  if (!forzar && escribiendo($('#traslado'))) return;
  const dir = esDir(), mias = misRegionales(), mom = regMomento || momentoAhora();
  $$('#regMomento button').forEach(b => b.classList.toggle('on', b.dataset.m === mom));
  $('#regTodasCaja').hidden = !dir; $('#regCifras').hidden = !dir;
  if (dir) {
    const est = REGIONALES.map(r => ({ r, e: estadoReg(r, mom) })), total = est.reduce((a, x) => a + x.e.lista.length, 0), abajo = est.reduce((a, x) => a + x.e.abajo.length, 0);
    const cifra = (n, t, c = '') => `<div class="bus-cifra ${c}"><b>${n}</b><small>${t}</small></div>`;
    const comp = est.filter(x => x.e.k === 'completa').length, sinEnc = REGIONALES.filter(r => !r.enc).length;
    $('#regCifras').innerHTML = cifra(`${comp}<span>/${REGIONALES.length}</span>`, 'regionales completas', comp === REGIONALES.length ? 'verde' : '')
      + cifra(`${abajo}<span>/${total}</span>`, 'delegados ya abajo', total && abajo >= total ? 'verde' : 'azul')
      + cifra(est.filter(x => x.e.k === 'faltan' || x.e.k === 'parcial').length, 'con gente que falta', est.some(x => x.e.k === 'faltan' || x.e.k === 'parcial') ? 'rojo' : '')
      + cifra(sinEnc, sinEnc === 1 ? 'regional sin encargado' : 'regionales sin encargado', sinEnc ? 'rojo' : '');
    $('#regTodas').innerHTML = est.map(({ r, e }) => {
      const pct = e.lista.length ? Math.round(e.abajo.length * 100 / e.lista.length) : 0;
      return `<button class="reg-card ${e.k}${regAbierta === r.id ? ' on' : ''}" type="button" data-reg="${r.id}">
        <span class="reg-num">${esc(r.id.slice(1))}</span><div class="reg-info"><b>${esc(r.n)}${r.zona ? ` · ${esc(r.zona)}` : ''}</b>
        <small>${r.enc ? '👤 ' + esc(r.enc) : '<span style="color:#ff8a95">Sin encargado</span>'}</small>
        <span class="reg-barra"><i style="width:${pct}%"></i></span>
        <small>${e.lista.length ? `${e.abajo.length} de ${e.lista.length} abajo` : 'Sin lista'}${e.faltan.length && e.faltan.length <= 3 && e.abajo.length ? ` · falta ${e.faltan.map(d => esc(d.n.split(' ')[0])).join(', ')}` : ''}</small></div>
        <span class="chip ${TONO_REG[e.k]}">${e.txt}</span></button>`;
    }).join('');
  }
  // La regional que se muestra: la que abrió la dirección o la del encargado
  const opciones = dir ? REGIONALES : mias;
  if (!opciones.some(r => r.id === regAbierta)) regAbierta = mias[0] ? mias[0].id : null;
  const r = REGIONALES.find(x => x.id === regAbierta);
  if (!r) {
    caja.innerHTML = dir ? '<p class="cob-sub" style="margin:0">Toca una regional para ver su lista y marcar a los delegados.</p>'
      : `<span class="chip">Tu regional</span><h3 class="cob-mio-t">No tienes una regional asignada</h3><p class="cob-sub">Si eres encargado de una regional, pídele a la dirección que te ponga como encargado en «Regionales y encargados» con tu nombre igual que en tu código. Aquí te aparecerá la lista de tus delegados.</p>`;
    return;
  }
  const e = estadoReg(r, mom), puede = puedeMarcarReg(r), q = sinAcentos(regBuscar);
  const vista = e.lista.filter(d => !q || sinAcentos(`${d.n} ${d.com || ''}`).includes(q));
  const extra = new Set(leerComp(CLAVE_REGEXTRA, []).filter(x => x.n).map(x => x.id));
  const pct = e.lista.length ? Math.round(e.abajo.length * 100 / e.lista.length) : 0;
  caja.innerHTML = `${mias.length > 1 && !dir ? `<div class="pestanas" style="margin-bottom:10px">${mias.map(x => `<button type="button" data-reg="${x.id}" class="${x.id === r.id ? 'on' : ''}">${esc(x.n)}</button>`).join('')}</div>` : ''}
    <div class="reg-det-cab"><div><span class="chip">${dir && !mias.includes(r) ? 'Regional' : 'Tu regional'} · ${MOMENTOS_REG[mom][0]} · ${MOMENTOS_REG[mom][1]}</span>
      <h3 class="cob-mio-t">${esc(r.n)}${r.zona ? ` · ${esc(r.zona)}` : ''}</h3><p class="cob-sub" style="margin:0">Encargado: <b>${esc(r.enc || 'sin asignar')}</b> (fijo)</p></div>
      <span class="chip ${TONO_REG[e.k]}">${e.txt}</span></div>
    <div class="reg-cuenta"><b>${e.abajo.length}</b><span>de ${e.lista.length} delegados ${mom === 'manana' ? 'ya bajaron' : 'ya llegaron'}</span>${e.faltan.length ? `<span class="chip amarillo">Faltan ${e.faltan.length}</span>` : e.lista.length ? '<span class="chip verde">Están todos</span>' : ''}</div>
    <span class="reg-barra grande"><i style="width:${pct}%"></i></span>
    ${e.lista.length > 8 ? `<input class="reg-buscar" id="regBuscar" placeholder="Buscar delegado o comisión" value="${esc(regBuscar)}" autocomplete="off">` : ''}
    <div class="reg-lista">${vista.map(d => { const m = e.s.m[d.id] || {}; return `<div class="reg-fila${m.t ? ' on' : ''}">
      <button class="reg-del" type="button" data-del="${d.id}" ${puede ? '' : 'disabled'} aria-pressed="${!!m.t}"><span class="reg-check">${m.t ? '✓' : ''}</span>
        <span><b>${esc(d.n)}</b><small>${d.com ? esc(d.com) + ' · ' : ''}${m.t ? `${mom === 'manana' ? 'bajó' : 'llegó'} a las ${horaDR(m.t)}${m.por && !mismoNombre(m.por, r.enc) ? ' · marcó ' + esc(m.por.split(' ')[0]) : ''}` : puede ? 'Tócalo cuando lo veas' : 'Todavía no'}</small></span></button>
      ${puede && (extra.has(d.id) || esDir()) ? `<button class="cob-x" type="button" data-quitar-del="${d.id}" aria-label="Quitar a ${esc(d.n)} de la lista">×</button>` : ''}</div>`; }).join('') || `<p class="cob-sub">${e.lista.length ? 'Nadie coincide con la búsqueda.' : 'Esta regional todavía no tiene lista de delegados.'}</p>`}</div>
    ${puede ? `<details class="reg-agregar"${e.lista.length ? '' : ' open'}><summary>+ Agregar delegado</summary>
      <div class="reg-agregar-f"><input id="regNuevoN" placeholder="Nombre y apellido" autocomplete="off"><select id="regNuevoCom"><option value="">Comisión (si la sabes)</option>${COMISIONES.map(([c]) => `<option>${esc(c)}</option>`).join('')}</select><button class="boton sec" type="button" id="regNuevoOk">Agregar</button></div>
      <small class="cob-sub">Úsalo si el delegado no está en la lista oficial. Queda guardado para los demás días.</small></details>
      ${e.ok ? `<div class="cob-ok">✓ ${e.ok.n < e.ok.total ? `Confirmaste con ${e.ok.total - e.ok.n} faltando` : 'Regional completa'} a las ${horaDR(e.ok.t)}${e.ok.por ? ' · ' + esc(e.ok.por) : ''}</div><button class="mini" type="button" data-reg-acc="reabrir">Corregir</button>`
        : e.lista.length ? `<button class="boton" type="button" data-reg-acc="completa" style="margin-top:12px">${e.faltan.length ? `Confirmar regional (faltan ${e.faltan.length})` : '✅ Confirmar regional completa'}</button>` : ''}`
      : '<p class="cob-sub">Solo el encargado de esta regional y la dirección marcan la lista.</p>'}`;
}

$('#traslado').addEventListener('click', e => {
  const m = e.target.closest('#regMomento [data-m]'); if (m) { regMomento = m.dataset.m; pintarRegionales(); return; }
  const card = e.target.closest('[data-reg]');
  if (card) { regAbierta = card.dataset.reg; regBuscar = ''; pintarRegionales(); if (card.classList.contains('reg-card')) setTimeout(() => $('#regDetalle').scrollIntoView({ block: 'start', behavior: 'smooth' }), 40); return; }
  const r = REGIONALES.find(x => x.id === regAbierta); if (!r) return;
  const mom = regMomento || momentoAhora();
  if (!puedeMarcarReg(r)) return;
  const d = e.target.closest('[data-del]');
  if (d) {
    const ya = !!(paseDe(r.id, mom).m[d.dataset.del] || {}).t;
    guardarPase(r.id, mom, s => { s.m[d.dataset.del] = ya ? { t: 0 } : { t: ahoraMs(), por: yoNombre() }; if (ya && s.ok) s.ok = { t: 0 }; });
    pintarRegionales(); return;
  }
  const q = e.target.closest('[data-quitar-del]');
  if (q) {
    const del = delegadosDe(r.id).find(x => x.id === q.dataset.quitarDel); if (!del || !confirm(`¿Quitar a ${del.n} de la lista de ${r.n}?`)) return;
    const l = leerComp(CLAVE_REGEXTRA, []); l.push({ id: nuevoId('q'), quita: del.id, por: yoNombre(), t: ahoraMs() }); guardarComp(CLAVE_REGEXTRA, l);
    registrar('🧑‍🤝‍🧑 Regional', `${del.n} salió de la lista de ${r.n}`); pintarRegionales(); return;
  }
  if (e.target.id === 'regNuevoOk') {
    const n = ($('#regNuevoN').value || '').trim(); if (!n) return $('#regNuevoN').focus();
    if (delegadosDe(r.id).some(x => mismoNombre(x.n, n))) return toast(`${n} ya está en la lista`);
    const l = leerComp(CLAVE_REGEXTRA, []); l.push({ id: nuevoId('d'), reg: r.id, n, com: $('#regNuevoCom').value, por: yoNombre(), t: ahoraMs() }); guardarComp(CLAVE_REGEXTRA, l);
    registrar('🧑‍🤝‍🧑 Regional', `${n} agregado a ${r.n}`); toast(`${n} quedó en la lista de ${r.n}`); pintarRegionales();
    setTimeout(() => { const i = $('#regNuevoN'); if (i) { i.closest('details').open = true; i.focus(); } }, 30); return;
  }
  const a = e.target.closest('[data-reg-acc]'); if (!a) return;
  if (a.dataset.regAcc === 'reabrir') { guardarPase(r.id, mom, s => { s.ok = { t: 0 }; }); pintarRegionales(); return; }
  const est = estadoReg(r, mom);
  if (est.faltan.length && !confirm(`Faltan ${est.faltan.length}: ${est.faltan.map(x => x.n).join(', ')}.\n¿Confirmar la regional igual? La dirección verá quién falta.`)) return;
  guardarPase(r.id, mom, s => { s.ok = { t: ahoraMs(), por: yoNombre(), n: est.abajo.length, total: est.lista.length }; });
  registrar('🧑‍🤝‍🧑 Regional', `${r.n} · ${MOMENTOS_REG[mom][0].slice(3)}: ${est.abajo.length} de ${est.lista.length}${est.faltan.length ? ` · faltan ${est.faltan.map(x => x.n).join(', ')}` : ' · completa'}`, est.faltan.length ? { estatus: 'pendiente', area: 'Traslado' } : { area: 'Traslado' });
  toast(est.faltan.length ? 'Confirmada: la dirección ya ve quién falta' : '✅ Regional completa');
  pintarRegionales();
});
$('#traslado').addEventListener('input', e => { if (e.target.id === 'regBuscar') { regBuscar = e.target.value; const pos = e.target.selectionStart; pintarRegionales(true); const i = $('#regBuscar'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } });
addEventListener('storage', e => { if ([CLAVE_COMP(CLAVE_REGPASE), CLAVE_COMP(CLAVE_REGEXTRA), CLAVE_COMP(CFG('regionales')), CLAVE_COMP(CFG('delegadosReg'))].includes(e.key) && !escribiendo($('#traslado'))) pintarRegionales(); });
setInterval(() => { if (!document.hidden && !escribiendo($('#traslado'))) pintarRegionales(); }, 60000);
window.REGIONALES_LISTO = true;
pintarRegionales();
