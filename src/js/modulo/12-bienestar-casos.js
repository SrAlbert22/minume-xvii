// ---------- Bienestar: kit y punto ----------
const KIT = ['Botiquín completo: gasas, curitas, guantes y antiséptico', 'Agua y vasos', 'Suero oral', 'Compresas frías o bolsas de hielo', 'Silla o camilla para reposo', 'Espacio privado para una crisis emocional'];
// Los casos y la cola de triaje están en 23-bienestar-triaje.js
function pintarKit() { const m = estado.marcas.kit || []; $('#kit').innerHTML = KIT.map((t, i) => `<div class="item${m.includes(i) ? ' ok' : ''}" data-i="${i}"><div class="caja"></div><span>${t}</span></div>`).join(''); }
$('#kit').onclick = e => { const it = e.target.closest('.item'); if (!it) return; const i = +it.dataset.i, m = estado.marcas.kit = estado.marcas.kit || []; m.includes(i) ? m.splice(m.indexOf(i), 1) : m.push(i); guardar('marcas', estado.marcas); pintarKit(); pintarTablero(); };
$('#bVerPunto').onclick = () => { $('#mapa').scrollIntoView(); if (!capas.seg) activarCapa('seg'); setTimeout(() => mostrarLugar(estado.puntos.find(q => q.cat === 'salud').ll, 'Punto de bienestar · Primeros auxilios'), 400); };
pintarKit();
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
