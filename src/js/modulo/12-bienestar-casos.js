// ---------- Bienestar: casos, kit y punto ----------
const KIT = ['Botiquín completo: gasas, curitas, guantes y antiséptico', 'Agua y vasos', 'Suero oral', 'Compresas frías o bolsas de hielo', 'Silla o camilla para reposo', 'Espacio privado para una crisis emocional'];
let casoFiltro = 'abiertos';
function pintarCasos() {
  if (!estado.usuario || estado.usuario.rol !== 'bienestar') return;
  const l = avisosPara('bienestar').reverse().filter(a => casoFiltro === 'todos' || (casoFiltro === 'resueltos' ? CERRADO(a) : !CERRADO(a)));
  $('#casosLista').innerHTML = l.length ? l.map(a => {
    const [e, cl] = EST_AVISO[a.estado], min = Math.max(0, Math.round(((CERRADO(a) ? a.tCambio : Date.now()) - a.t) / 60000)), lugar = a.salon ? 'Salón ' + a.salon : a.donde || a.sede || '—';
    return `<div class="tarjeta caso ${a.estado}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><span class="chip ${cl}">${e}</span><b class="cond" style="font-size:24px;display:block;margin-top:8px;line-height:1.1">${esc(a.tipo)}</b></div><div class="espera"><b>${min}</b><small>${CERRADO(a) ? 'min en total' : 'min esperando'}</small></div></div>
      <div class="dato" style="margin-top:8px"><span>Dónde</span><b>${esc(lugar)}</b></div><div class="dato"><span>Comisión</span><b>${esc(a.comision || '—')}</b></div><div class="dato"><span>Reporta</span><b>${esc(a.por || '—')} · ${NOMBRE_SIS[a.de] || a.de}</b></div>
      <p style="color:var(--suave);font-size:13.5px;margin:8px 0 0">${esc(a.texto)}${a.accion ? ' · Ya hizo: ' + esc(a.accion) : ''}${a.necesito ? ' · Necesita: ' + esc(a.necesito) : ''}</p>
      ${a.quien ? `<div style="font-size:12.5px;color:var(--suave);margin-top:4px">Lo lleva ${esc(a.quien)}</div>` : ''}
      ${CERRADO(a) ? '' : `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${ACC_BIEN.filter(([k]) => k !== a.estado).map(([k, txt]) => `<button class="mini" data-caso="${a.id}" data-e="${k}">${txt}</button>`).join('')}</div>`}</div>`;
  }).join('') : `<div class="tarjeta" style="color:var(--suave)">${casoFiltro === 'abiertos' ? 'No hay casos abiertos. Cuando un asistente escale un caso a Bienestar, aparece aquí al instante.' : 'No hay casos en esta lista.'}</div>`;
}
$('#casosLista').onclick = e => {
  const b = e.target.closest('[data-caso]'); if (!b) return;
  cambiarAviso(b.dataset.caso, b.dataset.e); pintarCasos(); pintarTablero();
  toast(b.dataset.e === 'derivado' ? 'Llama al 9-1-1 y avisa a Seguridad para que facilite el acceso' : `Caso: ${EST_AVISO[b.dataset.e][0]} · lo ve quien lo reportó`);
  if (b.dataset.e === 'derivado') { const a = leerAvisos().find(x => x.id === b.dataset.caso); enviarAviso('seguridad', { tipo: 'Ambulancia en camino', texto: 'Bienestar derivó un caso al 9-1-1: facilitar el acceso', comision: a.comision, salon: a.salon, donde: a.donde, sede: a.sede, por: estado.usuario.nombre }); }
};
$('#casoFiltro').onclick = e => { const b = e.target.closest('button'); if (!b) return; casoFiltro = b.dataset.f; $$('#casoFiltro button').forEach(x => x.classList.toggle('on', x === b)); pintarCasos(); };
$('#cCom').innerHTML = '<option value="">Sin comisión / staff</option>' + COMISIONES.map(([c]) => `<option>${c}</option>`).join('');
$('#cAbrir').onclick = () => {
  const t = $('#cTexto').value.trim(); if (!t) return $('#cTexto').focus();
  const a = enviarAviso('bienestar', { tipo: $('#cTipo').value, texto: t, comision: $('#cCom').value, donde: $('#cDonde').value.trim(), sede: '', por: estado.usuario.nombre });
  cambiarAviso(a.id, 'atencion'); $('#cTexto').value = ''; $('#cDonde').value = ''; pintarCasos(); pintarTablero(); toast('Caso abierto y en atención');
};
function pintarKit() { const m = estado.marcas.kit || []; $('#kit').innerHTML = KIT.map((t, i) => `<div class="item${m.includes(i) ? ' ok' : ''}" data-i="${i}"><div class="caja"></div><span>${t}</span></div>`).join(''); }
$('#kit').onclick = e => { const it = e.target.closest('.item'); if (!it) return; const i = +it.dataset.i, m = estado.marcas.kit = estado.marcas.kit || []; m.includes(i) ? m.splice(m.indexOf(i), 1) : m.push(i); guardar('marcas', estado.marcas); pintarKit(); pintarTablero(); };
$('#bVerPunto').onclick = () => { $('#mapa').scrollIntoView(); if (!capas.seg) activarCapa('seg'); setTimeout(() => mostrarLugar(estado.puntos.find(q => q.cat === 'salud').ll, 'Punto de bienestar · Primeros auxilios'), 400); };
pintarKit(); setInterval(pintarCasos, 15000);
$('#tablero').onclick = e => {
  const b = e.target.closest('[data-acc]'); if (!b || !b.dataset.acc) return; const a = b.dataset.acc;
  if (a.startsWith('ir-')) { const id = a.slice(3); $('#' + id).scrollIntoView(); if (id === 'mapa' && !capas.vivo && ['seguridad', 'traslado', 'coordinacion'].includes(estado.usuario.rol)) setTimeout(() => activarCapa('vivo'), 400); return; }
  if (a === 'ruta') { $('#mapa').scrollIntoView(); setTimeout(() => $('#rMiSalon').click(), 400); return; }
  if (a === 'necesito') {
    const [ic, n] = NECESITO[+b.dataset.i], sal = (ASIGNA[estado.comision] || [])[1] || '—';
    estado.pedidos.push({ id: 'q' + Date.now(), ic, que: n, salon: sal, com: estado.comision || '—', por: estado.usuario.nombre, t: Date.now(), est: 'pendiente' });
    guardar('pedidos', estado.pedidos); registrar('🙋 Pedido', `${n} · Salón ${sal}`); toast(`${ic} Le llegó a coordinación: ${n} para el Salón ${sal}`); pintarTablero(); return;
  }
  if (a === 'lugar2') return avisarLugar($('#lugar2').value);
  if (a === 'aviso') { cambiarAviso(b.dataset.id, b.dataset.e); toast(`Marcado: ${EST_AVISO[b.dataset.e][0]} · lo ve quien lo envió`); pintarTablero(); pintarCasos(); return; }
  if (a === 'nivel') { estado.codigoAlerta = b.dataset.k; guardar('codigoAlerta', estado.codigoAlerta); registrar('🛡️ Código', `Código ${NIVEL[b.dataset.k][0]} activado`); toast(`Todo el staff ve ahora el código ${NIVEL[b.dataset.k][0]}`); pintarTablero(); pintarBienvenida(); return; }
  if (a === 'bus') { estado.busEstado[b.dataset.id] = b.dataset.e; guardar('busEstado', estado.busEstado); toast(`${EQUIPO.find(p => p.id === b.dataset.id).n}: ${b.dataset.e} · lo ve todo el staff`); pintarTablero(); return; }
  if (a === 'ver-salon') {
    const [se, sal] = ASIGNA[b.dataset.c]; $('#mapa').scrollIntoView();
    $('#rDestino').value = lugarDeSalon(sal, se).id; setTimeout(() => { irA(); $('#ficha').innerHTML = `<b>${b.dataset.c} · ${esc(sal)}</b>${SEDES[se].nombre}`; }, 300);
    return;
  }
  if (a.startsWith('ped-')) { const q = estado.pedidos.find(x => x.id === b.dataset.id); q.est = a.slice(4); if (q.est === 'camino') q.quien = estado.usuario.nombre.split(' ')[0]; guardar('pedidos', estado.pedidos); pintarTablero(); }
};
// Demo: coordinación "responde" sola a los pedidos para que se vea el recorrido completo
setInterval(() => { let c = false; for (const q of estado.pedidos) { const d = Date.now() - q.t; if (q.est === 'pendiente' && d > 4000) { q.est = 'visto'; c = true; } else if (q.est === 'visto' && d > 11000) { q.est = 'camino'; q.quien = 'Pedro'; c = true; } } if (c) { guardar('pedidos', estado.pedidos); pintarTablero(); } }, 1500);
