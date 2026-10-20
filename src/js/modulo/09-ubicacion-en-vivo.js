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
const LUGARES = MAPA.lugares.filter(l => l.tipo !== 'referencia').map(l => ({ id: l.id, n: l.n, sede: l.sede, ll: l.ll }));
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
// Punto a una fracción u (0 a 1) del recorrido, medida en metros reales
function enRuta(pts, u) {
  const tramos = pts.slice(1).map((p, i) => distM(pts[i], p)), total = tramos.reduce((a, b) => a + b, 0);
  let falta = u * total;
  for (let i = 0; i < tramos.length; i++) {
    if (falta <= tramos[i]) { const f = tramos[i] ? falta / tramos[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; }
    falta -= tramos[i];
  }
  return pts[pts.length - 1];
}
function posicion(p, t) {
  if (p.ruta) { const k = (t / p.periodo + (p.fase || 0)) % 2, u = k < 1 ? k : 2 - k, quieto = u < .03 || u > .97; return { pos: enRuta(p.ruta, u), mov: !quieto, vel: quieto ? 0 : 4 }; }
  const c = LUGAR[p.en].ll; return { pos: [c[0] + Math.sin(t / 9 + c[1]) * .000012, c[1] + Math.cos(t / 11) * .000012], mov: false, vel: 0 };
}
const sedeMasCerca = ll => Object.entries(SEDES_GPS).map(([k, g]) => [k, distM(ll, g)]).sort((a, b) => a[1] - b[1])[0];
let mapaVivo = null, marcas = {}, filtro = 'todos', hace = {}, vivoListo = false;
const VISTA_TODO = { center: ll2(CENTRO_SEDES), zoom: 17, pitch: 50, bearing: -28 };
const VISTA_CERCA = { center: ll2(CENTRO_SEDES), zoom: 17.8, pitch: 60, bearing: -28 };
function iniciarMapaVivo() {
  if (!estado.usuario || !['seguridad', 'traslado', 'coordinacion'].includes(estado.usuario.rol) || !window.maplibregl) return;
  if (mapaVivo) { mapaVivo.resize(); return; }
  mapaVivo = new maplibregl.Map({
    container: 'mapaVivo', ...VISTA_TODO, maxPitch: 75, minZoom: 13, attributionControl: { compact: true },
    style: { version: 8, sources: {
      sat: { type: 'raster', tiles: [SAT], tileSize: 256, maxzoom: 19, attribution: 'Imágenes © Esri, Maxar · Edificios © OpenStreetMap' },
      etiquetas: { type: 'raster', tiles: [ETIQUETAS], tileSize: 256, maxzoom: 19 },
    }, layers: [
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'etiquetas', type: 'raster', source: 'etiquetas', paint: { 'raster-opacity': .85 } },
    ] },
  });
  mapaVivo.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  mapaVivo.on('load', () => {
    mapaVivo.addSource('edificios', { type: 'geojson', data: MAPA.edificios });
    mapaVivo.addLayer({ id: 'edificios', type: 'fill-extrusion', source: 'edificios', paint: { 'fill-extrusion-color': COLOR_SEDE, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': .75 } });
    mapaVivo.addSource('caminos', { type: 'geojson', data: { type: 'FeatureCollection', features: MAPA.tramos.map(([a, b]) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: [ll2(MAPA.nodos[a]), ll2(MAPA.nodos[b])] } })) } });
    mapaVivo.addLayer({ id: 'caminos', type: 'line', source: 'caminos', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#b14dff', 'line-width': 4, 'line-opacity': .7, 'line-dasharray': [1.5, 1.2] } });
    mapaVivo.addSource('precision', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    mapaVivo.addLayer({ id: 'precision', type: 'fill', source: 'precision', paint: { 'fill-color': '#2fd38c', 'fill-opacity': .22 } });
    vivoListo = true;
  });
  for (const [k, ll] of Object.entries(SEDES_GPS)) { const el = document.createElement('div'); el.innerHTML = `<span class="marca-sede" style="transform:none">${k === 'malecon' ? '⛺' : '🏨'} ${SEDES[k].corto}</span>`; new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -24] }).setLngLat(ll2(ll)).addTo(mapaVivo); }
  $('#mvHotel').onclick = () => mapaVivo.flyTo({ ...VISTA_CERCA, pitch: $('#mv3d').classList.contains('on') ? 60 : 0, duration: 2000 });
  $('#mvTodo').onclick = () => mapaVivo.flyTo({ ...VISTA_TODO, pitch: $('#mv3d').classList.contains('on') ? 50 : 0, duration: 2000 });
  $('#mv3d').onclick = () => { const on = $('#mv3d').classList.toggle('on'); mapaVivo.easeTo({ pitch: on ? 60 : 0, bearing: on ? -28 : 0, duration: 900 }); if (vivoListo) mapaVivo.setLayoutProperty('edificios', 'visibility', on ? 'visible' : 'none'); };
  EQUIPO.forEach(p => hace[p.id] = 3 + Math.floor(Math.random() * 30));
  setInterval(actualizarVivo, 1000); actualizarVivo();
}
function marcaHTML(p, yo) { const c = COLOR_ROL[p.rol]; return `<div class="marca-vivo${yo ? ' yo' : ''}" style="background:${c}">${yo ? 'TÚ' : iniciales(p.n)}</div>`; }
let ultimaLista = 0;
function equipoAhora(t) {
  const yo = compartiendo() && estado.usuario ? estado.usuario : null;
  const todos = EQUIPO.filter(p => !yo || p.n !== yo.nombre).map(p => ({ p, ...posicion(p, t), lugar: p.lugar || null }));
  if (yo) {
    const sedeYo = estado.comision ? ASIGNA[estado.comision][0] : 'jaragua', l = lugarActual();
    let pos, acc = miPos && miPos.real ? miPos.acc : 15;
    if (l) { pos = l.ll; acc = 3; }
    else pos = miPos && miPos.real ? miPos : SEDES_GPS[sedeYo];
    todos.unshift({ p: { id: 'yo', n: yo.nombre + ' (tú)', rol: yo.rol, det: 'Compartiendo desde este teléfono' }, pos, acc, lugar: l ? l.n : null, mov: false, vel: 0, yo: true });
  }
  return todos;
}
function actualizarVivo() {
  const t = performance.now() / 1000, filas = [];
  const todos = equipoAhora(t);
  if (!compartiendo()) { if (vivoListo) mapaVivo.getSource('precision').setData({ type: 'FeatureCollection', features: [] }); if (marcas.yo) { marcas.yo.remove(); delete marcas.yo; } }
  for (const x of todos) {
    const visible = filtro === 'todos' || (filtro === 'mov' && x.mov) || filtro === x.p.rol;
    if (!marcas[x.p.id]) { const el = document.createElement('div'); el.innerHTML = marcaHTML(x.p, x.yo); el.style.cursor = 'pointer'; marcas[x.p.id] = new maplibregl.Marker({ element: el }).setLngLat(ll2(x.pos)).setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(`<b>${esc(x.p.n)}</b><br>${esc(x.p.det)}`)).addTo(mapaVivo); }
    marcas[x.p.id].setLngLat(ll2(x.pos)); marcas[x.p.id].getElement().style.opacity = visible ? 1 : .15;
    if (x.yo && vivoListo) mapaVivo.getSource('precision').setData(circulo(x.pos, x.acc || 15)); // círculo de precisión, como en Google Maps
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
function centrar(e) { const el = e.target.closest('[data-id]'), m = el && marcas[el.dataset.id]; if (!m) return; mapaVivo.flyTo({ center: m.getLngLat(), zoom: 18, pitch: $('#mv3d').classList.contains('on') ? 60 : 0, duration: 1600 }); if (!m.getPopup().isOpen()) m.togglePopup(); }
$('#vivoLista').onclick = centrar; $('#vivoAlertas').onclick = centrar;
$('#bVer3d').onclick = () => { elegirSede('todas'); $('#mapa').scrollIntoView(); setTimeout(() => { if (!capas.vivo) activarCapa('vivo'); }, 400); };
