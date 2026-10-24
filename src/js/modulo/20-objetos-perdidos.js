// ---------- Objetos perdidos ----------
const OB_CAT = ['Documento o identificación', 'Celular o electrónico', 'Ropa o accesorio', 'Mochila o bolso', 'Llaves', 'Material de comisión', 'Otro'];
const OB_GUARDA = ['Mesa de Seguridad · Lobby del Jaragua', 'Lobby del Sheraton', 'Malecón Terrace', 'Lo tengo yo'];
function leerObjetos() {
  let l = leerComp('objetos', null); if (l) return l;
  const t = ahoraMs();
  l = [
    { id: 'ob1', tipo: 'encontrado', que: 'Celular negro con funda azul', cat: 'Celular o electrónico', donde: 'Anacaona 2', com: 'AMS', guarda: OB_GUARDA[0], por: 'Sofía Marte', t: t - 50 * 60000, est: 'guardado' },
    { id: 'ob2', tipo: 'encontrado', que: 'Chaqueta gris talla M', cat: 'Ropa o accesorio', donde: 'Camino al Sheraton', com: '', guarda: OB_GUARDA[2], por: 'Rosa Almonte', t: t - 95 * 60000, est: 'guardado' },
    { id: 'ob3', tipo: 'encontrado', que: 'Carnet de colegio a nombre de Daniel R.', cat: 'Documento o identificación', donde: 'Pasillo de salones', com: 'CSNU', guarda: OB_GUARDA[0], por: 'Darlin Féliz', t: t - 130 * 60000, est: 'entregado', entregadoA: 'Daniel Rosario (CSNU)', tEnt: t - 70 * 60000 },
    { id: 'ob4', tipo: 'buscado', que: 'Celular Samsung con funda azul', cat: 'Celular o electrónico', donde: 'Cree que en el almuerzo', com: 'AMS', quien: 'Ana Gómez', por: 'María Pérez', t: t - 20 * 60000, est: 'buscando' },
  ];
  guardarComp('objetos', l); return l;
}
let obModo = 'encontrado', obVer = 'guardados', obEntregando = null;
const puedeEntregar = () => !!estado.usuario && ['seguridad', 'traslado', 'coordinacion'].includes(estado.usuario.rol);
$('#obCat').innerHTML = OB_CAT.map(c => `<option>${c}</option>`).join('');
$('#obCom').innerHTML = '<option value="">No se sabe</option>' + COMISIONES.map(([c]) => `<option>${c}</option>`).join('');
$('#obGuarda').innerHTML = OB_GUARDA.map(g => `<option>${g}</option>`).join('');
$('#obLugares').innerHTML = [...LUGARES.map(x => x.n), 'Camino Jaragua – Sheraton', 'Baños'].map(n => `<option value="${esc(n)}">`).join('');
function pintarModoObjeto() {
  $$('#obModo button').forEach(b => b.classList.toggle('on', b.dataset.m === obModo));
  const enc = obModo === 'encontrado';
  $('#obQueL').textContent = enc ? '¿Qué encontraste?' : '¿Qué perdió?';
  $('#obDondeL').textContent = enc ? '¿Dónde lo encontraste?' : '¿Dónde cree que lo perdió?';
  $('#obSoloEnc').hidden = !enc; $('#obSoloBus').hidden = enc;
  $('#obGuardar').textContent = enc ? 'Registrar objeto encontrado' : 'Registrar búsqueda';
  $('#obAyuda').textContent = enc ? 'Anota qué es, dónde estaba y dónde lo dejas guardado. Si alguien lo está buscando, la página le avisa.' : 'Anota qué perdió la persona y su nombre. Abajo, en «Guardados», revisa si ya apareció algo parecido.';
}
function pintarObjetos() {
  const sec = $('#objetos'); if (!sec || !estado.usuario) return;
  const l = leerObjetos(), q = ($('#obBuscar').value || '').toLowerCase().trim();
  const guard = l.filter(x => x.tipo === 'encontrado' && x.est === 'guardado'), busc = l.filter(x => x.tipo === 'buscado' && x.est === 'buscando');
  $('#obTiles').innerHTML = tile(guard.length, 'objetos guardados', '#45c8ff', '') + tile(busc.length, 'personas buscando algo', '#ffd23f', '', busc.length > 0) + tile(l.filter(x => x.est === 'entregado' && diaDR(x.tEnt || x.t) === hoyDR()).length, 'entregados hoy', '#2fd38c', '') + tile(l.filter(x => x.tipo === 'encontrado').length, 'registrados en total', '#a974ff', '');
  $$('#obVer button').forEach(b => b.classList.toggle('on', b.dataset.v === obVer));
  const coincide = x => !q || [x.que, x.cat, x.donde, x.com, x.quien, x.guarda].join(' ').toLowerCase().includes(q);
  const vista = (obVer === 'guardados' ? guard : obVer === 'buscados' ? busc : l.filter(x => x.est === 'entregado' || x.est === 'encontrado')).filter(coincide).sort((a, b) => b.t - a.t);
  $('#obLista').innerHTML = vista.length ? vista.map(x => {
    if (x.tipo === 'buscado' && x.est === 'buscando') {
      const pos = guard.filter(g => g.cat === x.cat);
      return `<div class="ob-item"><div class="ob-cab"><b>${esc(x.que)}</b><span class="chip amarillo">La buscan</span></div><small>${esc(x.quien)}${x.com ? ' · ' + esc(x.com) : ''} · ${esc(x.donde)} · ${haceMin(x.t)}</small>
        ${pos.length ? `<div class="ob-pos"><b>¿Es alguno de estos?</b>${pos.map(g => `<small>• ${esc(g.que)} · encontrado en ${esc(g.donde)} · está en ${esc(g.guarda)}</small>`).join('')}</div>` : ''}
        <button class="mini" data-ob="aparecio" data-id="${x.id}" style="margin-top:8px">Ya apareció</button></div>`;
    }
    if (x.est === 'guardado') return `<div class="ob-item"><div class="ob-cab"><b>${esc(x.que)}</b><span class="chip">${esc(x.cat)}</span></div><small>Encontrado en ${esc(x.donde)}${x.com ? ' · ' + esc(x.com) : ''} · ${esc(x.por)} · ${haceMin(x.t)}</small><small>Está en: <b>${esc(x.guarda)}</b></small>
        ${obEntregando === x.id ? `<div class="rn-nov"><input id="obA" placeholder="¿A quién se entrega? Nombre y comisión"><button class="mini on" data-ob="ent-ok" data-id="${x.id}">Entregar</button><button class="mini" data-ob="ent-no">Cancelar</button></div><small style="color:var(--amarillo)">Pide que describa el objeto antes de entregarlo.</small>` : puedeEntregar() ? `<button class="mini" data-ob="entregar" data-id="${x.id}" style="margin-top:8px">Entregar a su dueño</button>` : ''}</div>`;
    return `<div class="ob-item"><div class="ob-cab"><b>${esc(x.que)}</b><span class="chip verde">${x.est === 'entregado' ? 'Entregado' : 'Apareció'}</span></div><small>${x.est === 'entregado' ? `A ${esc(x.entregadoA)} · ${horaDR(x.tEnt)}` : `${esc(x.quien)} · ${horaDR(x.tEnt || x.t)}`}</small></div>`;
  }).join('') : `<p class="cob-sub">${q ? 'Nada coincide con esa búsqueda.' : obVer === 'guardados' ? 'No hay objetos guardados.' : obVer === 'buscados' ? 'Nadie está buscando nada ahora.' : 'Todavía no se ha entregado nada.'}</p>`;
}
$('#obModo').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; obModo = b.dataset.m; pintarModoObjeto(); };
$('#obVer').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; obVer = b.dataset.v; obEntregando = null; pintarObjetos(); };
$('#obBuscar').oninput = pintarObjetos;
$('#obGuardar').onclick = () => {
  const que = $('#obQue').value.trim(); if (!que) return $('#obQue').focus();
  const l = leerObjetos(), base = { id: nuevoId('ob'), tipo: obModo, que, cat: $('#obCat').value, donde: $('#obDonde').value.trim() || 'Sin indicar', com: $('#obCom').value, por: yoNombre(), t: ahoraMs() };
  if (obModo === 'encontrado') { l.push({ ...base, guarda: $('#obGuarda').value, est: 'guardado' }); registrar('🎒 Objeto encontrado', `${que} · ${base.donde} → ${$('#obGuarda').value}`); obVer = 'guardados'; }
  else { const quien = $('#obQuien').value.trim(); if (!quien) return $('#obQuien').focus(); l.push({ ...base, quien, est: 'buscando' }); registrar('🎒 Objeto perdido', `${quien} busca: ${que}`); obVer = 'buscados'; }
  guardarComp('objetos', l); ['#obQue', '#obDonde', '#obQuien'].forEach(s => $(s).value = '');
  toast(obModo === 'encontrado' ? 'Objeto registrado' : 'Búsqueda registrada: te avisamos si aparece algo parecido'); pintarObjetos();
};
$('#obLista').onclick = e => {
  const b = e.target.closest('[data-ob]'); if (!b) return;
  const l = leerObjetos(), x = l.find(y => y.id === b.dataset.id), a = b.dataset.ob;
  if (a === 'entregar') { obEntregando = x.id; pintarObjetos(); setTimeout(() => $('#obA') && $('#obA').focus(), 30); return; }
  if (a === 'ent-no') { obEntregando = null; pintarObjetos(); return; }
  if (a === 'ent-ok') { const quien = ($('#obA').value || '').trim(); if (!quien) return $('#obA').focus(); x.est = 'entregado'; x.entregadoA = quien; x.tEnt = ahoraMs(); obEntregando = null; registrar('🎒 Objeto entregado', `${x.que} → ${quien}`); toast('Entregado y registrado'); }
  if (a === 'aparecio') { x.est = 'encontrado'; x.tEnt = ahoraMs(); toast('Marcado como encontrado'); }
  guardarComp('objetos', l); pintarObjetos();
};
pintarModoObjeto();
