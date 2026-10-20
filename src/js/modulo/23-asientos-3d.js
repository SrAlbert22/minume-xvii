// ---------- Plano de asientos en 3D ----------
// El mismo plano, pero como el salón por dentro: cada asiento con su color y se toca igual que en el plano.
const ESC_AS = 0.62;                       // metros por unidad del plano
let as3d = null;
function geoSilla(alto) {
  const a = new THREE.BoxGeometry(0.46, 0.08, 0.46).translate(0, 0.45, 0);
  const b = new THREE.BoxGeometry(0.46, alto, 0.07).translate(0, 0.45 + alto / 2, 0.2);
  return mergeGeometries([a, b], false);
}
function pantallaTextura(titulo) {
  return textura((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#071433'); gr.addColorStop(1, '#123a8c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = 'bold 120px Arial'; g.fillText('MINUME XVII', 60, 190);
    g.fillStyle = '#45c8ff'; g.fillRect(64, 225, 420, 8); g.fillStyle = '#bcd3ff'; g.font = '48px Arial'; g.fillText(titulo, 64, 300);
  }, 1024, 400);
}
async function abrir3D() {
  await cargarLibs();
  const caja = $('#as3dCaja');
  if (!as3d) {
    const lienzo = document.createElement('canvas'); lienzo.className = 'visor3d'; caja.appendChild(lienzo);
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const escena = new THREE.Scene(); escena.background = new THREE.Color('#0a1228');
    const camara = new THREE.PerspectiveCamera(42, 1, 0.3, 500);
    escena.add(new THREE.HemisphereLight('#ffffff', '#30364a', 1.2));
    const dir = new THREE.DirectionalLight('#fff4e0', 1.6); dir.position.set(10, 30, 20); escena.add(dir);
    const control = new OrbitControls(camara, lienzo); control.enableDamping = true; control.maxPolarAngle = Math.PI * 0.47;
    const grupo = new THREE.Group(); escena.add(grupo);
    as3d = { renderer, escena, camara, control, grupo, lienzo, plano: null, sillas: null, ids: [] };
    const tam = () => { const w = caja.clientWidth, h = caja.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); };
    new ResizeObserver(tam).observe(caja); tam();
    let pend = false; as3d.pedir = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; control.update(); renderer.render(escena, camara); if (abierto3D()) as3d.pedir(); }); } };
    // tocar un asiento: igual que en el plano (en «Pintar» lo pinta)
    const rayo = new THREE.Raycaster(); let abajo = null;
    lienzo.addEventListener('pointerdown', e => { abajo = [e.clientX, e.clientY]; });
    lienzo.addEventListener('pointerup', e => {
      if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 6 || !as3d.sillas) return;
      const r = lienzo.getBoundingClientRect();
      rayo.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
      const hit = rayo.intersectObject(as3d.sillas)[0]; if (!hit) return;
      const id = as3d.ids[hit.instanceId];
      if (asModo === 'ver') asSel = id; else { guardarAs(cambiarAs(id, asModo)); toast(`${id}: ${EST_AS[asModo][0]}`); }
      pintarAsientos();
    });
  }
  construir3D();
}
const abierto3D = () => !$('#as3dCaja').hidden;
function construir3D() {
  const e = EV_LISTA.find(x => x.id === asEvento), plano = planoDe(e); if (!plano || !as3d) return;
  if (as3d.plano !== plano) {
    as3d.plano = plano; as3d.grupo.clear();
    const S = ESC_AS, W = plano.ancho * S, D = plano.alto * S, X = x => (x - plano.ancho / 2) * S, Z = y => y * S;
    const banquete = plano.tipo === 'banquete';
    const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
    const piso = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 0.2, D + 4), mat(banquete ? '#6b655e' : '#2b2b30')); piso.position.set(0, -0.1, D / 2); as3d.grupo.add(piso);
    const alto = banquete ? 5 : 9, muro = mat(banquete ? '#f4f4f2' : '#cbbd9f');
    for (const [w, d, x, z] of [[W + 4, 0.3, 0, -2], [0.3, D + 4, -W / 2 - 2, D / 2], [0.3, D + 4, W / 2 + 2, D / 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, alto, d), muro); m.position.set(x, alto / 2, z); as3d.grupo.add(m);
    }
    const t = plano.escenario, esc = new THREE.Mesh(new THREE.BoxGeometry(t.w * S, banquete ? 0.6 : 1.1, t.h * S), mat('#141418'));
    esc.position.set(X(t.x + t.w / 2), (banquete ? 0.6 : 1.1) / 2, Z(t.y + t.h / 2)); as3d.grupo.add(esc);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(W * 0.4, 12), Math.min(W * 0.4, 12) * 0.39), new THREE.MeshBasicMaterial({ map: pantallaTextura(plano.nombre.split(' · ')[0]) }));
    pant.position.set(0, alto * 0.6, -1.35); as3d.grupo.add(pant);
    if (!banquete) { const telon = new THREE.Mesh(new THREE.BoxGeometry(t.w * S + 2, alto - 0.5, 0.2), mat('#6b0a14')); telon.position.set(X(t.x + t.w / 2), alto / 2, -1.6); as3d.grupo.add(telon); }
    for (const m of plano.mesas || []) {
      const g = m.rect ? new THREE.BoxGeometry(m.w * S, 0.76, m.h * S) : new THREE.CylinderGeometry(m.r * S, m.r * S, 0.76, 28);
      const me = new THREE.Mesh(g, mat(m.rect ? '#0d3a8a' : '#f2f2f0')); me.position.set(m.rect ? X(m.x + m.w / 2) : X(m.x), 0.38, m.rect ? Z(m.y + m.h / 2) : Z(m.y)); as3d.grupo.add(me);
    }
    // todas las sillas en una sola malla con un color por asiento
    const n = plano.asientos.length, sillas = new THREE.InstancedMesh(geoSilla(banquete ? 0.55 : 0.6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
    const o = new THREE.Object3D(); as3d.ids = [];
    plano.asientos.forEach((a, i) => {
      let giro = 0, h = 0;
      if (a.fila === 'P') { giro = Math.PI; h = 1.1; }
      else if (banquete && a.fila !== 'MP') { const m = plano.mesas.find(t => t.t === a.fila.slice(1)); if (m) giro = Math.atan2(a.x - m.x, a.y - m.y); }
      else if (!banquete) giro = Math.atan2(a.x - plano.ancho / 2, 60) * 0.6;
      o.position.set(X(a.x), h, Z(a.y)); o.rotation.set(0, giro, 0); o.updateMatrix(); sillas.setMatrixAt(i, o.matrix); as3d.ids.push(a.id);
    });
    as3d.grupo.add(sillas); as3d.sillas = sillas;
    as3d.control.target.set(0, 0, D * 0.45); as3d.camara.position.set(W * 0.35, Math.max(W, D) * 0.55, D + Math.max(8, D * 0.35));
  }
  colorear3D();
}
function colorear3D() {
  if (!as3d || !as3d.sillas || !abierto3D()) return;
  const e = EV_LISTA.find(x => x.id === asEvento), todo = leerAs(), sem = semillaAsientos(e), col = new THREE.Color();
  as3d.ids.forEach((id, i) => {
    const s = estadoAs(e, id, todo, sem); col.set(id === asSel ? '#ffffff' : EST_AS[s.est][1]);
    as3d.sillas.setColorAt(i, col);
  });
  as3d.sillas.instanceColor.needsUpdate = true; as3d.pedir();
}
$('#as3d').onclick = () => {
  const ver = $('#as3dCaja').hidden;
  $('#as3dCaja').hidden = !ver; $('#asPlano').hidden = ver; $('#as3d').classList.toggle('on', ver); $('#asZoom').hidden = ver;
  $('#as3d').textContent = ver ? '🗺️ Ver el plano' : '🧊 Ver en 3D';
  if (ver) abrir3D().catch(() => { toast('No se pudo abrir la vista 3D (hace falta internet la primera vez)'); $('#as3d').click(); });
};
