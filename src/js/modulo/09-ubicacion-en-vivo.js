// ---------- Compartir mi ubicación ----------
estado.compartir = leer('compartir', null);
let reloj_gps = null, miPos = null, avisoGps = false;
const compartiendo = () => !!(estado.compartir && estado.compartir.hasta > Date.now());
function empezarCompartir(m) {
  let hasta;
  if (m === 'cierre') { const d = new Date(); d.setHours(19, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); hasta = +d; } else hasta = Date.now() + m * 60000;
  estado.compartir = { hasta }; guardar('compartir', estado.compartir);
  if (navigator.geolocation && isSecureContext) {
    const lecturas = [];
    reloj_gps = navigator.geolocation.watchPosition(p => {
      const acc = p.coords.accuracy; if (acc > 80) return; // lectura mala (por ejemplo, bajo techo): se ignora
      lecturas.push([p.coords.latitude, p.coords.longitude, acc]); if (lecturas.length > 4) lecturas.shift();
      let w = 0, la = 0, lo = 0; for (const [a, b, c] of lecturas) { const k = 1 / (c * c); w += k; la += a * k; lo += b * k; } // las lecturas más precisas pesan más
      miPos = [la / w, lo / w]; miPos.real = true; miPos.acc = Math.round(Math.min(...lecturas.map(l => l[2])));
    }, () => { miPos = null; if (!avisoGps) { avisoGps = true; toast('No diste permiso de ubicación: en la demo usamos una posición de ejemplo'); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }
  pintarCompartir(); toast('📡 Estás compartiendo tu ubicación en vivo');
}
function dejarCompartir() { if (reloj_gps !== null && navigator.geolocation) navigator.geolocation.clearWatch(reloj_gps); reloj_gps = null; estado.compartir = null; guardar('compartir', null); pintarCompartir(); }
$('#duraciones').onclick = e => { const b = e.target.closest('button'); if (b) empezarCompartir(b.dataset.m === 'cierre' ? 'cierre' : +b.dataset.m); };
$('#bDejar').onclick = () => { dejarCompartir(); toast('Dejaste de compartir tu ubicación'); };
$('#vivoPill').onclick = () => $('#ubicacion').scrollIntoView();
function pintarCompartir() {
  const on = compartiendo();
  if (!on && estado.compartir) { estado.compartir = null; guardar('compartir', null); }
  $('#vivoPill').classList.toggle('on', on); $('#bDejar').style.display = on ? 'inline-flex' : 'none'; $('#duraciones').style.display = on ? 'none' : 'flex';
  if (on) {
    const min = Math.max(1, Math.round((estado.compartir.hasta - Date.now()) / 60000)), txt = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    $('#vivoTxt').textContent = `En vivo · ${txt}`;
    $('#compEstado').innerHTML = `<b style="color:var(--verde)">● Compartiendo ahora</b> · se apaga sola en ${txt}.<br>${lugarActual() ? `Te ubicamos en ${lugarActual().n} (lo avisaste tú).` : miPos && miPos.real ? `GPS real de tu teléfono · precisión ±${miPos.acc} m.` : 'Demo: se usa una posición de ejemplo en tu sede.'}`;
  } else $('#compEstado').textContent = 'No la estás compartiendo. Elige por cuánto tiempo:';
}
setInterval(pintarCompartir, 20000);
// "Me moví a…": dentro del hotel el GPS falla por el techo; avisar el salón da la posición exacta
const LUGARES = MAPA.lugares.filter(l => l.tipo !== 'referencia' && l.id !== 'gran-salon').map(l => ({ id: l.id, n: l.n, sede: l.sede, xy: l.xy }));
estado.lugar = leer('lugar', null);
const lugarActual = () => estado.lugar && Date.now() - estado.lugar.t < 2 * 3600e3 ? LUGARES.find(l => l.id === estado.lugar.id) : null;
const opcionesLugar = () => '<option value="">Elige dónde estás…</option>' + LUGARES.map(l => `<option value="${l.id}"${lugarActual() && estado.lugar.id === l.id ? ' selected' : ''}>${l.n}</option>`).join('');
function textoLugar() { const l = lugarActual(); if (!l) return 'Todavía no has avisado dónde estás.'; const m = Math.round((Date.now() - estado.lugar.t) / 60000); return `📍 Avisaste: ${l.n} · ${m < 1 ? 'ahora mismo' : 'hace ' + m + ' min'}`; }
function avisarLugar(id) {
  const l = LUGARES.find(x => x.id === id); if (!l) return toast('Elige un lugar de la lista');
  estado.lugar = { id, t: Date.now() }; guardar('lugar', estado.lugar);
  registrar('📍 Me moví', `${estado.usuario ? estado.usuario.nombre : 'Alguien'} → ${l.n}`);
  $('#lugar').innerHTML = opcionesLugar(); $('#lugarTxt').textContent = textoLugar(); pintarCompartir();
  toast(`📍 Coordinación ya sabe que estás en: ${l.n}`); pintarTablero();
}
$('#lugar').innerHTML = opcionesLugar(); $('#lugarTxt').textContent = textoLugar();
$('#bLugar').onclick = () => avisarLugar($('#lugar').value);
setInterval(() => { $('#lugarTxt').textContent = textoLugar(); }, 30000);

// ---------- Mapa en vivo (Seguridad, Traslado y Coordinación) ----------
// Demo: el equipo camina por los mismos caminos del mapa de las sedes
const ruta = (a, b) => calcularRuta(a, b).puntos;
const EQUIPO = [
  { id: 's1', n: 'Luis Gómez', rol: 'seguridad', ruta: ruta('j-lobby', 's-oeste'), periodo: 160, det: 'Ronda: Jaragua → canchas → Sheraton' },
  { id: 's2', n: 'Yaneris Cruz', rol: 'seguridad', en: 's-lobby', det: 'Puesto del lobby del Sheraton' },
  { id: 't1', n: 'Carlos Méndez', rol: 'traslado', ruta: ruta('j-este', 'malecon-terrace'), periodo: 140, fase: .3, det: 'Guía del grupo · Jaragua → Malecón Terrace' },
  { id: 't2', n: 'Rosa Almonte', rol: 'traslado', en: 's-oeste', det: 'Recibe los grupos en la entrada oeste del Sheraton' },
  { id: 'v1', n: 'Pedro Santos', rol: 'asistencia', en: 'samana', lugar: 'Samaná', det: 'ONUDI · Samaná' },
  { id: 'v2', n: 'Laura Peña', rol: 'asistencia', en: 'anacaona', lugar: 'Anacaona 1', det: 'CSNU · Anacaona 1' },
  { id: 'a1', n: 'Carla Núñez', rol: 'acreditacion', en: 'j-lobby', lugar: 'Lobby del Jaragua', det: 'Acreditación de delegados' },
  { id: 'v4', n: 'Sofía Marte', rol: 'asistencia', ruta: ruta('j-lobby', 'marien'), periodo: 40, fase: .4, det: 'AMS · llevando agua a Anacaona 2' },
  { id: 'v3', n: 'Miguel Ortiz', rol: 'asistencia', ruta: ruta('s-oeste', 'yarey'), periodo: 70, fase: .7, det: 'OMT · Yarey' },
  { id: 'c1', n: 'Coordinación general', rol: 'coordinacion', en: 'j-lobby', lugar: 'Lobby del Jaragua', det: 'Coordinación' },
];
const COLOR_ROL = { asistencia: '#45c8ff', acreditacion: '#a974ff', seguridad: '#ff6b78', traslado: '#ff9a3c', coordinacion: '#ffd23f', eventos: '#f472b6' };
const iniciales = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
function distM(a, b) { const R = 6371000, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
// Punto a una fracción u (0 a 1) del recorrido, medida en metros
function enRuta(pts, u) {
  const tramos = pts.slice(1).map((p, i) => distXY(pts[i], p)), total = tramos.reduce((a, b) => a + b, 0);
  let falta = u * total;
  for (let i = 0; i < tramos.length; i++) {
    if (falta <= tramos[i]) { const f = tramos[i] ? falta / tramos[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; }
    falta -= tramos[i];
  }
  return pts[pts.length - 1];
}
// posición en metros sobre la maqueta (pos y xy son lo mismo)
function posicion(p, t) {
  if (p.ruta) { const k = (t / p.periodo + (p.fase || 0)) % 2, u = k < 1 ? k : 2 - k, quieto = u < .03 || u > .97, xy = enRuta(p.ruta, u); return { pos: xy, xy, mov: !quieto, vel: quieto ? 0 : 4 }; }
  const c = LUGAR[p.en].xy, xy = [c[0] + Math.sin(t / 9 + c[1]) * 1.2, c[1] + Math.cos(t / 11) * 1.2]; return { pos: xy, xy, mov: false, vel: 0 };
}
const sedeMasCerca = xy => Object.entries(SEDES_XY).map(([k, g]) => [k, distXY(xy, g)]).sort((a, b) => a[1] - b[1])[0];
let visorVivo = null, esperaVivo = null, filtro = 'todos', hace = {};
const VISTA_TODO = { centro: [-20, 15], dist: 330, alto: 0.7, rumbo: -0.5 }, VISTA_CERCA = { centro: [25, 30], dist: 190, alto: 0.6, rumbo: -0.4 };
function iniciarMapaVivo() {
  if (!estado.usuario || !['seguridad', 'traslado', 'coordinacion'].includes(estado.usuario.rol)) return;
  if (esperaVivo) return esperaVivo;
  esperaVivo = cargarLibs().then(() => { visorVivo = crearVisor($('#mapaVivo'), { capaHTML: $('#vivoMarcas') }); return visorVivo.iniciar(VISTA_TODO); }).then(() => {
    for (const [k, xy] of Object.entries(SEDES_XY)) { const el = document.createElement('div'); el.innerHTML = `<span class="marca-sede">${k === 'malecon' ? '⛺' : '🏨'} ${SEDES[k].corto}</span>`; visorVivo.marca('sede:' + k, xy, el, k === 'malecon' ? 12 : 48); }
    visorVivo.ruta(MAPA.rutas['jaragua-sheraton'].nodos.map(n => MAPA.xy[n]));
    EQUIPO.forEach(p => hace[p.id] = 3 + Math.floor(Math.random() * 30));
    setInterval(actualizarVivo, 1000); actualizarVivo();
  }).catch(() => { esperaVivo = null; $('#mapaVivo').insertAdjacentHTML('beforeend', '<div class="capa-msg"><div><b>No se pudo cargar la maqueta 3D</b>Hace falta internet la primera vez. La lista del equipo funciona igual.</div></div>'); });
  $('#mvHotel').onclick = () => visorVivo && visorVivo.volar(VISTA_CERCA, 1800);
  $('#mvTodo').onclick = () => visorVivo && visorVivo.volar(VISTA_TODO, 1800);
  $('#mv3d').onclick = () => { if (!visorVivo) return; const on = $('#mv3d').classList.toggle('on'); visorVivo.cenital = !on; visorVivo.volar(VISTA_TODO, 900); };
  return esperaVivo;
}
function marcaHTML(p, yo) { const c = COLOR_ROL[p.rol]; return `<div class="marca-vivo${yo ? ' yo' : ''}" style="background:${c}">${yo ? 'TÚ' : iniciales(p.n)}</div>`; }
let ultimaLista = 0;
function equipoAhora(t) {
  const yo = compartiendo() && estado.usuario ? estado.usuario : null;
  const todos = EQUIPO.filter(p => !yo || p.n !== yo.nombre).map(p => ({ p, ...posicion(p, t), lugar: p.lugar || null }));
  if (yo) {
    const sedeYo = estado.comision ? ASIGNA[estado.comision][0] : 'jaragua', l = lugarActual();
    let pos, acc = miPos && miPos.real ? miPos.acc : 15;
    if (l) { pos = l.xy; acc = 3; }
    else pos = miPos && miPos.real ? aXY(miPos) : SEDES_XY[sedeYo];
    todos.unshift({ p: { id: 'yo', n: yo.nombre + ' (tú)', rol: yo.rol, det: 'Compartiendo desde este teléfono' }, pos, xy: pos, acc, lugar: l ? l.n : null, mov: false, vel: 0, yo: true });
  }
  return todos;
}
function actualizarVivo() {
  const t = performance.now() / 1000, filas = [];
  const todos = equipoAhora(t);
  if (visorVivo && visorVivo.listo) {
    if (!compartiendo()) { visorVivo.aro('precision', null); visorVivo.quitar('yo'); }
    for (const x of todos) {
      const visible = filtro === 'todos' || (filtro === 'mov' && x.mov) || filtro === x.p.rol;
      if (!visorVivo.marcas.has(x.p.id)) { const el = document.createElement('div'); el.innerHTML = marcaHTML(x.p, x.yo); el.title = `${x.p.n} · ${x.p.det}`; visorVivo.marca(x.p.id, x.pos, el, 2); }
      else visorVivo.marca(x.p.id, x.pos);
      visorVivo.marcas.get(x.p.id).el.style.opacity = visible ? 1 : .15;
      if (x.yo) visorVivo.aro('precision', x.pos, x.acc || 15, '#2fd38c');   // círculo de precisión, como en Google Maps
    }
  }
  for (const x of todos) {
    const visible = filtro === 'todos' || (filtro === 'mov' && x.mov) || filtro === x.p.rol;
    if (!visible) continue;
    if (x.yo) hace.yo = 0; else hace[x.p.id] = (hace[x.p.id] + 1) % 45;
    const sede = sedeMasCerca(x.pos), nom = SEDES[sede[0]].corto;
    const donde = x.mov ? `Caminando · a ${Math.round(sede[1])} m de ${nom}` : `Quieto · ${nom}`;
    const dondeF = (x.lugar ? `📍 En ${x.lugar} · confirmado` : donde) + (x.yo && x.acc ? ` · ±${x.acc} m` : '');
    filas.push({ x, donde: dondeF, lejos: !x.lugar && sede[1] > 250 });
  }
  $('#vivoCuenta').textContent = `${todos.length} compartiendo`;
  const alertas = filas.filter(f => f.lejos).map(f => `<div class="alerta-vivo" data-id="${f.x.p.id}">⚠️ <div><b>${esc(f.x.p.n)}</b> está fuera de la zona de su sede (${f.donde.split('· ')[1] || ''}). <span style="color:var(--suave)">Toca para verlo.</span></div></div>`);
  $('#vivoAlertas').innerHTML = alertas.join('');
  if (Date.now() - ultimaLista > 1800) {
    ultimaLista = Date.now();
    $('#vivoLista').innerHTML = filas.map(({ x, donde }) => `<div class="persona" data-id="${x.p.id}"><div class="av" style="background:${COLOR_ROL[x.p.rol]}">${x.yo ? 'TÚ' : iniciales(x.p.n)}</div><div class="info"><b>${esc(x.p.n)}</b><small>${donde}</small><small>${esc(x.p.det)}</small></div><div class="hace">${x.mov ? '<span style="color:var(--naranja)">● en movimiento</span><br>' : ''}hace ${hace[x.p.id] || 0} s</div></div>`).join('') || '<div style="color:var(--suave);font-size:13px;padding:8px">Nadie con ese filtro.</div>';
  }
}
$('#filtros').onclick = e => { const b = e.target.closest('button'); if (!b) return; filtro = b.dataset.f; $$('#filtros button').forEach(x => x.classList.toggle('on', x === b)); ultimaLista = 0; actualizarVivo(); };
function centrar(e) {
  const el = e.target.closest('[data-id]'); if (!el || !visorVivo || !visorVivo.listo) return;
  const x = equipoAhora(performance.now() / 1000).find(y => y.p.id === el.dataset.id); if (!x) return;
  visorVivo.volar({ centro: x.pos, dist: 70, alto: 0.65, rumbo: -0.4 }, 1400); toast(`${x.p.n} · ${x.p.det}`);
}
$('#vivoLista').onclick = centrar; $('#vivoAlertas').onclick = centrar;
$('#bVer3d').onclick = () => { elegirSede('todas'); $('#mapa').scrollIntoView(); setTimeout(() => { if (!capas.vivo) activarCapa('vivo'); }, 400); };
