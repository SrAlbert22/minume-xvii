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

// ---------- Movilización entre sedes (a pie) ----------
const minutos = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const LUGAR_SALIDA = { jaragua: 'j-este', sheraton: 's-oeste', malecon: 'malecon-terrace' };
const LUGAR_LLEGADA = { jaragua: 'j-lobby', sheraton: 's-oeste', malecon: 'malecon-terrace' };
const rutaViaje = v => calcularRuta(LUGAR_SALIDA[v.de], LUGAR_LLEGADA[v.a]);
function viajesDeMiSede() { if (!estado.comision) return []; const s = ASIGNA[estado.comision][0]; return VIAJES.filter(v => v.de === s || v.a === s); }
function proximoViaje() { const ahora = new Date(), m = ahora.getHours() * 60 + ahora.getMinutes(); const l = viajesDeMiSede(); return l.find(v => minutos(v.h) > m) || l[0]; }
function pintarTraslado() {
  const mis = new Set(viajesDeMiSede());
  $('#tLista').innerHTML = VIAJES.map(v => { const r = rutaViaje(v); return `<div class="viaje${mis.has(v) ? ' mio' : ''}"><div class="hora">${v.h}<small>${minutos(v.h) < 720 ? 'a. m.' : 'p. m.'}</small></div><div class="ruta"><b>${SEDES[v.de].corto} → ${SEDES[v.a].corto}</b><span>${esc(v.nota)}${r ? ` · ${r.metros} m, ${r.minutos} min a pie` : ''}</span></div><span class="chip ${v.estado.startsWith('A tiempo') ? 'verde' : 'amarillo'}">${esc(v.estado)}</span></div>`; }).join('');
  const v = proximoViaje();
  if (!v) { if (estado.comision) $('#tProx').innerHTML = `<b class="cond" style="font-size:26px;color:#fff">Hoy no hay movilizaciones para tu sede</b><div style="margin-top:6px">Si coordinación te pide acompañar a un grupo, aquí abajo están todas las salidas.</div>`; return; }
  const r = rutaViaje(v);
  $('#tProx').innerHTML = `<div class="contador" id="tCuenta">—</div><div style="margin:4px 0 10px">para la salida de las <b style="color:#fff">${v.h}</b></div>
    <div class="linea-ruta"><b>${SEDES[v.de].corto}</b><i></i>🚶<i></i><b>${SEDES[v.a].corto}</b></div>
    <div style="font-size:13.5px">📍 Salida: ${LUGAR[LUGAR_SALIDA[v.de]].n}${r ? ` · ${r.metros} m, unos ${r.minutos} min caminando` : ''}<br>🔷 Tu comisión: ${estado.comision} (${ASIGNA[estado.comision][1]})</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="boton" id="tVerMapa">🧭 Ver la ruta en el mapa</button></div>`;
  $('#tVerMapa').onclick = () => { $('#mapa').scrollIntoView(); $('#rOrigen').value = LUGAR_SALIDA[v.de]; $('#rDestino').value = LUGAR_LLEGADA[v.a]; setTimeout(() => irA(), 300); };
  cuentaRegresiva(v);
}
let reloj;
function cuentaRegresiva(v) {
  clearInterval(reloj);
  const tick = () => { const el = $('#tCuenta'); if (!el) return; const ahora = new Date(); let d = minutos(v.h) * 60 - (ahora.getHours() * 3600 + ahora.getMinutes() * 60 + ahora.getSeconds()); if (d < 0) d += 86400; const h = Math.floor(d / 3600), m = Math.floor(d % 3600 / 60); el.textContent = h ? `${h} h ${m} min` : `${m} min`; };
  tick(); reloj = setInterval(tick, 15000);
}
const total = 32;
function pintarAbordaje() { $('#aCuenta').textContent = estado.abordo; const f = total - estado.abordo; $('#aEstado').textContent = f > 0 ? `Faltan ${f}` : f === 0 ? 'Completo ✓' : `Sobran ${-f}`; $('#aEstado').className = 'chip ' + (f === 0 ? 'verde' : f < 0 ? 'rojo' : 'amarillo'); }
$('#aMas').onclick = () => { estado.abordo++; pintarAbordaje(); };
$('#aMenos').onclick = () => { estado.abordo = Math.max(0, estado.abordo - 1); pintarAbordaje(); };
$('#aConfirmar').onclick = () => { if (estado.abordo !== total) return toast(`El conteo no cuadra: ${estado.abordo} de ${total}`); registrar('🚶 Movilización', `Grupo completo: ${total} delegados`); toast('Grupo completo, confirmado y registrado'); };

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
  const borde = $('.cab').getBoundingClientRect().bottom + 40; // dónde termina la cabecera pegada, de verdad
  let actual = 0; secciones.forEach((s, i) => { if (!s.classList.contains('sin-permiso') && s.getBoundingClientRect().top <= borde) actual = i; });
  enlaces.forEach((a, i) => a.classList.toggle('on', i === actual));
  const on = enlaces[actual]; const rail = $('#rail'); if (on.offsetLeft < rail.scrollLeft || on.offsetLeft + on.offsetWidth > rail.scrollLeft + rail.clientWidth) rail.scrollTo({ left: on.offsetLeft - 20, behavior: 'smooth' });
}
addEventListener('scroll', espia, { passive: true }); espia();
