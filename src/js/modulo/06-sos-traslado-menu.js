// ---------- SOS ----------
$('#bSOS').onclick = () => {
  const a = estado.comision ? ASIGNA[estado.comision] : null;
  const quien = estado.usuario ? estado.usuario.nombre : (estado.nombre || 'Sin nombre');
  $('#sosDatos').innerHTML = `👤 ${esc(quien)}${estado.usuario ? ' · ' + ROLES[estado.usuario.rol][0] : ''}<br>🔷 ${estado.comision || 'Sin comisión'}<br>🏨 ${a ? SEDES[a[0]].nombre + ' · ' + a[1] : 'Sin sede'}<br>📍 ${compartiendo() ? 'Tu ubicación en vivo va con el aviso' : 'Sin ubicación (no la estás compartiendo)'}`;
  $('#sosVelo').classList.add('on');
};
$('#sosCerrar').onclick = () => $('#sosVelo').classList.remove('on');
$('#sosEnviar').onclick = () => {
  $('#sosVelo').classList.remove('on');
  const tipo = $('#sosTipo').value, a = estado.comision ? ASIGNA[estado.comision] : null;
  const para = tipo === 'Persona herida o enferma' ? ['bienestar', 'seguridad'] : ['seguridad'];
  para.forEach(p => enviarAviso(p, { tipo: 'SOS · ' + tipo, texto: tipo, comision: estado.comision || '', salon: a ? a[1] : '', sede: a ? SEDES[a[0]].nombre : '', por: estado.usuario ? estado.usuario.nombre : (estado.nombre || 'Sin nombre') }));
  registrar('🔴 SOS', tipo, { area: para.map(p => NOMBRE_SIS[p]).join(' y '), estatus: 'escalado' });
  toast(`Aviso enviado a ${para.map(p => NOMBRE_SIS[p]).join(' y ')}`);
};
$('#bVerSeg').onclick = () => { $('#mapa').scrollIntoView(); setTimeout(() => activarCapa('seg'), 400); };

// ---------- Regionales ----------
// Las movilizaciones a pie entre sedes y el conteo del grupo se quitaron (pedido del 25 de octubre): Traslado se ocupa de las regionales.
const minutos = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
function pintarTraslado() { if (window.REGIONALES_LISTO) pintarRegionales(); }

// ---------- Ranking ----------
function pintarRanking() {
  const base = [['UNCTAD', 92], ['CSNU', 88], ['AMS', 81], ['CIJ', 77], ['OMT', 70]];
  if (estado.comision) { const tot = Object.values(LISTAS).reduce((a, l) => a + l.length, 0), hechas = Object.keys(LISTAS).reduce((a, k) => a + (estado.marcas[k] || []).length, 0); const p = Math.round(hechas / tot * 100); const i = base.findIndex(b => b[0] === estado.comision); if (i >= 0) base.splice(i, 1); base.push([estado.comision + ' (tú)', p]); }
  base.sort((a, b) => b[1] - a[1]);
  $('#ranking').innerHTML = base.map(([c, p], i) => `<div class="dato"><span>${i + 1}. ${c}</span><b>${p}%</b></div>`).join('');
}
$('#bEnviar').onclick = () => toast('Demo: en la versión real se guarda en la base de datos y coordinación lo ve al instante');

// ---------- Menú de secciones (resalta la sección correcta; salta las ocultas) ----------
let enlaces = $$('#rail a'), secciones = enlaces.map(a => $(a.getAttribute('href')));
function espia() {
  if (document.body.classList.contains('app')) return; // con la navegación fácil se resalta la sección abierta
  const borde = $('.cab').getBoundingClientRect().bottom + 40; // dónde termina la cabecera pegada, de verdad
  let actual = 0; secciones.forEach((s, i) => { if (!s.classList.contains('sin-permiso') && s.getBoundingClientRect().top <= borde) actual = i; });
  enlaces.forEach((a, i) => a.classList.toggle('on', i === actual));
  const on = enlaces[actual]; const rail = $('#rail'); if (on.offsetLeft < rail.scrollLeft || on.offsetLeft + on.offsetWidth > rail.scrollLeft + rail.clientWidth) rail.scrollTo({ left: on.offsetLeft - 20, behavior: 'smooth' });
}
addEventListener('scroll', espia, { passive: true }); espia();
