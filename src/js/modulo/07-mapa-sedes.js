// ---------- Mapa de las sedes: Renaissance Jaragua, Sheraton y Malecón Terrace ----------
// Foto satelital real (Esri, gratis y sin llave), edificios en 3D con los contornos de OpenStreetMap
// y rutas a pie calculadas sobre los caminos trazados (como el GPS de un videojuego).
const LUGAR = Object.fromEntries(MAPA.lugares.map(l => [l.id, l]));
const SEDES_GPS = { jaragua: LUGAR['j-lobby'].ll, sheraton: LUGAR['s-lobby'].ll, malecon: LUGAR['malecon-terrace'].ll };
const CENTRO_SEDES = [(SEDES_GPS.jaragua[0] + SEDES_GPS.sheraton[0]) / 2, (SEDES_GPS.jaragua[1] + SEDES_GPS.sheraton[1]) / 2];
const ll2 = ([la, lo]) => [lo, la];
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Salón de una comisión (texto libre, como lo escribe coordinación) → lugar del mapa
function lugarDeSalon(salon, sede) {
  const s = sinTildes(salon || '');
  if (!s) return LUGAR[sede === 'sheraton' ? 's-lobby' : sede === 'malecon' ? 'malecon-terrace' : 'j-lobby'];
  if (/anacaona|seccion [123]/.test(s)) return LUGAR.anacaona;
  if (/^este|este i/.test(s)) return LUGAR.este;
  if (/malecon/.test(s)) return LUGAR['malecon-terrace'];
  if (/ejecutiv|executive|atabey/.test(s)) return LUGAR.atabey;
  return MAPA.lugares.find(l => l.tipo === 'salon' && sinTildes(l.n).startsWith(s.split(' ')[0])) || LUGAR[sede === 'sheraton' ? 's-lobby' : 'j-lobby'];
}

// ---------- Rutas a pie (camino más corto sobre los tramos trazados) ----------
const VECINOS = {};
for (const [a, b, nota] of MAPA.tramos) {
  const d = distM(MAPA.nodos[a], MAPA.nodos[b]);
  (VECINOS[a] = VECINOS[a] || []).push([b, d, nota]);
  (VECINOS[b] = VECINOS[b] || []).push([a, d, nota]);
}
function nodoCercano(ll) {
  let mejor = null, dm = Infinity;
  for (const [k, p] of Object.entries(MAPA.nodos)) { const d = distM(ll, p); if (d < dm) { dm = d; mejor = k; } }
  return [mejor, dm];
}
function caminoEntre(a, b) {
  const dist = { [a]: 0 }, previo = {}, notas = {}, abiertos = new Set([a]), cerrados = new Set();
  while (abiertos.size) {
    let n = null; for (const x of abiertos) if (n === null || dist[x] < dist[n]) n = x;
    if (n === b) break;
    abiertos.delete(n); cerrados.add(n);
    for (const [v, d, nota] of VECINOS[n] || []) {
      if (cerrados.has(v)) continue;
      const nd = dist[n] + d;
      if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; previo[v] = n; notas[v] = nota; abiertos.add(v); }
    }
  }
  if (dist[b] === undefined) return null;
  const nodos = [b]; while (nodos[0] !== a) nodos.unshift(previo[nodos[0]]);
  return { nodos, notas: nodos.slice(1).map(n => notas[n]) };
}
// origen: id de lugar o [lat, lon] (la posición del GPS); destino: id de lugar
function calcularRuta(origen, destino) {
  const dest = LUGAR[destino]; if (!dest) return null;
  const llO = Array.isArray(origen) ? origen : LUGAR[origen].ll;
  const [nO, dO] = Array.isArray(origen) ? nodoCercano(origen) : [LUGAR[origen].nodo, 0];
  const c = caminoEntre(nO, dest.nodo); if (!c) return null;
  const puntos = [llO, ...c.nodos.map(n => MAPA.nodos[n]), dest.ll].filter((p, i, l) => i === 0 || distM(p, l[i - 1]) > 1.5);
  let metros = 0; for (let i = 1; i < puntos.length; i++) metros += distM(puntos[i - 1], puntos[i]);
  const pasos = [];
  if (Array.isArray(origen) && dO > 12) pasos.push(`Camina unos ${Math.round(dO)} m hasta el camino marcado en morado`);
  for (const n of c.notas) if (n && pasos[pasos.length - 1] !== n) pasos.push(n);
  pasos.push(`Llegaste: ${dest.n}`);
  return { puntos, metros: Math.round(metros), minutos: Math.max(1, Math.round(metros / 70)), pasos, destino: dest };
}

// ---------- El mapa ----------
const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ETIQUETAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const COLOR_SEDE = ['match', ['get', 'sede'], 'jaragua', '#e6c28a', 'sheraton', '#86a9e8', 'malecon', '#ffffff', '#c3c9d6'];
const VISTAS = {
  todas: { center: ll2(CENTRO_SEDES), zoom: 17.15, pitch: 55, bearing: -28 },
  jaragua: { center: ll2(LUGAR['j-lobby'].ll), zoom: 18, pitch: 58, bearing: -20 },
  sheraton: { center: ll2(LUGAR['s-salones'] ? LUGAR['s-salones'].ll : SEDES_GPS.sheraton), zoom: 18.1, pitch: 58, bearing: -35 },
  malecon: { center: ll2(SEDES_GPS.malecon), zoom: 18.6, pitch: 60, bearing: -40 },
};
SEDES.jaragua && (VISTAS.sheraton.center = ll2([(SEDES_GPS.sheraton[0] + LUGAR['s-oeste'].ll[0]) / 2, (SEDES_GPS.sheraton[1] + LUGAR['s-oeste'].ll[1]) / 2]));
let mapa = null, mapaListo = false, rutaActual = null, destinoMarca = null, origenMarca = null;
const capas = { seg: true, vivo: false, admin: false, tresd: true };

function flechaImagen() {
  const t = 48, c = document.createElement('canvas'); c.width = c.height = t;
  const g = c.getContext('2d'); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(16, 10); g.lineTo(32, 24); g.lineTo(16, 38); g.stroke();
  return { width: t, height: t, data: g.getImageData(0, 0, t, t).data };
}
function iniciarMapa() {
  if (mapa || !window.maplibregl) return;
  mapa = new maplibregl.Map({
    container: 'mapaSedes', ...VISTAS[estado.sede] || VISTAS.todas, maxPitch: 75, minZoom: 14, attributionControl: { compact: true },
    style: { version: 8, sources: {
      sat: { type: 'raster', tiles: [SAT], tileSize: 256, maxzoom: 19, attribution: 'Imágenes © Esri, Maxar · Edificios © OpenStreetMap' },
      etiquetas: { type: 'raster', tiles: [ETIQUETAS], tileSize: 256, maxzoom: 19 },
    }, layers: [
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'etiquetas', type: 'raster', source: 'etiquetas', paint: { 'raster-opacity': .85 } },
    ] },
  });
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  mapa.on('error', () => { if (!navigator.onLine) $('#mapaAviso').hidden = false; });
  mapa.on('load', () => {
    mapa.addImage('flecha', flechaImagen());
    mapa.addSource('edificios', { type: 'geojson', data: MAPA.edificios });
    mapa.addLayer({ id: 'edificios', type: 'fill-extrusion', source: 'edificios', paint: { 'fill-extrusion-color': COLOR_SEDE, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': .82 } });
    mapa.addSource('ruta', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, lineMetrics: true });
    mapa.addLayer({ id: 'ruta-brillo', type: 'line', source: 'ruta', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#b14dff', 'line-width': 22, 'line-blur': 10, 'line-opacity': .55 } });
    mapa.addLayer({ id: 'ruta', type: 'line', source: 'ruta', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#9b2cff', 'line-width': 9 } });
    mapa.addLayer({ id: 'ruta-paso', type: 'line', source: 'ruta', layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': '#f3dcff', 'line-width': 3, 'line-dasharray': [0, 4, 3] } });
    mapa.addLayer({ id: 'ruta-flechas', type: 'symbol', source: 'ruta', layout: { 'symbol-placement': 'line', 'symbol-spacing': 70, 'icon-image': 'flecha', 'icon-size': .42, 'icon-allow-overlap': true, 'icon-rotation-alignment': 'map' } });
    mapa.addSource('precision', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    mapa.addLayer({ id: 'precision', type: 'fill', source: 'precision', paint: { 'fill-color': '#3b8bff', 'fill-opacity': .18 } });
    mapaListo = true;
    // de lejos solo se ven los íconos; los nombres de salones y puntos aparecen al acercarse
    const distancia = () => $('#caja').classList.toggle('lejos', mapa.getZoom() < 18.2);
    mapa.on('zoom', distancia); distancia();
    pintarLugares(); dibujarPines();
    if (rutaActual) dibujarRuta(rutaActual);
    animarPaso();
  });
}
// Las rayitas de la ruta avanzan, para que se entienda hacia dónde ir
const PASOS_RAYA = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, .5], [3, 4, 0], [0, .5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, .5]];
let pasoRaya = 0, ultimoPaso = 0;
function animarPaso(t = 0) {
  if (mapaListo && rutaActual && t - ultimoPaso > 70 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ultimoPaso = t; pasoRaya = (pasoRaya + 1) % PASOS_RAYA.length;
    mapa.setPaintProperty('ruta-paso', 'line-dasharray', PASOS_RAYA[pasoRaya]);
  }
  requestAnimationFrame(animarPaso);
}
new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { iniciarMapa(); if (mapa) mapa.resize(); } }, { rootMargin: '200px' }).observe($('#mapa'));

// ---------- Lugares en el mapa ----------
const ICONO_TIPO = { lobby: 'L', salon: 'S', entrada: 'E', terraza: 'T', casino: 'C', referencia: '·', encuentro: 'P' };
let marcasLugares = [];
function pintarLugares() {
  if (!mapaListo) return;
  marcasLugares.forEach(m => m.remove()); marcasLugares = [];
  const mio = miSalon() ? lugarDeSalon(miSalon(), ASIGNA[estado.comision][0]) : null;
  for (const l of MAPA.lugares) {
    if (l.tipo === 'encuentro' && !capas.seg) continue;
    const el = document.createElement('button'); el.type = 'button';
    el.className = `lugar-mapa s-${l.sede} t-${l.tipo}${mio && mio.id === l.id ? ' mio' : ''}`;
    const coms = Object.entries(ASIGNA).filter(([, a]) => lugarDeSalon(a[1], a[0]).id === l.id).map(([c]) => c);
    el.innerHTML = `<i>${ICONO_TIPO[l.tipo] || '·'}</i><span>${esc(l.n)}${coms.length ? ` <small>${coms.join(', ')}</small>` : ''}</span>`;
    el.onclick = () => { $('#rDestino').value = l.id; $('#ficha').innerHTML = `<b>${esc(l.n)}</b>${SEDES[l.sede] ? SEDES[l.sede].nombre : ''}${coms.length ? ' · ' + coms.join(', ') : ''}<br><button class="mini" data-ir="${l.id}">Cómo llegar aquí</button>`; };
    marcasLugares.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(ll2(l.ll)).addTo(mapa));
  }
}
$('#ficha').onclick = e => { const b = e.target.closest('[data-ir]'); if (b) { $('#rDestino').value = b.dataset.ir; irA(); } };

// ---------- Cómo llegar ----------
const opcionLugar = l => `<option value="${l.id}">${esc(l.n)}</option>`;
const gruposLugares = () => ['jaragua', 'sheraton', 'malecon'].map(s => `<optgroup label="${SEDES[s].nombre}">${MAPA.lugares.filter(l => l.sede === s && l.tipo !== 'referencia').map(opcionLugar).join('')}</optgroup>`).join('');
$('#rOrigen').innerHTML = '<option value="gps">Mi ubicación (GPS)</option>' + gruposLugares();
$('#rDestino').innerHTML = gruposLugares();
$('#rOrigen').value = 'j-lobby'; $('#rDestino').value = 's-oeste';
function dibujarRuta(r) {
  rutaActual = r;
  if (!mapaListo) return;
  mapa.getSource('ruta').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.puntos.map(ll2) } });
  if (destinoMarca) destinoMarca.remove();
  const el = document.createElement('div'); el.className = 'destino-mapa'; el.innerHTML = '<i></i>';
  destinoMarca = new maplibregl.Marker({ element: el }).setLngLat(ll2(r.destino.ll)).addTo(mapa);
  if (origenMarca) origenMarca.remove();
  const eo = document.createElement('div'); eo.className = 'origen-mapa';
  origenMarca = new maplibregl.Marker({ element: eo }).setLngLat(ll2(r.puntos[0])).addTo(mapa);
  const b = new maplibregl.LngLatBounds(); r.puntos.forEach(p => b.extend(ll2(p)));
  mapa.fitBounds(b, { padding: { top: 70, bottom: 70, left: 50, right: 50 }, pitch: capas.tresd ? 55 : 0, bearing: mapa.getBearing(), duration: 1400, maxZoom: 18.6 });
}
function pintarRutaTexto(r, nota = '') {
  $('#rCard').hidden = false;
  $('#rResumen').innerHTML = `<b>${r.metros} m</b><span>${r.minutos} min a pie</span><span class="r-dest">${esc(r.destino.n)}</span>`;
  $('#rPasos').innerHTML = r.pasos.map((p, i) => `<li class="${i === r.pasos.length - 1 ? 'fin' : ''}">${esc(p)}</li>`).join('');
  $('#rNota').innerHTML = nota;
}
function irA(origen) {
  iniciarMapa();
  const o = origen || $('#rOrigen').value, d = $('#rDestino').value;
  if (o === 'gps') return irDesdeGPS(d);
  if (o === d) return toast('El origen y el destino son el mismo lugar');
  const r = calcularRuta(o, d); if (!r) return toast('No encontré un camino entre esos dos lugares');
  pintarRutaTexto(r); dibujarRuta(r);
}
$('#rIr').onclick = () => irA();
$('#rCambiar').onclick = () => { const o = $('#rOrigen').value; if (o === 'gps') return; [$('#rOrigen').value, $('#rDestino').value] = [$('#rDestino').value, o]; irA(); };
$('#rRapidas').onclick = e => { const b = e.target.closest('[data-o]'); if (!b) return; $('#rOrigen').value = b.dataset.o; $('#rDestino').value = b.dataset.d; irA(); };
$('#rMiSalon').onclick = () => {
  if (!miSalon()) return toast('Primero escoge tu comisión en Inicio');
  const [sede, salon] = ASIGNA[estado.comision]; $('#rDestino').value = lugarDeSalon(salon, sede).id;
  if ($('#rOrigen').value !== 'gps' && $('#rOrigen').value === $('#rDestino').value) $('#rOrigen').value = sede === 'sheraton' ? 's-oeste' : 'j-lobby';
  irA();
};

// ---------- GPS del teléfono ----------
// Afuera el GPS da ±5 a 15 m; bajo techo empeora. Se ignoran las lecturas peores de 60 m, se promedian
// las últimas (pesan más las precisas) y la ruta se recalcula desde el punto del camino más cercano.
let gpsId = null, gpsLecturas = [], posGPS = null, yoMarca = null, siguiendo = false, avisoLejos = false;
function circulo(c, r, n = 48) {
  const kla = 110540, klo = 111320 * Math.cos(c[0] * Math.PI / 180), pts = [];
  for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; pts.push([c[1] + r * Math.sin(a) / klo, c[0] + r * Math.cos(a) / kla]); }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
}
function encenderGPS() {
  if (gpsId !== null) return true;
  if (!navigator.geolocation || !isSecureContext) { toast('Este navegador no deja usar el GPS aquí. Elige el lugar donde estás.'); return false; }
  $('#gpsEstado').textContent = 'Buscando tu ubicación…';
  gpsId = navigator.geolocation.watchPosition(p => {
    const { latitude: la, longitude: lo, accuracy: acc, heading } = p.coords;
    $('#gpsEstado').textContent = `GPS ±${Math.round(acc)} m`;
    if (acc > 60) return;
    gpsLecturas.push([la, lo, acc]); if (gpsLecturas.length > 4) gpsLecturas.shift();
    let w = 0, a = 0, b = 0; for (const [x, y, c] of gpsLecturas) { const k = 1 / (c * c); w += k; a += x * k; b += y * k; }
    posGPS = [a / w, b / w]; posGPS.acc = Math.round(Math.min(...gpsLecturas.map(l => l[2]))); posGPS.rumbo = heading;
    moverYo();
  }, err => { $('#gpsEstado').textContent = err.code === 1 ? 'Sin permiso de ubicación' : 'No se pudo leer el GPS'; apagarGPS(); }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  return true;
}
function apagarGPS() { if (gpsId !== null) navigator.geolocation.clearWatch(gpsId); gpsId = null; siguiendo = false; $('#rSeguir').classList.remove('on'); }
function moverYo() {
  if (!posGPS || !mapaListo) return;
  if (!yoMarca) { const el = document.createElement('div'); el.className = 'yo-mapa'; el.innerHTML = '<i></i>'; yoMarca = new maplibregl.Marker({ element: el, rotationAlignment: 'map' }).setLngLat(ll2(posGPS)).addTo(mapa); }
  yoMarca.setLngLat(ll2(posGPS)); if (posGPS.rumbo != null && !isNaN(posGPS.rumbo)) yoMarca.setRotation(posGPS.rumbo);
  mapa.getSource('precision').setData(circulo(posGPS, posGPS.acc || 10));
  if (siguiendo) {
    const d = $('#rDestino').value, dest = LUGAR[d];
    if (dest && distM(posGPS, dest.ll) < 15) { toast(`Llegaste a ${dest.n}`); siguiendo = false; $('#rSeguir').classList.remove('on'); }
    else irDesdeGPS(d, true);
  }
}
function irDesdeGPS(destino, silencioso) {
  if (!encenderGPS()) return;
  if (!posGPS) { if (!silencioso) toast('Esperando la señal del GPS… sal a un lugar abierto si tarda'); setTimeout(() => posGPS && irDesdeGPS(destino, true), 2500); return; }
  const lejos = Math.min(...Object.values(SEDES_GPS).map(s => distM(posGPS, s)));
  const dest = LUGAR[destino];
  if (lejos > 700) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.ll[0]},${dest.ll[1]}&travelmode=walking`;
    $('#rCard').hidden = false;
    $('#rResumen').innerHTML = `<b>${(lejos / 1000).toFixed(1)} km</b><span>estás lejos de las sedes</span><span class="r-dest">${esc(dest.n)}</span>`;
    $('#rPasos').innerHTML = '<li>Para llegar hasta el hotel usa Google Maps; cuando estés a menos de 700 m, esta ruta te guía por dentro.</li>';
    $('#rNota').innerHTML = `<a class="boton sec" href="${url}" target="_blank" rel="noopener">Abrir en Google Maps</a>`;
    if (!avisoLejos) { avisoLejos = true; mapa && mapa.flyTo({ center: ll2(posGPS), zoom: 14 }); }
    return;
  }
  const r = calcularRuta(posGPS, destino); if (!r) return;
  pintarRutaTexto(r, `Tu posición: GPS ±${posGPS.acc} m${posGPS.acc > 25 ? ' · bajo techo el GPS se mueve; guíate por los pasos' : ''}`);
  if (silencioso && rutaActual) { rutaActual = r; mapa.getSource('ruta').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.puntos.map(ll2) } }); if (origenMarca) origenMarca.setLngLat(ll2(r.puntos[0])); }
  else dibujarRuta(r);
}
$('#rSeguir').onclick = () => {
  siguiendo = !siguiendo; $('#rSeguir').classList.toggle('on', siguiendo);
  if (siguiendo) { $('#rOrigen').value = 'gps'; irDesdeGPS($('#rDestino').value); toast('Te guío con el GPS: la ruta se actualiza mientras caminas'); }
};
$('#rCentrar').onclick = () => { if (!encenderGPS()) return; if (posGPS && mapa) mapa.flyTo({ center: ll2(posGPS), zoom: 18.4, duration: 1200 }); else toast('Esperando la señal del GPS…'); };

// ---------- Sedes y capas ----------
$('#sedes').innerHTML = [['todas', 'Las dos sedes', 'Jaragua y Sheraton'], ...['jaragua', 'sheraton', 'malecon'].map(k => [k, SEDES[k].nombre, SEDES[k].zona])].map(([k, n, z]) => `<button data-s="${k}"><b>${n}</b><small>${z}</small></button>`).join('');
$('#sedes').onclick = e => { const b = e.target.closest('button'); if (b) elegirSede(b.dataset.s); };
function elegirSede(s, volar) {
  estado.sede = VISTAS[s] ? s : 'todas';
  $$('#sedes button').forEach(b => b.classList.toggle('on', b.dataset.s === estado.sede));
  if (mapa) mapa.flyTo({ ...VISTAS[estado.sede], pitch: capas.tresd ? VISTAS[estado.sede].pitch : 0, duration: 1600 });
  if (volar && miSalon()) mostrarLugar(lugarDeSalon(miSalon(), ASIGNA[estado.comision][0]).id);
  pintarLugares();
}
function mostrarLugar(id, texto) {
  const l = LUGAR[id] || (Array.isArray(id) ? { n: texto || 'Punto', ll: id, sede: '' } : null); if (!l) return;
  iniciarMapa();
  const ir = () => mapa.flyTo({ center: ll2(l.ll), zoom: 18.8, pitch: capas.tresd ? 60 : 0, duration: 1500 });
  if (mapaListo) ir(); else mapa.once('load', ir);
  $('#ficha').innerHTML = `<b>${esc(texto || l.n)}</b>${SEDES[l.sede] ? SEDES[l.sede].nombre : ''}${LUGAR[id] ? `<br><button class="mini" data-ir="${id}">Cómo llegar aquí</button>` : ''}`;
}
const mostrarSalon = (salon, sede) => mostrarLugar(lugarDeSalon(salon, sede).id, salon);
const miSalon = () => estado.comision && ASIGNA[estado.comision] ? ASIGNA[estado.comision][1] : null;
const BOTON_CAPA = { seg: '#cSeg', vivo: '#cVivo', admin: '#cAdmin', tresd: '#c3d' };
function activarCapa(c) {
  capas[c] = !capas[c]; $(BOTON_CAPA[c]).classList.toggle('on', capas[c]);
  if (c === 'tresd' && mapa) { mapa.easeTo({ pitch: capas.tresd ? 55 : 0, duration: 800 }); if (mapaListo) mapa.setLayoutProperty('edificios', 'visibility', capas.tresd ? 'visible' : 'none'); }
  if (c === 'vivo') pintarVivoMapa();
  if (c === 'admin') toast(capas.admin ? 'Toca el mapa para poner un punto · toca un punto para cambiarlo' : 'Listo, ya no estás editando el mapa');
  pintarLugares(); dibujarPines();
}
$('#cSeg').onclick = () => activarCapa('seg'); $('#cVivo').onclick = () => activarCapa('vivo'); $('#cAdmin').onclick = () => activarCapa('admin'); $('#c3d').onclick = () => activarCapa('tresd');

// ---------- Puntos que agrega coordinación (acreditación, baños, salidas…) ----------
const CATS = {
  acreditacion: ['Acreditación', '🪪', '#a974ff'], movilidad: ['Movilización', '🚶', '#ff9a3c'], eventos: ['Eventos', '🎤', '#2f7bff'],
  seguridad: ['Seguridad', '🛡️', '#ff4d5e', 'seg'], salida: ['Salida de emergencia', '🟩', '#2fd38c', 'seg'], salud: ['Primeros auxilios', '⛑️', '#ff4d5e', 'seg'],
  encuentro: ['Punto de encuentro', '🟢', '#2fd38c', 'seg'], info: ['Información', 'ℹ️', '#45c8ff'], banos: ['Baños', '🚻', '#45c8ff'],
  comida: ['Comida', '🍽️', '#ffd23f'], agua: ['Agua', '💧', '#45c8ff'], prensa: ['Prensa', '📰', '#9aa8cc'], otro: ['Otro', '📍', '#9aa8cc'],
};
const cerca = (id, dla, dlo) => [LUGAR[id].ll[0] + dla, LUGAR[id].ll[1] + dlo];
const PUNTOS_INICIALES = [
  ['Acreditación del staff', 'acreditacion', cerca('j-lobby', .00004, -.00008)], ['Información', 'info', cerca('s-lobby', -.00003, .00005)],
  ['Primeros auxilios · Jaragua', 'salud', cerca('j-lobby', -.00005, .00009)], ['Primeros auxilios · Sheraton', 'salud', cerca('s-oeste', .00003, .00008)],
  ['Seguridad del hotel · Jaragua', 'seguridad', cerca('j-lobby', .00008, .00004)], ['Seguridad del hotel · Sheraton', 'seguridad', cerca('s-lobby', .00004, -.00006)],
  ['Punto de encuentro · Jaragua', 'encuentro', LUGAR['encuentro-jaragua'].ll], ['Punto de encuentro · Sheraton', 'encuentro', LUGAR['encuentro-sheraton'].ll],
  ['Salida hacia el Sheraton', 'movilidad', LUGAR['j-este'].ll], ['Comida · Malecón Terrace', 'comida', cerca('malecon-terrace', -.00004, .00006)],
].map(([n, cat, ll], i) => ({ id: 'p' + i, n, cat, ll }));
estado.puntos = leer('puntos-sedes', null) || PUNTOS_INICIALES.map(p => ({ ...p }));
const catOculta = new Set();
const verCat = c => !catOculta.has(c) && (!CATS[c][3] || capas[CATS[c][3]]);
let marcasPuntos = [], editando = null, moviendo = null, nuevo = null, catElegida = 'acreditacion';
function pintarLeyenda() {
  const usadas = [...new Set(estado.puntos.map(q => q.cat))];
  $('#leyenda').innerHTML = usadas.map(k => `<button data-k="${k}" class="${verCat(k) ? '' : 'off'}"><span style="background:${CATS[k][2]}">${CATS[k][1]}</span>${CATS[k][0]}</button>`).join('');
}
$('#leyenda').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, cap = CATS[k][3];
  if (cap && !capas[cap]) { catOculta.delete(k); activarCapa(cap); return; }
  catOculta.has(k) ? catOculta.delete(k) : catOculta.add(k); dibujarPines();
};
function dibujarPines() {
  pintarLeyenda();
  if (!mapaListo) return;
  marcasPuntos.forEach(m => m.remove()); marcasPuntos = [];
  for (const q of estado.puntos.filter(x => verCat(x.cat) && x.ll)) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'punto-mapa' + (editando === q.id ? ' editando' : '');
    el.innerHTML = `<i style="background:${CATS[q.cat][2]}">${CATS[q.cat][1]}</i><span>${esc(q.n)}</span>`;
    el.onclick = ev => { ev.stopPropagation(); tocarPunto(q.id); };
    marcasPuntos.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(ll2(q.ll)).addTo(mapa));
  }
}
$('#pIconos').innerHTML = Object.entries(CATS).map(([k, [n, ic, c]]) => `<button data-k="${k}"><span style="background:${c}">${ic}</span>${n}</button>`).join('');
const marcarCat = k => { catElegida = k; $$('#pIconos button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
$('#pIconos').onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = $('#pNombre').value.trim(); marcarCat(b.dataset.k); if (!v || Object.values(CATS).some(c => c[0] === v)) $('#pNombre').value = CATS[b.dataset.k][0]; };
function tocarPunto(id) {
  const q = estado.puntos.find(x => x.id === id); if (!q) return;
  if (capas.admin) return abrirEditor(q);
  $('#ficha').innerHTML = `<b>${CATS[q.cat][1]} ${esc(q.n)}</b>${CATS[q.cat][0]}`;
}
function abrirEditor(q) {
  editando = q ? q.id : null; $('#pTitulo').textContent = q ? 'Editar punto' : 'Nuevo punto';
  $('#pNombre').value = q ? q.n : CATS[catElegida][0]; marcarCat(q ? q.cat : catElegida); $('#pMover').hidden = $('#pBorrar').hidden = !q;
  $('#modal').classList.add('on'); dibujarPines(); setTimeout(() => $('#pNombre').select(), 50);
}
const cerrarEditor = () => { $('#modal').classList.remove('on'); editando = null; dibujarPines(); };
$('#pGuardar').onclick = () => {
  const n = $('#pNombre').value.trim() || CATS[catElegida][0];
  if (editando) { const q = estado.puntos.find(x => x.id === editando); q.n = n; q.cat = catElegida; toast('Punto actualizado'); }
  else if (nuevo) { estado.puntos.push({ id: 'u' + Date.now(), n, cat: catElegida, ll: nuevo }); toast(`"${n}" agregado al mapa`); }
  guardar('puntos-sedes', estado.puntos); cerrarEditor();
};
$('#pBorrar').onclick = () => { estado.puntos = estado.puntos.filter(x => x.id !== editando); guardar('puntos-sedes', estado.puntos); toast('Punto borrado'); cerrarEditor(); };
$('#pMover').onclick = () => { moviendo = editando; $('#modal').classList.remove('on'); toast('Toca en el mapa el nuevo lugar del punto'); };
$('#pCancelar').onclick = () => { moviendo = null; cerrarEditor(); };
function alTocarMapa(e) {
  if (!capas.admin) return;
  const ll = [+e.lngLat.lat.toFixed(7), +e.lngLat.lng.toFixed(7)];
  if (moviendo) { const q = estado.puntos.find(x => x.id === moviendo); if (q) q.ll = ll; moviendo = null; editando = null; guardar('puntos-sedes', estado.puntos); dibujarPines(); toast('Punto movido'); return; }
  nuevo = ll; abrirEditor(null);
}
const esperarMapa = setInterval(() => { if (mapa) { mapa.on('click', alTocarMapa); clearInterval(esperarMapa); } }, 500);

// ---------- Equipo en vivo sobre el mapa (Seguridad, Traslado y Coordinación) ----------
let marcasVivo = {};
function pintarVivoMapa() {
  if (!capas.vivo || !mapaListo || typeof equipoAhora !== 'function') { Object.values(marcasVivo).forEach(m => m.remove()); marcasVivo = {}; return; }
  for (const x of equipoAhora(performance.now() / 1000)) {
    if (!marcasVivo[x.p.id]) { const el = document.createElement('div'); el.innerHTML = marcaHTML(x.p, x.yo); marcasVivo[x.p.id] = new maplibregl.Marker({ element: el }).setLngLat(ll2(x.pos)).setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`<b>${esc(x.p.n)}</b><br>${esc(x.p.det)}`)).addTo(mapa); }
    marcasVivo[x.p.id].setLngLat(ll2(x.pos));
  }
}
setInterval(() => { if (capas.vivo) pintarVivoMapa(); }, 1000);
