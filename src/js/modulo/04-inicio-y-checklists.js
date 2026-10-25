// MINUME XVII · Cuenta regresiva · Albert Silvestre
// ---------- Cuenta regresiva ----------
function dias(fecha) { return Math.max(0, Math.ceil((new Date(fecha) - new Date()) / 86400000)); }
$('#dMontaje').textContent = dias('2026-11-14T19:00:00-04:00') + ' días';
$('#dSesiones').textContent = dias('2026-11-15T08:00:00-04:00') + ' días';

// ---------- Flujo de 3 pasos ----------
const paso = n => { [1, 2, 3].forEach(i => { $('#paso' + i).hidden = i !== n; $('#p' + i).className = 'paso' + (i < n ? ' ok' : i === n ? ' on' : ''); }); };
$('#comis').innerHTML = COMISIONES.map(([c, n]) => `<button class="comi" data-c="${c}"><b>${c}</b><small>${n}</small></button>`).join('');
let elegida = estado.comision;
$('#comis').onclick = e => { const b = e.target.closest('.comi'); if (!b) return; elegida = b.dataset.c; $$('.comi').forEach(x => x.classList.toggle('on', x === b)); };
$('#b1').onclick = () => { const n = $('#nombre').value.trim(); if (!n) return $('#nombre').focus(); estado.nombre = n; guardar('nombre', n); paso(2); };
$('#b2').onclick = () => { if (!elegida) return toast('Escoge tu comisión'); estado.comision = elegida; guardar('comision', elegida); paso(3); aplicarComision(); };
$$('.etapa').forEach(b => b.onclick = () => { $$('.etapa').forEach(x => x.classList.remove('on')); b.classList.add('on'); estado.etapa = b.dataset.e; guardar('etapa', estado.etapa); pintarListas(); pintarPanel(); });
$('#b3').onclick = () => { $('#flujo').style.display = 'none'; pintarPanel(); $('#miPanel').scrollIntoView({ block: 'start' }); };

function aplicarComision() {
  const [sede, salon] = ASIGNA[estado.comision];
  $('#miChip').hidden = false; $('#miChip').innerHTML = `🔷 <b style="font:inherit">${estado.comision}</b><span class="largo"> · ${SEDES[sede].corto} · ${salon}</span>`;
  elegirSede(sede, true);
  pintarPanel(); pintarTraslado(); pintarRanking();
}
function pintarPanel() {
  if (estado.usuario) { $('#miPanel').hidden = true; return; } // con código entra cada quien a su propio tablero
  if (!estado.comision) return;
  $('#miPanel').hidden = false;
  const [sede, salon] = ASIGNA[estado.comision];
  $('#mpCodigo').textContent = estado.comision; $('#mpNombre').textContent = COMISIONES.find(c => c[0] === estado.comision)[1];
  $('#mpSede').textContent = SEDES[sede].nombre; $('#mpSalon').textContent = salon;
  $('#mpEtapa').textContent = NOMBRE_ETAPA[estado.etapa];
  const l = LISTAS[estado.etapa], m = estado.marcas[estado.etapa] || [];
  const pct = Math.round(m.length / l.length * 100);
  $('#mpPct').textContent = pct + '%'; $('#mpArco').setAttribute('stroke-dashoffset', 239 * (1 - pct / 100));
  $('#mpAhora').textContent = AHORA[estado.etapa];
}

// ---------- Checklists ----------
let listaVista = estado.etapa;
$('#pestLista').innerHTML = Object.keys(LISTAS).map(k => `<button data-k="${k}">${CORTO[k]}</button>`).join('');
$('#pestLista').onclick = e => { const b = e.target.closest('button'); if (!b) return; listaVista = b.dataset.k; pintarListas(); };
function pintarListas() {
  $$('#pestLista button').forEach(b => b.classList.toggle('on', b.dataset.k === listaVista));
  const l = LISTAS[listaVista], m = estado.marcas[listaVista] || [];
  $('#lTitulo').textContent = 'Checklist · ' + NOMBRE_ETAPA[listaVista];
  $('#lCuenta').textContent = `${m.length}/${l.length}`; $('#lCuenta').className = 'chip' + (m.length === l.length ? ' verde' : '');
  $('#lBarra').style.width = (m.length / l.length * 100) + '%';
  $('#lItems').innerHTML = l.map((t, i) => `<div class="item${m.includes(i) ? ' ok' : ''}" data-i="${i}"><div class="caja"></div><span>${t}</span></div>`).join('');
  $('#lExtra').innerHTML = listaVista === 'cierre' ? entregaDelDia() : NOTA_LISTA[listaVista] ? `<div class="extra-lista">${NOTA_LISTA[listaVista]}</div>` : '';
  $$('.momento').forEach(x => x.classList.toggle('on', x.dataset.e === estado.etapa));
  pintarFicha();
}
$('#lItems').onclick = e => {
  const it = e.target.closest('.item'); if (!it) return;
  const i = +it.dataset.i, m = estado.marcas[listaVista] = estado.marcas[listaVista] || [];
  m.includes(i) ? m.splice(m.indexOf(i), 1) : m.push(i);
  guardar('marcas', estado.marcas); pintarListas(); pintarPanel(); pintarRanking();
  if (m.length === LISTAS[listaVista].length) toast('🎉 ¡Checklist completo!');
};
