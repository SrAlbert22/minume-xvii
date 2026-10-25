// MINUME XVII · Mapa 3D de las sedes: Renaissance Jaragua, Sheraton y Malecón Terrace · Albert Silvestre
// ---------- Mapa 3D de las sedes: Renaissance Jaragua, Sheraton y Malecón Terrace ----------
// La maqueta (plantel.glb) sale de blender/plantel/construir_plantel.py. Todo se mide en metros
// sobre el mismo plano que la maqueta (x al este, y al norte); el GPS se convierte a ese plano.
const LUGAR = Object.fromEntries(MAPA.lugares.map(l => [l.id, l]));
const [LAT0, LON0] = MAPA.origen, M_LAT = 110540, M_LON = 111320 * Math.cos(LAT0 * Math.PI / 180);
const aXY = ([la, lo]) => [(lo - LON0) * M_LON, (la - LAT0) * M_LAT];
const aLL = ([x, y]) => [LAT0 + y / M_LAT, LON0 + x / M_LON];
const distXY = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const SEDES_XY = { jaragua: LUGAR['j-lobby'].xy, sheraton: LUGAR['s-lobby'].xy, malecon: LUGAR['malecon-terrace'].xy };
const SEDES_GPS = Object.fromEntries(Object.entries(SEDES_XY).map(([k, p]) => [k, aLL(p)]));
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ROMANOS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

// Salón de una comisión (texto libre, como lo escribe coordinación) → lugar del mapa
function lugarDeSalon(salon, sede) {
  const s = sinTildes(salon || '');
  if (!s) return LUGAR[sede === 'sheraton' ? 's-lobby' : sede === 'malecon' ? 'malecon-terrace' : 'j-lobby'];
  const este = /^este\s+(i{1,3}|iv|vi?|v)\b/.exec(s); if (este) return LUGAR['este-' + ROMANOS[este[1]]];
  if (/anacaona|seccion [123]/.test(s)) return LUGAR.anacaona;
  if (/malecon/.test(s)) return LUGAR['malecon-terrace'];
  if (/gran salon/.test(s)) return LUGAR['gran-salon'];
  if (/ejecutiv|executive|atabey/.test(s)) return LUGAR.atabey;
  return MAPA.lugares.find(l => l.tipo === 'salon' && sinTildes(l.n).startsWith(s.split(' ')[0])) || LUGAR[sede === 'sheraton' ? 's-lobby' : 'j-lobby'];
}

// ---------- Rutas a pie (camino más corto sobre los tramos) ----------
const VECINOS = {};
for (const [a, b, nota] of MAPA.tramos) {
  const d = distXY(MAPA.xy[a], MAPA.xy[b]);
  (VECINOS[a] = VECINOS[a] || []).push([b, d, nota]);
  (VECINOS[b] = VECINOS[b] || []).push([a, d, nota]);
}
function nodoCercano(p) {
  let mejor = null, dm = Infinity;
  for (const [k, q] of Object.entries(MAPA.xy)) { const d = distXY(p, q); if (d < dm) { dm = d; mejor = k; } }
  return [mejor, dm];
}
// Punto del camino más cercano a una posición, sobre cualquier tramo (no solo en los cruces)
function puntoEnCamino(p) {
  let m = null;
  for (const [a, b, nota] of MAPA.tramos) {
    const A = MAPA.xy[a], B = MAPA.xy[b], dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L2)) : 0;
    const q = [A[0] + t * dx, A[1] + t * dy], d = distXY(p, q);
    if (!m || d < m.d) m = { a, b, nota, q, d, t, L: Math.sqrt(L2) };
  }
  return m;
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
  return { nodos, notas: nodos.slice(1).map(n => notas[n]), metros: dist[b] };
}
// origen: id de un lugar o {xy} (la posición del GPS); destino: id de un lugar
function calcularRuta(origen, destino) {
  const dest = LUGAR[destino]; if (!dest) return null;
  const desdeGps = typeof origen !== 'string', pO = desdeGps ? origen.xy : LUGAR[origen].xy;
  let c, inicio = [pO], dO = 0, notaInicio = null;
  if (desdeGps) {
    // El GPS se «pega» al tramo más cercano y sigue hacia el extremo que deja la ruta más corta:
    // así nunca te manda primero hacia atrás ni traza una línea que atraviese un edificio hasta un cruce.
    const s = puntoEnCamino(pO); dO = s.d;
    const opciones = [[s.a, s.t * s.L], [s.b, (1 - s.t) * s.L]]
      .map(([n, d]) => { const r = caminoEntre(n, dest.nodo); return r && { n, r, total: d + r.metros }; }).filter(Boolean);
    if (!opciones.length) return null;
    const mejor = opciones.sort((x, y) => x.total - y.total)[0]; c = mejor.r;
    inicio = dO > 3 ? [pO, s.q] : [s.q];
    if (mejor.n === s.b && distXY(s.q, MAPA.xy[s.b]) > 6) notaInicio = s.nota;   // las indicaciones están escritas de «a» hacia «b»
  } else { c = caminoEntre(LUGAR[origen].nodo, dest.nodo); if (!c) return null; }
  const puntos = [...inicio, ...c.nodos.map(n => MAPA.xy[n]), dest.xy].filter((p, i, l) => i === 0 || distXY(p, l[i - 1]) > 1.5);
  let metros = 0; for (let i = 1; i < puntos.length; i++) metros += distXY(puntos[i - 1], puntos[i]);
  const pasos = [];
  if (desdeGps && dO > 12) pasos.push(`Camina unos ${Math.round(dO)} m hasta el camino marcado en morado`);
  if (notaInicio) pasos.push(notaInicio);
  for (const n of c.notas) if (n && pasos[pasos.length - 1] !== n) pasos.push(n);
  pasos.push(`Llegaste: ${dest.n}`);
  return { puntos, metros: Math.round(metros), minutos: Math.max(1, Math.round(metros / 70)), pasos, destino: dest };
}

// ---------- Visor 3D (lo usan este mapa y el de «Equipo en vivo») ----------
// three.js se carga solo cuando hace falta: si no hay internet la primera vez, el resto del sistema sigue funcionando
let THREE, OrbitControls, GLTFLoader, DRACOLoader, mergeGeometries, cargaLibs = null;
const cargarLibs = () => cargaLibs || (cargaLibs = Promise.all([
  import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
  import('three/addons/loaders/DRACOLoader.js'), import('three/addons/utils/BufferGeometryUtils.js'),
]).then(([t, o, g, d, b]) => { THREE = t; OrbitControls = o.OrbitControls; GLTFLoader = g.GLTFLoader; DRACOLoader = d.DRACOLoader; mergeGeometries = b.mergeGeometries; })
  .catch(e => { cargaLibs = null; throw e; }));
const V3 = (x, y, z = 0) => new THREE.Vector3(x, z, -y);
const VISTAS = {
  todas: { centro: [-35, 5], dist: 400, alto: 0.62, rumbo: -0.55 },
  jaragua: { centro: [-115, -55], dist: 210, alto: 0.6, rumbo: -0.75 },
  sheraton: { centro: [92, 25], dist: 175, alto: 0.55, rumbo: -0.35 },
  malecon: { centro: [48, 105], dist: 110, alto: 0.65, rumbo: -0.2 },
};
let cargaPlantel = null;
function cargarPlantel() {
  if (!cargaPlantel) cargaPlantel = new Promise((ok, mal) => {
    const draco = new DRACOLoader(); draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
    const gl = new GLTFLoader(); gl.setDRACOLoader(draco);
    gl.load(window.PLANTEL_GLB || 'plantel.glb', g => ok(optimizar(g.scene)), undefined, mal);
  });
  return cargaPlantel;
}
// Une todo lo que comparte material en una sola pieza: así el teléfono dibuja la maqueta de un tirón
function optimizar(escena) {
  escena.updateMatrixWorld(true);
  const grupos = new Map(), salida = new THREE.Group();
  escena.traverse(o => {
    if (!o.isMesh) return;
    const techo = /TECHO/i.test(o.name) || /TECHO/i.test(o.parent && o.parent.name || '');
    const k = (techo ? 'T|' : 'N|') + o.material.uuid;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    if (!grupos.has(k)) grupos.set(k, { mat: o.material, techo, geos: [] });
    grupos.get(k).geos.push(g);
  });
  for (const { mat, techo, geos } of grupos.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.castShadow = m.receiveShadow = true; m.userData.techo = techo; salida.add(m);
  }
  return salida;
}
function textura(dibujar, w = 64, h = 64) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cintaGeo(pts, ancho, alto) {
  // franja a lo largo de la ruta; la coordenada u avanza en metros para que las flechas no se estiren
  const pos = [], uv = [], idx = []; let u = 0;
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (i) u += distXY(pts[i - 1], p);
    const nx = -dy * ancho / 2, ny = dx * ancho / 2;
    pos.push(p[0] + nx, alto, -(p[1] + ny), p[0] - nx, alto, -(p[1] - ny)); uv.push(u / 6, 1, u / 6, 0);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
const TEX_FLECHAS = () => textura((g, w, h) => {
  g.fillStyle = '#9b2cff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f3dcff'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(w * 0.3, h * 0.2); g.lineTo(w * 0.62, h * 0.5); g.lineTo(w * 0.3, h * 0.8); g.stroke();
});
const TEX_BRILLO = () => textura((g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(177,77,255,0)'); gr.addColorStop(0.5, 'rgba(177,77,255,0.9)'); gr.addColorStop(1, 'rgba(177,77,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, 4, 64);

function crearVisor(caja, { capaHTML }) {
  const v = { listo: false, marcas: new Map(), alTocar: null, techos: true, cenital: false };
  const lienzo = document.createElement('canvas'); lienzo.className = 'visor3d'; caja.prepend(lienzo);
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !matchMedia('(max-width: 640px)').matches; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const escena = new THREE.Scene(); escena.background = new THREE.Color('#0a1430'); escena.fog = new THREE.Fog('#0a1430', 700, 1500);
  const camara = new THREE.PerspectiveCamera(38, 1, 1, 3000);
  escena.add(new THREE.HemisphereLight('#dfe9ff', '#3a4a34', 1.15));
  const sol = new THREE.DirectionalLight('#fff4e0', 2.2); sol.position.copy(V3(-160, -220, 300)); sol.target.position.copy(V3(-30, 0, 0));
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -280, right: 280, top: 280, bottom: -280, near: 10, far: 900 }); sol.shadow.bias = -0.0006;
  escena.add(sol, sol.target);
  const control = new OrbitControls(camara, lienzo);
  control.enableDamping = true; control.dampingFactor = 0.08; control.maxPolarAngle = Math.PI * 0.46; control.minDistance = 25; control.maxDistance = 900; control.screenSpacePanning = false;
  control.addEventListener('change', () => { pedir(); if (v.alGirar) v.alGirar(); });
  const ruta = new THREE.Group(), extras = new THREE.Group(); escena.add(ruta, extras);
  const texFlechas = TEX_FLECHAS(), texBrillo = TEX_BRILLO();
  let pedido = false, ultimo = 0, tocando = false;
  function pedir() { if (!pedido) { pedido = true; requestAnimationFrame(cuadro); } }
  function tam() { const w = caja.clientWidth, h = caja.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); pedir(); }
  new ResizeObserver(tam).observe(caja);
  const vv = new THREE.Vector3();
  // Marcas que se enciman (gente en el mismo lobby, puntos pegados): se juntan en una burbuja con el número.
  // Al tocarla el mapa se acerca hasta que se separan; si ya no se puede acercar más, sale la lista con los nombres.
  const RADIO_GRUPO = 30, burbujas = [];
  const seAgrupa = (id, el) => /^(v|p):/.test(id) || (el.classList.contains('lugar-mapa') && !/\bt-(lobby|terraza)\b|\bmio\b/.test(el.className));
  const nombreDe = el => el.title || (el.querySelector('span') || el).textContent.trim();
  function burbuja(i) {
    if (burbujas[i]) return burbujas[i];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'marca3d grupo-mapa';
    b.addEventListener('click', ev => { ev.stopPropagation(); abrirGrupo(b); });
    capaHTML.appendChild(b); return (burbujas[i] = b);
  }
  function abrirGrupo(b) {
    const l = b._grupo || []; if (!l.length) return;
    const c = new THREE.Vector3(); l.forEach(m => c.add(m.p)); c.divideScalar(l.length); c.y = control.target.y;
    const lejos = camara.position.distanceTo(control.target);
    if (lejos > control.minDistance * 1.4) {
      const off = camara.position.clone().sub(control.target).multiplyScalar(0.4); if (off.length() < control.minDistance) off.setLength(control.minDistance);
      v.vuelo = { t0: performance.now(), dur: 650, p0: camara.position.clone(), p1: c.clone().add(off), c0: control.target.clone(), c1: c }; return pedir();
    }
    cerrarListaGrupo();
    const lista = document.createElement('div'); lista.className = 'grupo-lista'; lista.style.transform = b.style.transform;
    lista.innerHTML = `<b>${l.length} aquí</b>` + l.map((m, i) => `<button type="button" data-i="${i}">${m.el.innerHTML.includes('marca-vivo') || m.el.classList.contains('punto-mapa') ? `<span class="gl-ic">${(m.el.querySelector('.marca-vivo, i') || {}).outerHTML || ''}</span>` : ''}<span>${esc(nombreDe(m.el))}</span></button>`).join('');
    lista.addEventListener('click', ev => { ev.stopPropagation(); const x = ev.target.closest('[data-i]'); if (x) { const el = l[+x.dataset.i].el; cerrarListaGrupo(); el.click(); } });
    capaHTML.appendChild(lista); v.listaGrupo = lista;
  }
  function cerrarListaGrupo() { if (v.listaGrupo) { v.listaGrupo.remove(); v.listaGrupo = null; } }
  lienzo.addEventListener('pointerdown', cerrarListaGrupo);
  function moverMarcas() {
    const w = caja.clientWidth, h = caja.clientHeight;
    const visto = camara.position.distanceTo(control.target) * Math.tan(camara.fov * Math.PI / 360) / Math.tan(19 * Math.PI / 180);
    capaHTML.classList.toggle('lejos', visto > (v.dosD ? 480 : 260));   // en 2D los nombres se ven casi siempre: es para saber dónde queda cada cosa
    const sueltas = [];
    for (const [id, m] of v.marcas) {
      vv.copy(m.p).project(camara);
      const ok = vv.z < 1 && Math.abs(vv.x) < 1.15 && Math.abs(vv.y) < 1.15;
      m.el.style.display = ok ? '' : 'none'; m.el.style.visibility = '';
      if (!ok) continue;
      const x = (vv.x + 1) / 2 * w, y = (1 - vv.y) / 2 * h;
      m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${m.centro ? '-50%' : '-100%'})`;
      if (seAgrupa(id, m.el)) sueltas.push({ m, x, y, id });
    }
    // grupos por cercanía en la pantalla (son pocas marcas: basta con recorrerlas)
    const grupos = [];
    for (const a of sueltas) { const g = grupos.find(g => Math.abs(g.x - a.x) < RADIO_GRUPO && Math.abs(g.y - a.y) < RADIO_GRUPO); if (g) { g.l.push(a); g.x = (g.x * (g.l.length - 1) + a.x) / g.l.length; g.y = (g.y * (g.l.length - 1) + a.y) / g.l.length; } else grupos.push({ x: a.x, y: a.y, l: [a] }); }
    let n = 0;
    for (const g of grupos) {
      if (g.l.length < 2) continue;
      g.l.forEach(a => { a.m.el.style.visibility = 'hidden'; });
      const b = burbuja(n++); b._grupo = g.l.map(a => a.m); b.style.display = '';
      b.style.transform = `translate(${g.x.toFixed(1)}px, ${g.y.toFixed(1)}px) translate(-50%, -50%)`;
      const txt = String(g.l.length); if (b.textContent !== txt) { b.textContent = txt; b.setAttribute('aria-label', `${txt} marcas juntas: toca para verlas`); }
      b.classList.toggle('con-gente', g.l.some(a => a.id.startsWith('v:')));
    }
    for (let i = n; i < burbujas.length; i++) burbujas[i].style.display = 'none';
  }
  function cuadro(t) {
    pedido = false;
    const dt = Math.min(0.05, (t - (ultimo || t)) / 1000); ultimo = t;
    if (v.vuelo) {
      const k = Math.min(1, (t - v.vuelo.t0) / v.vuelo.dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      camara.position.lerpVectors(v.vuelo.p0, v.vuelo.p1, e); control.target.lerpVectors(v.vuelo.c0, v.vuelo.c1, e);
      if (k >= 1) v.vuelo = null;
    }
    texFlechas.offset.x -= dt * 0.9;
    control.update(); renderer.render(escena, camara); moverMarcas();
    if (v.vuelo || ruta.children.length || tocando) pedir();
  }
  v.pedir = pedir;
  // Rumbo (grados desde el norte) hacia donde apunta la parte de arriba de la pantalla
  v.rumboPantalla = () => { const f = control.target.clone().sub(camara.position); return Math.atan2(f.x, -f.z) * 180 / Math.PI; };
  // Acompaña a la persona mientras camina: mueve la cámara sin girarla
  v.seguir = xy => {
    if (v.vuelo || tocando) return;
    const d = V3(xy[0], xy[1]).sub(control.target); d.y = 0;
    if (d.length() < 8) return;
    v.vuelo = { t0: performance.now(), dur: 700, p0: camara.position.clone(), p1: camara.position.clone().add(d), c0: control.target.clone(), c1: control.target.clone().add(d) }; pedir();
  };
  v.volar = (vista, dur = 1400) => {
    // En 2D: recto hacia abajo, con el norte arriba y la lente cerrada (casi sin perspectiva), por eso va más lejos
    const c = V3(vista.centro[0], vista.centro[1]), d = vista.dist * (v.dosD ? 2.9 : v.cenital ? 1.05 : 1);
    const alto = v.dosD || v.cenital ? 0.9999 : vista.alto, r = d * Math.sqrt(1 - alto * alto), rumbo = v.dosD ? 0 : vista.rumbo;
    const p = c.clone().add(new THREE.Vector3(Math.sin(rumbo) * r, d * alto, Math.cos(rumbo) * r));
    v.vuelo = { t0: performance.now(), dur, p0: camara.position.clone(), p1: p, c0: control.target.clone(), c1: c }; pedir();
  };
  v.ruta = puntos => {
    ruta.clear();
    if (!puntos) return pedir();
    const brillo = new THREE.Mesh(cintaGeo(puntos, 4.5, 0.32), new THREE.MeshBasicMaterial({ map: texBrillo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const linea = new THREE.Mesh(cintaGeo(puntos, 2, 0.38), new THREE.MeshBasicMaterial({ map: texFlechas }));
    linea.renderOrder = 2; brillo.renderOrder = 1; ruta.add(brillo, linea); pedir();
  };
  v.marca = (id, xy, el, alto = 1.5) => {
    let m = v.marcas.get(id);
    if (!m) { el.classList.add('marca3d'); capaHTML.appendChild(el); m = { el, p: new THREE.Vector3(), alto, centro: /yo-mapa|origen-mapa|marca-vivo/.test(el.className + el.innerHTML) }; v.marcas.set(id, m); }
    m.p.copy(V3(xy[0], xy[1], m.alto)); pedir(); return m.el;
  };
  v.quitar = id => { const m = v.marcas.get(id); if (m) { m.el.remove(); v.marcas.delete(id); } };
  v.quitarSi = filtro => { for (const id of [...v.marcas.keys()]) if (filtro(id)) v.quitar(id); };
  // Vista 2D desde arriba (pedido de la dirección de Seguridad y Traslado: ver dónde queda cada cosa para asignar puntos y pasillos)
  v.modo2d = si => {
    v.dosD = si;
    control.enableRotate = !si;
    control.minPolarAngle = si ? 0 : 0; control.maxPolarAngle = si ? 0.0001 : Math.PI * 0.46;
    control.screenSpacePanning = si;
    control.mouseButtons = si ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    control.touches = si ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    control.minDistance = si ? 60 : 25; control.maxDistance = si ? 2600 : 900;
    camara.fov = si ? 14 : 38; camara.far = si ? 6000 : 3000; camara.updateProjectionMatrix();
    escena.fog.near = si ? 4000 : 700; escena.fog.far = si ? 9000 : 1500;
    caja.classList.toggle('vista-2d', si); pedir();
  };
  v.verTechos = si => { v.techos = si; if (v.modelo) v.modelo.children.forEach(m => { if (m.userData.techo) m.visible = si; }); pedir(); };
  v.aro = (id, xy, radio, color) => {
    let a = extras.getObjectByName(id);
    if (!xy) { if (a) extras.remove(a); return pedir(); }
    if (!a) { a = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false })); a.name = id; a.rotation.x = -Math.PI / 2; extras.add(a); }
    a.position.copy(V3(xy[0], xy[1], 0.45)); a.scale.setScalar(radio); pedir();
  };
  // Tocar el suelo (para poner puntos): se calcula dónde cae sobre el plano del piso
  const rayo = new THREE.Raycaster(), piso = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto = new THREE.Vector3();
  let abajo = null;
  lienzo.addEventListener('pointerdown', e => { abajo = [e.clientX, e.clientY]; tocando = true; pedir(); });
  addEventListener('pointerup', e => {
    if (!tocando) return; tocando = false; pedir();
    if (e.target !== lienzo || !abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 6 || !v.alTocar) return;
    const r = lienzo.getBoundingClientRect();
    rayo.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
    if (rayo.ray.intersectPlane(piso, punto)) v.alTocar([punto.x, -punto.z]);
  });
  v.iniciar = vista => cargarPlantel().then(modelo => {
    v.modelo = modelo.clone(); escena.add(v.modelo); v.verTechos(v.techos); v.listo = true;
    const c = V3(vista.centro[0], vista.centro[1]); control.target.copy(c); camara.position.copy(c).add(new THREE.Vector3(0, 300, 250));
    tam(); v.volar(vista, 1800); return v;
  });
  return v;
}

// ---------- El mapa de las sedes ----------
let mapa = null, esperaMapa = null, rutaActual = null;
const capas = { seg: true, vivo: false, admin: false, tresd: true, salones: false };
function iniciarMapa() {
  if (!esperaMapa) esperaMapa = cargarLibs().then(() => {
    mapa = crearVisor($('#caja'), { capaHTML: $('#capaMarcas') });
    return mapa.iniciar(VISTAS[estado.sede] || VISTAS.todas);
  }).then(() => {
    $('#mapaCarga').hidden = true; $('#mapaAviso').hidden = true; pintarLugares(); dibujarPines();
    if (!capas.tresd && !usaEsquema()) { mapa.modo2d(true); mapa.verTechos(false); mapa.volar(VISTAS[estado.sede] || VISTAS.todas, 900); }   // si eligieron 2D antes de que cargara
    if (rutaActual) dibujarRuta(rutaActual, false);
    mapa.alTocar = alTocarMapa;
    return mapa;
  }).catch(e => { $('#mapaCarga').hidden = true; $('#mapaAviso').hidden = false; esperaMapa = null; mapa = null; throw e; });
  return esperaMapa;
}
new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) iniciarMapa().catch(() => {}); }, { rootMargin: '300px' }).observe($('#mapa'));

// ---------- Lugares ----------
const ICONO_TIPO = { lobby: 'L', salon: 'S', entrada: 'E', terraza: 'T', casino: 'C', referencia: '·', encuentro: 'P' };
function pintarLugares() {
  if (!mapa || !mapa.listo) return;
  mapa.quitarSi(id => id.startsWith('l:'));
  const mio = miSalon() ? lugarDeSalon(miSalon(), ASIGNA[estado.comision][0]) : null;
  for (const l of MAPA.lugares) {
    if ((l.tipo === 'encuentro' && !capas.seg) || l.id === 'gran-salon') continue;
    const el = document.createElement('button'); el.type = 'button';
    el.className = `lugar-mapa s-${l.sede} t-${l.tipo}${mio && mio.id === l.id ? ' mio' : ''}`;
    const coms = Object.entries(ASIGNA).filter(([, a]) => lugarDeSalon(a[1], a[0]).id === l.id).map(([c]) => c);
    el.innerHTML = `<i>${ICONO_TIPO[l.tipo] || '·'}</i><span>${esc(l.n)}${coms.length ? ` <small>${coms.join(', ')}</small>` : ''}</span>`;
    el.onclick = () => { $('#rDestino').value = l.id; fichaLugar(l, coms); };
    const alto = !capas.tresd ? 1 : l.tipo === 'salon' && l.sede === 'sheraton' ? (capas.salones ? 2 : 10) : l.tipo === 'lobby' ? 9 : 4;
    mapa.marca('l:' + l.id, l.xy, el, alto);
  }
}
function fichaLugar(l, coms = []) {
  $('#ficha').innerHTML = `<b>${esc(l.n)}</b>${SEDES[l.sede] ? SEDES[l.sede].nombre : ''}${coms.length ? ' · ' + coms.join(', ') : ''}<br><button class="mini" data-ir="${l.id}">Cómo llegar aquí</button>`;
}
$('#ficha').onclick = e => { const b = e.target.closest('[data-ir]'); if (b) { $('#rDestino').value = b.dataset.ir; irA(); } };

// ---------- Cómo llegar ----------
const opcionLugar = l => `<option value="${l.id}">${esc(l.n)}</option>`;
const gruposLugares = () => ['jaragua', 'sheraton', 'malecon'].map(s => `<optgroup label="${SEDES[s].nombre}">${MAPA.lugares.filter(l => l.sede === s && l.tipo !== 'referencia').map(opcionLugar).join('')}</optgroup>`).join('');
$('#rOrigen').innerHTML = '<option value="gps">Mi ubicación (GPS)</option>' + gruposLugares();
$('#rDestino').innerHTML = gruposLugares();
$('#rOrigen').value = 'j-lobby'; $('#rDestino').value = 's-oeste';
function dibujarRuta(r, encuadrar = true) {
  rutaActual = r;
  if (!mapa || !mapa.listo) return;
  mapa.ruta(r.puntos);
  mapa.quitarSi(id => id.startsWith('ruta:'));
  const d = document.createElement('div'); d.className = 'destino-mapa'; d.innerHTML = '<i></i>'; mapa.marca('ruta:destino', r.destino.xy, d, 3);
  const o = document.createElement('div'); o.className = 'origen-mapa'; mapa.marca('ruta:origen', r.puntos[0], o, 1);
  if (encuadrar) {
    const xs = r.puntos.map(p => p[0]), ys = r.puntos.map(p => p[1]);
    const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    mapa.volar({ centro: c, dist: Math.max(80, ext * 1.6 + 40), alto: 0.7, rumbo: -0.45 });
  }
}
function pintarRutaTexto(r, nota = '') {
  $('#rCard').hidden = false;
  $('#rResumen').innerHTML = `<b>${r.metros} m</b><span>${r.minutos} min a pie</span><span class="r-dest">${esc(r.destino.n)}</span>`;
  $('#rPasos').innerHTML = r.pasos.map((p, i) => `<li class="${i === r.pasos.length - 1 ? 'fin' : ''}">${esc(p)}</li>`).join('');
  $('#rNota').innerHTML = nota;
}
function irA(origen) {
  const o = origen || $('#rOrigen').value, d = $('#rDestino').value;
  if (o === 'gps') return irDesdeGPS(d);
  if (o === d) return toast('El origen y el destino son el mismo lugar');
  const r = calcularRuta(o, d); if (!r) return toast('No encontré un camino entre esos dos lugares');
  pintarRutaTexto(r); dibujarRuta(r);
  iniciarMapa().then(() => dibujarRuta(r)).catch(() => {});
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
// Afuera el GPS da ±5 a 15 m; bajo techo empeora. Se ignoran las lecturas peores de 60 m y los saltos imposibles
// caminando, y cada lectura se suaviza según su precisión. El rumbo sale del GPS al caminar y de la brújula al estar quieto.
let gpsId = null, posGPS = null, siguiendo = false, avisoLejos = false, brujula = null, brujulaOn = false, ultimoCalculo = null, despierta = null;
function encenderGPS() {
  if (gpsId !== null) return true;
  if (!navigator.geolocation || !isSecureContext) { toast('Este navegador no deja usar el GPS aquí. Elige el lugar donde estás.'); return false; }
  $('#gpsEstado').textContent = 'Buscando tu ubicación…';
  gpsId = navigator.geolocation.watchPosition(p => {
    const { latitude: la, longitude: lo, accuracy: acc, heading, speed } = p.coords, t = p.timestamp || Date.now();
    $('#gpsEstado').textContent = `GPS ±${Math.round(acc)} m`;
    if (acc > 60) return;
    const xy = aXY([la, lo]);
    if (!posGPS) posGPS = { xy, ll: [la, lo], acc: Math.round(acc), rumbo: null, vel: 0, t, ancla: xy };
    else {
      const dt = Math.max(0.5, (t - posGPS.t) / 1000), salto = distXY(xy, posGPS.xy);
      if (salto > acc + posGPS.acc + 3 * dt + 10 && dt < 30) return;                 // nadie camina tan rápido: lectura falsa
      const k = Math.min(1, Math.max(0.3, 1.6 * posGPS.acc ** 2 / (posGPS.acc ** 2 + acc ** 2)));   // pesa más la más precisa
      const n = [posGPS.xy[0] + (xy[0] - posGPS.xy[0]) * k, posGPS.xy[1] + (xy[1] - posGPS.xy[1]) * k];
      const vel = speed != null && !isNaN(speed) ? speed : distXY(n, posGPS.xy) / dt;
      let rumbo = posGPS.rumbo, ancla = posGPS.ancla;
      if (heading != null && !isNaN(heading) && vel > 0.6) rumbo = heading;
      else if (distXY(n, ancla) > 4) { rumbo = (Math.atan2(n[0] - ancla[0], n[1] - ancla[1]) * 180 / Math.PI + 360) % 360; ancla = n; }
      posGPS = { xy: n, ll: aLL(n), acc: Math.round(Math.min(acc, (posGPS.acc + acc) / 2 + 2)), rumbo, vel, t, ancla };
    }
    moverYo();
  }, err => { $('#gpsEstado').textContent = err.code === 1 ? 'Sin permiso de ubicación' : 'No se pudo leer el GPS'; apagarGPS(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  return true;
}
// Brújula del teléfono (en iPhone hay que pedir permiso tocando un botón)
function encenderBrujula() {
  if (brujulaOn) return; brujulaOn = true;
  const leerBrujula = e => {
    const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? (360 - e.alpha) % 360 : null);
    if (h == null) return;
    brujula = (h + (screen.orientation ? screen.orientation.angle || 0 : 0)) % 360;
    if (posGPS && (posGPS.vel || 0) < 0.6) girarYo();
  };
  const escuchar = () => { addEventListener('deviceorientationabsolute', leerBrujula); addEventListener('deviceorientation', leerBrujula); };
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function')
    DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') escuchar(); }).catch(() => {});
  else escuchar();
}
// La pantalla no se apaga mientras te guía
async function pantallaDespierta(si) {
  try {
    if (si && !despierta && 'wakeLock' in navigator) { despierta = await navigator.wakeLock.request('screen'); despierta.addEventListener('release', () => { despierta = null; }); }
    if (!si && despierta) { await despierta.release(); despierta = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && siguiendo) pantallaDespierta(true); });
function dejarDeGuiar() { siguiendo = false; $('#rSeguir').classList.remove('on'); pantallaDespierta(false); }
function apagarGPS() { if (gpsId !== null) navigator.geolocation.clearWatch(gpsId); gpsId = null; dejarDeGuiar(); }
const lejosDeSedes = () => posGPS ? Math.min(...Object.values(SEDES_XY).map(s => distXY(posGPS.xy, s))) : Infinity;
// Mientras te guía, el punto azul se pega al camino si estás cerca de él (el GPS suele bailar unos metros)
const posMostrada = () => { if (!siguiendo || !posGPS) return posGPS && posGPS.xy; const s = puntoEnCamino(posGPS.xy); return s.d <= Math.max(8, posGPS.acc) ? s.q : posGPS.xy; };
function girarYo() {
  if (!mapa || !mapa.marcas.has('gps:yo') || !posGPS) return;
  const r = (posGPS.vel || 0) > 0.6 || brujula == null ? posGPS.rumbo : brujula, el = mapa.marcas.get('gps:yo').el;
  el.classList.toggle('sin-rumbo', r == null);
  if (r != null) el.querySelector('i').style.rotate = (r - mapa.rumboPantalla()) + 'deg';
}
function moverYo() {
  if (!posGPS) return;
  const xy = posMostrada();
  if (mapa && mapa.listo && lejosDeSedes() < 700) {
    if (!mapa.marcas.has('gps:yo')) { const d = document.createElement('div'); d.className = 'yo-mapa sin-rumbo'; d.innerHTML = '<i></i>'; mapa.marca('gps:yo', xy, d, 1); } else mapa.marca('gps:yo', xy);
    mapa.alGirar = girarYo; girarYo();
    mapa.aro('precision', posGPS.xy, posGPS.acc || 10, '#3b8bff');
    if (siguiendo) mapa.seguir(xy);
  }
  if (siguiendo) {
    const dest = LUGAR[$('#rDestino').value]; if (!dest) return;
    const falta = rutaActual && rutaActual.destino === dest ? rutaActual.metros : distXY(posGPS.xy, dest.xy);
    if (distXY(posGPS.xy, dest.xy) < Math.max(10, Math.min(posGPS.acc, 20)) || falta < 8) {
      toast(`Llegaste a ${dest.n}`); vibrar([200, 100, 200]); dejarDeGuiar(); return;
    }
    // la ruta se recalcula al moverte 3 m (o cada 8 s), no con cada lectura: así no parpadea
    if (!ultimoCalculo || distXY(posGPS.xy, ultimoCalculo.xy) > 3 || Date.now() - ultimoCalculo.t > 8000) { ultimoCalculo = { xy: posGPS.xy, t: Date.now() }; irDesdeGPS(dest.id, true); }
  }
}
function irDesdeGPS(destino, silencioso) {
  if (!encenderGPS()) return;
  if (!posGPS) { if (!silencioso) toast('Esperando la señal del GPS… sal a un lugar abierto si tarda'); setTimeout(() => posGPS && irDesdeGPS(destino, true), 2500); return; }
  const dest = LUGAR[destino], lejos = lejosDeSedes();
  if (lejos > 700) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.ll[0]},${dest.ll[1]}&travelmode=walking`;
    $('#rCard').hidden = false;
    $('#rResumen').innerHTML = `<b>${(lejos / 1000).toFixed(1)} km</b><span>estás lejos de las sedes</span><span class="r-dest">${esc(dest.n)}</span>`;
    $('#rPasos').innerHTML = '<li>Para llegar hasta el hotel usa Google Maps; cuando estés a menos de 700 m, esta ruta te guía por dentro.</li>';
    $('#rNota').innerHTML = `<a class="boton sec" href="${url}" target="_blank" rel="noopener">Abrir en Google Maps</a>`;
    if (!avisoLejos) { avisoLejos = true; toast('Estás fuera de la maqueta: te dejé el enlace a Google Maps'); }
    return;
  }
  const r = calcularRuta({ xy: posGPS.xy }, destino); if (!r) return;
  pintarRutaTexto(r, `Tu posición: GPS ±${posGPS.acc} m${posGPS.acc > 25 ? ' · bajo techo el GPS se mueve; guíate por los pasos' : ''}${siguiendo ? ' · te sigo mientras caminas' : ''}`);
  dibujarRuta(r, !silencioso);
}
$('#rSeguir').onclick = () => {
  siguiendo = !siguiendo; $('#rSeguir').classList.toggle('on', siguiendo);
  if (siguiendo) {
    encenderBrujula(); pantallaDespierta(true); ultimoCalculo = null;
    $('#rOrigen').value = 'gps'; irDesdeGPS($('#rDestino').value);
    if (posGPS && mapa && mapa.listo) mapa.volar({ centro: posMostrada(), dist: 90, alto: 0.7, rumbo: -0.4 }, 900);
    toast('Te guío con el GPS: la ruta se actualiza mientras caminas');
  } else dejarDeGuiar();
};
$('#rCentrar').onclick = () => {
  if (!encenderGPS()) return;
  if (!posGPS) return toast('Esperando la señal del GPS…');
  if (lejosDeSedes() > 700) return toast('Estás lejos de las sedes: usa «Guíame con el GPS» para abrir Google Maps');
  if (mapa) mapa.volar({ centro: posGPS.xy, dist: 90, alto: 0.7, rumbo: -0.4 });
};

// ---------- Sedes y capas ----------
$('#sedes').innerHTML = [['todas', 'Las dos sedes', 'Jaragua y Sheraton'], ...['jaragua', 'sheraton', 'malecon'].map(k => [k, SEDES[k].nombre, SEDES[k].zona])].map(([k, n, z]) => `<button data-s="${k}"><b>${n}</b><small>${z}</small></button>`).join('');
$('#sedes').onclick = e => { const b = e.target.closest('button'); if (b) elegirSede(b.dataset.s); };
function elegirSede(s, volar) {
  estado.sede = VISTAS[s] ? s : 'todas';
  $$('#sedes button').forEach(b => b.classList.toggle('on', b.dataset.s === estado.sede));
  if (mapa && mapa.listo) mapa.volar(VISTAS[estado.sede], 1600);
  pintarEsquema();
  if (volar && miSalon()) mostrarLugar(lugarDeSalon(miSalon(), ASIGNA[estado.comision][0]).id);
  pintarLugares();
}
function mostrarLugar(id, texto) {
  const l = LUGAR[id] || (Array.isArray(id) ? { n: texto || 'Punto', xy: aXY(id), sede: '' } : null); if (!l) return;
  iniciarMapa().then(() => mapa.volar({ centro: l.xy, dist: 85, alto: 0.68, rumbo: -0.4 })).catch(() => {});
  if (l.sede === 'sheraton' && l.tipo === 'salon' && !capas.salones) activarCapa('salones');
  $('#ficha').innerHTML = `<b>${esc(texto || l.n)}</b>${SEDES[l.sede] ? SEDES[l.sede].nombre : ''}${LUGAR[id] ? `<br><button class="mini" data-ir="${id}">Cómo llegar aquí</button>` : ''}`;
}
const mostrarSalon = (salon, sede) => mostrarLugar(lugarDeSalon(salon, sede).id, salon);
const miSalon = () => estado.comision && ASIGNA[estado.comision] ? ASIGNA[estado.comision][1] : null;
const BOTON_CAPA = { seg: '#cSeg', vivo: '#cVivo', admin: '#cAdmin', tresd: '#c3d', salones: '#cSalones' };
function activarCapa(c) {
  capas[c] = !capas[c]; $(BOTON_CAPA[c]).classList.toggle('on', capas[c]);
  if (c === 'tresd' && usaEsquema()) { $('#c3d').innerHTML = capas.tresd ? '🗺️ Ver en 2D' : '🧊 Ver en 3D'; $('#c3d').classList.remove('on'); mostrarEsquema(!capas.tresd); }
  else if (c === 'tresd') { $('#c3d').innerHTML = capas.tresd ? '🗺️ Ver en 2D' : '🧊 Ver en 3D'; $('#c3d').classList.remove('on'); if (!capas.tresd && !capas.salones) { capas.salones = true; $('#cSalones').classList.add('on'); if (mapa) mapa.verTechos(false); } }
  if (c === 'tresd' && !usaEsquema() && mapa && mapa.listo) { mapa.modo2d(!capas.tresd); mapa.volar(VISTAS[estado.sede] || VISTAS.todas, 900); }
  if (c === 'salones' && mapa) mapa.verTechos(!capas.salones);
  if (c === 'vivo') pintarVivoMapa();
  if (c === 'admin') toast(capas.admin ? 'Toca el mapa para poner un punto · toca un punto para cambiarlo' : 'Listo, ya no estás editando el mapa');
  pintarLugares(); dibujarPines();
}
$('#cSeg').onclick = () => activarCapa('seg'); $('#cVivo').onclick = () => activarCapa('vivo'); $('#cAdmin').onclick = () => activarCapa('admin'); $('#c3d').onclick = () => activarCapa('tresd'); $('#cSalones').onclick = () => activarCapa('salones');

// ---------- Puntos que agrega coordinación (acreditación, baños, salidas…) ----------
const CATS = {
  acreditacion: ['Acreditación', '🪪', '#a974ff'], movilidad: ['Movilización', '🚶', '#ff9a3c'], eventos: ['Eventos', '🎤', '#2f7bff'],
  seguridad: ['Seguridad', '🛡️', '#ff4d5e', 'seg'], salida: ['Salida de emergencia', '🟩', '#2fd38c', 'seg'], salud: ['Primeros auxilios', '⛑️', '#ff4d5e', 'seg'],
  encuentro: ['Punto de encuentro', '🟢', '#2fd38c', 'seg'], info: ['Información', 'ℹ️', '#45c8ff'], banos: ['Baños', '🚻', '#45c8ff'],
  pasillo: ['Pasillo', '🚧', '#ffb547'], puesto: ['Puesto del staff', '👮', '#e53535'],
  comida: ['Comida', '🍽️', '#ffd23f'], agua: ['Agua', '💧', '#45c8ff'], prensa: ['Prensa', '📰', '#9aa8cc'], otro: ['Otro', '📍', '#9aa8cc'],
};
const cerca = (id, dx, dy) => aLL([LUGAR[id].xy[0] + dx, LUGAR[id].xy[1] + dy]);
const PUNTOS_INICIALES = [
  ['Acreditación del staff', 'acreditacion', cerca('j-lobby', -8, 4)], ['Información', 'info', cerca('s-lobby', 6, -4)],
  ['Primeros auxilios · Jaragua', 'salud', cerca('j-lobby', 9, -6)], ['Primeros auxilios · Sheraton', 'salud', cerca('s-oeste', -4, 6)],
  ['Seguridad del hotel · Jaragua', 'seguridad', cerca('j-lobby', 4, 9)], ['Seguridad del hotel · Sheraton', 'seguridad', cerca('s-lobby', -6, 4)],
  ['Punto de encuentro · Jaragua', 'encuentro', LUGAR['encuentro-jaragua'].ll], ['Punto de encuentro · Sheraton', 'encuentro', LUGAR['encuentro-sheraton'].ll],
  ['Salida hacia el Sheraton', 'movilidad', LUGAR['j-este'].ll], ['Comida · Malecón Terrace', 'comida', cerca('malecon-terrace', 6, -6)],
].map(([n, cat, ll], i) => ({ id: 'p' + i, n, cat, ll }));
// Se guardan en la base («config.mapa»): todos los ven y solo la coordinación o la subdirección los cambian
// (leerComp está más abajo en la página; al cargar se lee directo)
const mapaGuardado = () => { try { return JSON.parse(localStorage.getItem('minume.compartido.config.mapa') || 'null'); } catch { return null; } };
estado.puntos = mapaGuardado() || leer('puntos-plantel', null) || PUNTOS_INICIALES.map(p => ({ ...p }));
const guardarPuntosMapa = () => guardarComp('config.mapa', estado.puntos);
addEventListener('storage', e => { if (e.key === CLAVE_COMP('config.mapa')) { const l = mapaGuardado(); if (l && !editando && !moviendo) { estado.puntos = l; dibujarPines(); } } });
const catOculta = new Set();
const verCat = c => !catOculta.has(c) && (!CATS[c][3] || capas[CATS[c][3]]);
let editando = null, moviendo = null, nuevo = null, catElegida = 'acreditacion';
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
  pintarLeyenda(); pintarEsquema();
  if (!mapa || !mapa.listo) return;
  mapa.quitarSi(id => id.startsWith('p:'));
  for (const q of estado.puntos.filter(x => verCat(x.cat) && x.ll)) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'punto-mapa' + (editando === q.id ? ' editando' : '');
    el.innerHTML = `<i style="background:${CATS[q.cat][2]}">${CATS[q.cat][1]}</i><span>${esc(q.n)}</span>`;
    el.onclick = ev => { ev.stopPropagation(); tocarPunto(q.id); };
    mapa.marca('p:' + q.id, aXY(q.ll), el, 2.5);
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
  guardarPuntosMapa(); cerrarEditor();
};
$('#pBorrar').onclick = () => { estado.puntos = estado.puntos.filter(x => x.id !== editando); guardarPuntosMapa(); toast('Punto borrado'); cerrarEditor(); };
$('#pMover').onclick = () => { moviendo = editando; $('#modal').classList.remove('on'); toast('Toca en el mapa el nuevo lugar del punto'); };
$('#pCancelar').onclick = () => { moviendo = null; cerrarEditor(); };
function alTocarMapa(xy) {
  if (!capas.admin) return;
  const ll = aLL(xy).map(n => +n.toFixed(7));
  if (moviendo) { const q = estado.puntos.find(x => x.id === moviendo); if (q) q.ll = ll; moviendo = null; editando = null; guardarPuntosMapa(); dibujarPines(); toast('Punto movido'); return; }
  nuevo = ll; abrirEditor(null);
}

// ---------- Equipo en vivo sobre este mapa (Seguridad, Traslado y Coordinación) ----------
function pintarVivoMapa() {
  if (!mapa || !mapa.listo) return;
  if (!capas.vivo || typeof equipoAhora !== 'function') { mapa.quitarSi(id => id.startsWith('v:')); return; }
  for (const x of equipoAhora(performance.now() / 1000)) {
    const id = 'v:' + x.p.id;
    if (!mapa.marcas.has(id)) { const el = document.createElement('div'); el.innerHTML = marcaHTML(x.p, x.yo); el.title = `${x.p.n} · ${x.p.det}`; mapa.marca(id, x.xy, el, 2); }
    else mapa.marca(id, x.xy);
  }
}
setInterval(() => { if (capas.vivo && seVe($('#mapa'))) pintarVivoMapa(); }, 1000);
