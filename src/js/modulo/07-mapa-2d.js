// MINUME XVII · Mapa 2D de Seguridad y Traslado (estilo del mapa del V CND) · Albert Silvestre
// ---------- Mapa 2D de Seguridad y Traslado (estilo del mapa del V CND) ----------
// Pedido de la dirección: «lo mismo pero en 2D», una vista desde arriba para ver dónde queda cada cosa y asignar
// los puntos y los pasillos. Bloques de color con su nombre sobre un fondo verde claro y cada punto como un círculo
// con su código. Usa las mismas coordenadas (metros) que la maqueta 3D, así que los puntos caen en el mismo lugar.
// Las formas de los hoteles, la piscina, las canchas y la avenida salen de MAPA_2D (herramientas/plano_2d.py).
var esquemaOn = false, esquemaSel = null;
const usaEsquema = () => SISTEMA === 'seguridad' || SISTEMA === 'coordinacion';
const ESQ_CAJA = { todas: [-215, -170, 160, 145], jaragua: [-205, -160, -15, 35], sheraton: [45, -50, 140, 95], malecon: [-5, 65, 95, 140] };
const ESQ = {
  suelo: '#cfe8a8', patio: '#f1efe7', verde: ['#b3da86', '#9cc873'], arbol: ['#6db544', '#5aa337'], parqueo: ['#e7e4dc', '#d6d2c6'], piscina: ['#6fc3ef', '#4aa9de'], cancha: ['#dcc78f', '#fff'],
  jaragua: ['#3aa83a', '#2c8a2c'], sheraton: ['#3b7fd9', '#2a63b3'], malecon: ['#e86f93', '#c94d75'],
  oscuro: ['#2f8a2f', '#23702a'], naranja: ['#e8921b', '#c06e10'], morado: ['#8e6bd8', '#6c4fb5'], claro: ['#e9a0b0', '#c9748a'], azulOsc: ['#2d68c0', '#1f4f99'],
};
// Bloques con nombre (centro x, centro y, ancho, alto en metros). Los del Sheraton van girados como el hotel.
const ESQ_ZONAS = [
  ['Teatro La Fiesta', '', -175.7, -90.2, 34, 24, 'naranja'], ['Casino', '', -155.9, -62.1, 26, 16, 'morado'],
  ['Anacaona', 'Salones 1, 2 y 3', -104.9, -104.3, 36, 16, 'oscuro'], ['Salones', 'Marién · Maguá · Higüey · Maguana', -75, -93.5, 34, 15, 'oscuro'],
  ['Las Olas', '', -57.5, -81.8, 16, 11, 'oscuro'], ['Lobby', 'Jaragua', -68, -66.6, 24, 14, 'claro'], ['Sol de Oro', '', -59.6, -34, 20, 11, 'oscuro'],
];
const ESQ_SHERATON = [['Lobby', 's-lobby', 20, 10, 'claro'], ['Samaná', 'samana', 11, 8], ['Bonanza', 'bonanza', 11, 8], ['Constanza', 'constanza', 11, 8], ['Yarey', 'yarey', 11, 8],
  ['Da Vinci', 'da-vinci', 9, 7], ['Board Room', 'board-room', 9, 7], ['Este I', 'este-1', 6, 5], ['Este II', 'este-2', 6, 5], ['Este III', 'este-3', 6, 5], ['Este IV', 'este-4', 6, 5], ['Este V', 'este-5', 6, 5], ['Este VI', 'este-6', 6, 5]];
const ESQ_GIRO = -23.6;   // grados: el Sheraton está girado respecto al norte
const COLOR_PUNTO = { Puerta: '#16357a', Pasillo: '#2f6b12', Interior: '#1f63b8', 'Movilización': '#d9730d', Nocturno: '#5b3fa8', 'Perímetro': '#16357a' };

function esqTexto(txt, x, y, w, h, color = '#fff', sub = '') {
  const t = Math.max(2.6, Math.min(7.5, w / Math.max(4, txt.length) * 1.55, h * (sub ? 0.34 : 0.45)));
  return `<text x="${x}" y="${(y + (sub ? -t * 0.15 : t * 0.35)).toFixed(1)}" font-size="${t.toFixed(1)}" font-weight="700" fill="${color}" text-anchor="middle" font-family="Manrope, Barlow, Arial">${esc(txt)}</text>`
    + (sub ? `<text x="${x}" y="${(y + t * 0.95).toFixed(1)}" font-size="${(t * 0.55).toFixed(1)}" fill="${color}" opacity=".92" text-anchor="middle" font-family="Manrope, Barlow, Arial">${esc(sub)}</text>` : '');
}
function svgEsquema(sede) {
  const [x0, y0, x1, y1] = ESQ_CAJA[sede] || ESQ_CAJA.todas, W = x1 - x0, H = y1 - y0;
  const X = x => +(x - x0).toFixed(1), Y = y => +(y1 - y).toFixed(1), pts = l => l.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
  const lejos = l => l.every(([x, y]) => x < x0 - 30 || x > x1 + 30 || y < y0 - 30 || y > y1 + 30);
  const D = MAPA_2D, bloque = (l, [f, b], w = 1.4) => `<polygon points="${pts(l)}" fill="${f}" stroke="${b}" stroke-width="${w}" stroke-linejoin="round"/>`;
  let s = `<rect width="${W}" height="${H}" fill="${ESQ.suelo}"/>`;
  if (D.mar.length) s += `<polygon points="${pts(D.mar)}" fill="#9fd3f2"/><text x="${W / 2}" y="${H - 5}" font-size="7" fill="#5f9fca" text-anchor="middle" letter-spacing="3" font-family="Manrope, Barlow, Arial">MAR CARIBE</text>`;
  // avenidas: bandas claras con su nombre (como las calles alrededor del mapa del CND)
  const vias = D.calles.filter(c => !lejos(c.p) && c.t !== 'cycleway');
  s += vias.map(c => `<polyline points="${pts(c.p)}" fill="none" stroke="#efece4" stroke-width="${c.t === 'trunk' ? 12 : 8}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const nombres = new Set();
  vias.forEach((c, i) => {
    if (!c.n || nombres.has(c.n)) return; nombres.add(c.n);
    let l = c.p; if (l[0][0] > l[l.length - 1][0]) l = l.slice().reverse();
    s += `<path id="esq-via-${i}" d="M${l.map(([x, y]) => `${X(x)} ${Y(y)}`).join(' L')}" fill="none"/><text font-size="4.6" fill="#8a8f9c" font-family="Manrope, Barlow, Arial" dy="1.6"><textPath href="#esq-via-${i}" startOffset="50%" text-anchor="middle">${esc(c.n)}</textPath></text>`;
  });
  // jardines con árboles, parqueos, piscinas y canchas
  for (const a of D.areas.filter(a => !lejos(a.p))) {
    if (a.t === 'verde') s += bloque(a.p, ESQ.verde, .8);
    else if (a.t === 'parqueo') s += bloque(a.p, ESQ.parqueo, .8);
    else if (a.t === 'piscina') s += bloque(a.p, ESQ.piscina, 1);
    else if (a.t === 'cancha') s += bloque(a.p, ESQ.cancha, 1.2);
  }
  D.areas.filter(a => a.t === 'verde' && !lejos(a.p)).forEach((a, k) => {
    const cx = a.p.reduce((t, p) => t + p[0], 0) / a.p.length, cy = a.p.reduce((t, p) => t + p[1], 0) / a.p.length;
    s += [[0, 0], [7, 4], [-6, 5], [4, -7], [-7, -4]].map(([dx, dy], i) => `<circle cx="${X(cx + dx)}" cy="${Y(cy + dy)}" r="${2.6 + (i % 2)}" fill="${ESQ.arbol[i % 2]}"/>`).join('');
  });
  // los hoteles y la carpa
  for (const e of D.edificios) s += bloque(e.p, ESQ[e.t], 1.6);
  s += bloque(D.carpa, ESQ.malecon, 1.6);
  // zonas con nombre dentro del Jaragua
  for (const [n, sub, cx, cy, w, h, c] of ESQ_ZONAS) {
    if (lejos([[cx, cy]])) continue;
    const [f, b] = ESQ[c];
    s += `<rect x="${X(cx - w / 2)}" y="${Y(cy + h / 2)}" width="${w}" height="${h}" rx="3" fill="${f}" stroke="${b}" stroke-width="1.2"/>` + esqTexto(n, X(cx), Y(cy), w, h, c === 'claro' ? '#7a1f3a' : '#fff', sub);
  }
  // salones del Sheraton, girados como el hotel
  for (const [n, id, w, h, c] of ESQ_SHERATON) {
    const l = LUGAR[id]; if (!l || lejos([l.xy])) continue;
    const [f, b] = ESQ[c || 'azulOsc'], x = X(l.xy[0]), y = Y(l.xy[1]);
    s += `<g transform="rotate(${ESQ_GIRO} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2" fill="${f}" stroke="${b}" stroke-width="1"/>${esqTexto(n, x, y, w, h, c === 'claro' ? '#7a1f3a' : '#fff')}</g>`;
  }
  // rótulos grandes
  const rot = (t, x, y, tam) => `<text x="${X(x)}" y="${Y(y)}" font-size="${tam}" font-weight="800" fill="#fff" text-anchor="middle" font-family="Manrope, Barlow, Arial" paint-order="stroke" stroke="rgba(0,0,0,.18)" stroke-width="1.2">${esc(t)}</text>`;
  s += rot('Renaissance Jaragua', -128, -40, 9) + `<g transform="rotate(${ESQ_GIRO} ${X(104)} ${Y(4)})">${rot('Sheraton', 104, 4, 8)}</g>`;
  const cm = D.carpa.reduce((t, p) => [t[0] + p[0] / D.carpa.length, t[1] + p[1] / D.carpa.length], [0, 0]);
  s += `<g transform="rotate(${ESQ_GIRO} ${X(cm[0])} ${Y(cm[1])})">${esqTexto('Malecón Terrace', X(cm[0]), Y(cm[1]), 28, 14, '#fff', 'Carpa · almuerzo')}</g>`;
  // puntos de encuentro
  s += MAPA.lugares.filter(l => l.tipo === 'encuentro' && !lejos([l.xy])).map(l => `<g><circle cx="${X(l.xy[0])}" cy="${Y(l.xy[1])}" r="5.5" fill="#2fb36b" stroke="#fff" stroke-width="1.5"/><text x="${X(l.xy[0])}" y="${Y(l.xy[1]) + 1.8}" font-size="5" font-weight="800" fill="#fff" text-anchor="middle">PE</text><text x="${X(l.xy[0]) + 8}" y="${Y(l.xy[1]) + 1.6}" font-size="4.4" fill="#2b5d27" font-family="Manrope, Barlow, Arial">Punto de encuentro</text></g>`).join('');
  // puntos que puso la dirección (pasillos, puestos, baños…) y los puntos de cobertura
  s += (estado.puntos || []).filter(q => q.ll && verCat(q.cat)).map(q => { const [x, y] = aXY(q.ll); if (lejos([[x, y]])) return ''; const [n, ic, col] = CATS[q.cat] || CATS.otro;
    return `<g class="esq-pin${esquemaSel === 'p:' + q.id ? ' sel' : ''}" data-pin="${esc(q.id)}" role="button" tabindex="0" aria-label="${esc(q.n)}"><circle cx="${X(x)}" cy="${Y(y)}" r="5.2" fill="${col}" stroke="#fff" stroke-width="1.4"/><text x="${X(x)}" y="${Y(y) + 1.9}" font-size="5.2" text-anchor="middle">${ic}</text></g>`; }).join('');
  s += COB_PUNTOS.map(p => { const pos = p.x != null && p.x !== '' ? [+p.x, +p.y] : p.lugar && LUGAR[p.lugar] ? LUGAR[p.lugar].xy : null; if (!pos || lejos([pos])) return '';
    const x = X(pos[0]), y = Y(pos[1]), r = p.id.length > 4 ? 8.5 : 7.5, sel = esquemaSel === 'c:' + p.id;
    return `<g class="esq-punto${sel ? ' sel' : ''}" data-cobpt="${esc(p.id)}" role="button" tabindex="0" aria-label="Punto ${esc(p.id)}: ${esc(p.n)}"><circle cx="${x}" cy="${y}" r="${r + (sel ? 1.5 : 0)}" fill="${COLOR_PUNTO[p.tipo] || '#16357a'}" stroke="#fff" stroke-width="1.8"/><text x="${x}" y="${(y + 1.9).toFixed(1)}" font-size="${p.id.length > 4 ? 4.6 : 5.4}" font-weight="800" fill="#fff" text-anchor="middle" font-family="Manrope, Barlow, Arial">${esc(p.id)}</text></g>`; }).join('');
  const norte = `<g transform="translate(${W - 13},14)"><circle r="8" fill="#fff" opacity=".9"/><path d="M0 -5.5 L3.6 3.5 L0 1.3 L-3.6 3.5 Z" fill="#e85d2a"/></g>`;
  const escala = `<g transform="translate(9,${H - 10})"><rect x="-3" y="-8" width="40" height="11" rx="3" fill="#fff" opacity=".85"/><line x1="0" y1="0" x2="34" y2="0" stroke="#33415c" stroke-width="1.6"/><text x="17" y="-2.6" font-size="4.6" text-anchor="middle" fill="#33415c" font-family="Manrope, Barlow, Arial">${Math.round(34)} m</text></g>`;
  const v = vistaEsquema();
  return `<svg viewBox="${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa 2D de las sedes" class="${capas.admin ? 'editando' : ''}">${s}${norte}${escala}</svg>`;
}
function pintarEsquema() {
  if (!window.ESQUEMA_LISTO) return;
  const caja = $('#mapa2d'); if (!caja) return;
  caja.hidden = !esquemaOn; $('#caja').classList.toggle('esquema', esquemaOn);
  if (esquemaOn) caja.innerHTML = svgEsquema(estado.sede || 'todas');
}
function mostrarEsquema(si) {
  esquemaOn = si; esquemaSel = null; pintarEsquema();
  if (si) $('#ficha').innerHTML = '<b>Mapa 2D</b>Toca un punto para ver qué es y quién está ahí.' + (capas.admin ? ' Estás editando: toca un lugar para poner un punto o un pasillo.' : '');
}
function fichaPuntoCob(id) {
  const p = COB_PUNTOS.find(x => x.id === id); if (!p) return;
  let f = null; try { cobEstado(); f = cobFilas(cobAhora().min).find(x => x.p.id === id); } catch {}
  const gente = f ? [...f.gente.map(g => `${esc(cobNombre(g.cod))}${g.conf != null && !g.fuera ? ' ✓' : ''}`), ...f.refs.map(r => `${esc(cobNombre(r.cod))} (refuerzo)`)] : [];
  $('#ficha').innerHTML = `<b>${esc(p.id)} · ${esc(p.n)}</b>${esc(SEDES[p.sede] ? SEDES[p.sede].nombre : '')} · ${esc(p.tipo || '')}<br>${f && f.t ? `Ahora: ${esc(f.t[2])} · ${gente.length ? gente.join(', ') : 'nadie asignado'}` : 'Sin turno en este momento'}<br><button class="mini" type="button" data-ver-cob="1">Ver en Cobertura</button>`;
}
// ---- Moverse en el plano: arrastrar, rueda o pellizco para acercar, doble toque para acercar ----
let esqVista = null, esqMovio = false;
const esqBase = s => { const [x0, y0, x1, y1] = ESQ_CAJA[s] || ESQ_CAJA.todas; return { w: x1 - x0, h: y1 - y0 }; };
function vistaEsquema() {
  const s = estado.sede || 'todas', b = esqBase(s);
  if (!esqVista || esqVista.sede !== s) esqVista = { sede: s, x: 0, y: 0, w: b.w, h: b.h };
  return esqVista;
}
function aplicarVistaEsquema() {
  const v = vistaEsquema(), b = esqBase(v.sede);
  // que no se pierda: siempre queda a la vista al menos un pedazo del plano
  v.x = Math.min(Math.max(v.x, -v.w * 0.6), b.w - v.w * 0.4); v.y = Math.min(Math.max(v.y, -v.h * 0.6), b.h - v.h * 0.4);
  const svg = $('#mapa2d svg'); if (svg) svg.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`);
}
// acerca (f < 1) o aleja (f > 1) con centro en un punto de la pantalla (o en el centro del plano)
function zoomEsquema(f, cx, cy) {
  const svg = $('#mapa2d svg'); if (!svg) return;
  const v = vistaEsquema(), b = esqBase(v.sede), r = svg.getBoundingClientRect();
  const pt = svg.createSVGPoint(); pt.x = cx != null ? cx : r.left + r.width / 2; pt.y = cy != null ? cy : r.top + r.height / 2;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  const w = Math.min(Math.max(v.w * f, b.w / 10), b.w * 1.3), k = w / v.w;
  v.x = q.x - (q.x - v.x) * k; v.y = q.y - (q.y - v.y) * k; v.w = w; v.h *= k;
  aplicarVistaEsquema();
}
function centrarEsquema() { esqVista = null; aplicarVistaEsquema(); }
(() => {
  const caja = $('#mapa2d'), dedos = new Map();
  let ini = null;
  const escala = () => { const svg = $('#mapa2d svg'); return svg ? svg.getScreenCTM().a : 1; };
  caja.addEventListener('pointerdown', e => {
    if (!e.target.closest('svg')) return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    const v = vistaEsquema();
    ini = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, s: escala(), dist: null };
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; ini.dist = Math.hypot(a[0] - b[0], a[1] - b[1]); ini.w = v.w; }
    esqMovio = false;
  });
  addEventListener('pointermove', e => {   // en la ventana: el arrastre sigue aunque el dedo salga del plano
    if (!ini || !dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    const v = vistaEsquema();
    if (dedos.size === 2 && ini.dist) {
      const [a, b] = [...dedos.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomEsquema((ini.w * ini.dist / d) / v.w, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); esqMovio = true; return;
    }
    const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
    if (!esqMovio && Math.hypot(dx, dy) < 6) return;
    esqMovio = true; caja.classList.add('arrastrando');
    v.x = ini.vx - dx / ini.s; v.y = ini.vy - dy / ini.s; aplicarVistaEsquema();
  });
  const soltar = e => {
    if (!dedos.has(e.pointerId)) return;
    dedos.delete(e.pointerId); caja.classList.remove('arrastrando');
    if (dedos.size === 1) { const [p] = [...dedos.values()], v = vistaEsquema(); ini = { x: p[0], y: p[1], vx: v.x, vy: v.y, s: escala(), dist: null }; }
    else if (!dedos.size) ini = null;
  };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  caja.addEventListener('wheel', e => { if (!e.target.closest('svg')) return; e.preventDefault(); zoomEsquema(e.deltaY > 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY); }, { passive: false });
  caja.addEventListener('dblclick', e => { if (e.target.closest('svg') && !e.target.closest('[data-cobpt],[data-pin]')) zoomEsquema(0.55, e.clientX, e.clientY); });
})();
$('#mapa2d').addEventListener('click', e => {
  if (esqMovio) { esqMovio = false; return; }   // fue un arrastre, no un toque
  const c = e.target.closest('[data-cobpt]'), pin = e.target.closest('[data-pin]');
  if (c) { esquemaSel = 'c:' + c.dataset.cobpt; fichaPuntoCob(c.dataset.cobpt); pintarEsquema(); return; }
  if (pin) { esquemaSel = 'p:' + pin.dataset.pin; tocarPunto(pin.dataset.pin); pintarEsquema(); return; }
  if (!capas.admin) return;
  // editando: el toque se convierte en metros del mapa (lo mismo que en la maqueta 3D)
  const svg = $('#mapa2d svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse()), [x0, , , y1] = ESQ_CAJA[estado.sede] || ESQ_CAJA.todas;
  alTocarMapa([q.x + x0, y1 - q.y]);
});
$('#mapa2d').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-cobpt],[data-pin]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
$('#ficha').addEventListener('click', e => { if (e.target.closest('[data-ver-cob]')) { const a = $('#rail a[href="#cobertura"]'); if (a) a.click(); else $('#cobertura').scrollIntoView(); } });
window.ESQUEMA_LISTO = true;
