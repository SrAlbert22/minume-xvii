// ---------- Mapa de puntos: plano de las sedes visto desde arriba, con cada punto de cobertura ----------
// Pedido de la dirección de Seguridad y Traslado (24 de octubre): un mapa como el del V CND, con los edificios,
// las calles y los puntos marcados, para asignar los puntos y mandarlo en PDF. Se toca un punto y sale quién está ahí.
// La coordinación y la subdirección colocan cada punto donde va: «Mover» y tocan el lugar en el mapa.
// El dibujo sale de PLANO (calles, edificios y áreas de OpenStreetMap, ver herramientas/plano_2d.py).
let planoSede = 'todas', planoSel = null, planoMover = null;
const PL_COLOR = { jaragua: ['#f0952b', '#c96f12'], sheraton: ['#3b7fd9', '#2a5ea8'], malecon: ['#ef7fae', '#c75a8a'] };
const PL_CAJA = { todas: PLANO.caja, jaragua: [-215, -175, 10, 70], sheraton: [20, -75, 165, 150], malecon: [-10, 55, 110, 150] };
const posPunto = p => p.x != null && p.y != null && p.x !== '' ? [+p.x, +p.y] : p.lugar && LUGAR[p.lugar] ? LUGAR[p.lugar].xy : null;
const ptsAttr = (l, X, Y) => l.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
function estadoPuntos() { try { cobEstado(); const { min } = cobAhora(); return Object.fromEntries(cobFilas(min).map(f => [f.p.id, f])); } catch { return {}; } }
// La carpa del Malecón Terrace está en el plano girado del Sheraton
function P2(x, y) { const ey = [-20.4 / Math.hypot(20.4, 46.6), 46.6 / Math.hypot(20.4, 46.6)], ex = [ey[1], -ey[0]]; return [79.2 + ex[0] * x + ey[0] * y, 4 + ex[1] * x + ey[1] * y]; }

function svgPlano(sede, pdf) {
  const [x0, y0, x1, y1] = PL_CAJA[sede] || PLANO.caja, W = x1 - x0, H = y1 - y0;
  const X = x => (x - x0).toFixed(1), Y = y => (y1 - y).toFixed(1);
  const fueraCaja = l => l.every(([x, y]) => x < x0 - 30 || x > x1 + 30 || y < y0 - 30 || y > y1 + 30);
  const est = estadoPuntos(), dentro = PLANO.areas.filter(a => !fueraCaja(a.p));
  const AREA = { verde: ['#b7dd98', '#9cc77b'], parqueo: ['#e4e7ec', '#cdd2da'], piscina: ['#86cdf2', '#5fb4e3'], cancha: ['#d9c58f', '#ffffff'], gradas: ['#cfc8bb', '#b8b0a2'] };
  let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="#f4f2ec"/>`;
  if (PLANO.mar.length) s += `<polygon points="${ptsAttr(PLANO.mar, X, Y)}" fill="#a9d8f5"/><text x="${(W / 2).toFixed(0)}" y="${(H - 6).toFixed(0)}" font-size="9" fill="#5a9cc8" text-anchor="middle" font-style="italic" font-family="Barlow, Arial" letter-spacing="2">MAR CARIBE</text>`;
  s += dentro.map(a => { const [f, b] = AREA[a.t] || AREA.parqueo; return `<polygon points="${ptsAttr(a.p, X, Y)}" fill="${f}" stroke="${b}" stroke-width="${a.t === 'cancha' ? 1.2 : .8}" stroke-linejoin="round"/>`; }).join('');
  // árboles: unos puntos verdes dentro de cada jardín (siempre los mismos)
  s += dentro.filter(a => a.t === 'verde').map((a, k) => { const cx = a.p.reduce((t, p) => t + p[0], 0) / a.p.length, cy = a.p.reduce((t, p) => t + p[1], 0) / a.p.length;
    return [[0, 0], [5, 3], [-4, 4], [3, -5], [-5, -3]].map(([dx, dy], i) => `<circle cx="${X(cx + dx * (1 + k % 2))}" cy="${Y(cy + dy * (1 + k % 2))}" r="${2.4 + (i % 2)}" fill="#6fae4f"/>`).join(''); }).join('');
  // calles: borde gris y centro blanco; las principales con su nombre a lo largo
  const ANCHO = { trunk: 11, secondary: 10, residential: 7, service: 4.5, cycleway: 4 };
  const calles = PLANO.calles.filter(c => !fueraCaja(c.p));
  s += calles.map(c => `<polyline points="${ptsAttr(c.p, X, Y)}" fill="none" stroke="${c.t === 'cycleway' ? '#d8ccb0' : '#c9ccd3'}" stroke-width="${ANCHO[c.t] + 1.6}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  s += calles.filter(c => c.t !== 'cycleway').map(c => `<polyline points="${ptsAttr(c.p, X, Y)}" fill="none" stroke="#ffffff" stroke-width="${ANCHO[c.t]}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const nombres = new Set();
  calles.forEach((c, i) => {
    if (!c.n || nombres.has(c.n) || c.p.length < 2) return;
    const largo = c.p.slice(1).reduce((t, p, j) => t + Math.hypot(p[0] - c.p[j][0], p[1] - c.p[j][1]), 0); if (largo < 60) return;
    nombres.add(c.n); let pts = c.p; if (pts[0][0] > pts[pts.length - 1][0]) pts = pts.slice().reverse();   // que el texto no quede de cabeza
    s += `<path id="calle-${sede}-${pdf ? 'p' : 'w'}-${i}" d="M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join(' L')}" fill="none"/><text font-size="5.6" fill="#7a8194" font-family="Barlow, Arial" font-weight="600" dy="2"><textPath href="#calle-${sede}-${pdf ? 'p' : 'w'}-${i}" startOffset="50%" text-anchor="middle">${esc(c.n)}</textPath></text>`;
  });
  // edificios: los vecinos en gris y las sedes con su color y su nombre
  s += PLANO.edificios.filter(e => !fueraCaja(e.p)).map(e => { const [f, b] = e.t === 'vecino' ? ['#dcd8cf', '#c4bfb4'] : PL_COLOR[e.t]; return `<polygon points="${ptsAttr(e.p, X, Y)}" fill="${f}" stroke="${b}" stroke-width="1" stroke-linejoin="round"/>`; }).join('');
  s += `<polygon points="${ptsAttr(PLANO.carpa, X, Y)}" fill="${PL_COLOR.malecon[0]}" stroke="${PL_COLOR.malecon[1]}" stroke-width="1" stroke-linejoin="round"/>`;
  const rotulo = (txt, [x, y], t = 8) => `<text x="${X(x)}" y="${Y(y)}" font-size="${t}" font-weight="800" fill="#fff" text-anchor="middle" font-family="Barlow Condensed, Arial" paint-order="stroke" stroke="rgba(0,0,0,.3)" stroke-width="1.5">${esc(txt)}</text>`;
  s += rotulo('RENAISSANCE JARAGUA', [-150, -103], 8.5) + rotulo('SHERATON', [84, 20]) + rotulo('MALECÓN TERRACE', P2(15.5, 93), 6);
  // lugares de referencia (lobbies, entradas, puntos de encuentro)
  s += MAPA.lugares.filter(l => ['lobby', 'entrada', 'encuentro'].includes(l.tipo) && !fueraCaja([l.xy])).map(l => `<g><circle cx="${X(l.xy[0])}" cy="${Y(l.xy[1])}" r="2" fill="#1b1f45" opacity=".55"/><text x="${(+X(l.xy[0]) + 4).toFixed(1)}" y="${(+Y(l.xy[1]) + 2).toFixed(1)}" font-size="5" fill="#3d4466" font-family="Barlow, Arial">${esc(l.n.replace(/ · .*/, ''))}</text></g>`).join('');
  // los puntos de cobertura: el color dice cómo está ahora
  const TONO = { cubierta: '#19b37a', incompleta: '#e6a400', descubierta: '#e53535', libre: '#0a2a6b' };
  s += COB_PUNTOS.filter(p => sede === 'todas' || p.sede === sede).map(p => {
    const pos = posPunto(p); if (!pos || fueraCaja([pos])) return '';
    const x = +X(pos[0]), y = +Y(pos[1]), w = p.id.length * 4.6 + 9, f = est[p.id], c = pdf ? '#0a2a6b' : TONO[f ? f.est : 'libre'], sel = !pdf && planoSel === p.id;
    return `<g class="pl-punto" data-pt="${esc(p.id)}" role="button" tabindex="0" aria-label="Punto ${esc(p.id)}: ${esc(p.n)}"><circle cx="${x}" cy="${y}" r="${sel ? 4.5 : 3}" fill="${c}" stroke="#fff" stroke-width="1.2"/>
      <rect x="${(x - w / 2).toFixed(1)}" y="${(y - 15).toFixed(1)}" width="${w.toFixed(1)}" height="10" rx="5" fill="${c}" stroke="${sel ? '#fff' : 'none'}" stroke-width="1.2"/><text x="${x}" y="${(y - 7.6).toFixed(1)}" font-size="6.8" font-weight="800" fill="#fff" text-anchor="middle" font-family="Barlow Condensed, Arial">${esc(p.id)}</text></g>`;
  }).join('');
  const norte = `<g transform="translate(${W - 14},16)"><circle r="9" fill="#fff" stroke="#c9ccd3"/><path d="M0 -6 L4 4 L0 1.5 L-4 4 Z" fill="#e85d2a"/><text y="-10" font-size="6" text-anchor="middle" fill="#1b1f45" font-family="Barlow, Arial" font-weight="700">N</text></g>`;
  const escala = `<g transform="translate(10,${H - 12})"><rect x="-3" y="-9" width="56" height="13" rx="3" fill="#fff" opacity=".85"/><line x1="0" y1="0" x2="50" y2="0" stroke="#1b1f45" stroke-width="2"/><text x="25" y="-3" font-size="5.5" text-anchor="middle" fill="#1b1f45" font-family="Barlow, Arial">50 m</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa de puntos de cobertura" class="${planoMover && !pdf ? 'moviendo' : ''}">${s}${norte}${escala}</svg>`;
}

function pintarPlano() {
  const caja = $('#cobPlano'); if (!caja) return;
  $$('#planoSedes button').forEach(b => b.classList.toggle('on', b.dataset.s === planoSede));
  caja.innerHTML = svgPlano(planoSede, false);
  const admin = typeof puedeAsignar === 'function' && puedeAsignar();
  const sin = COB_PUNTOS.filter(p => (planoSede === 'todas' || p.sede === planoSede) && !posPunto(p));
  $('#cobPlanoNota').innerHTML = planoMover ? `<b style="color:var(--amarillo)">Toca en el mapa dónde va ${esc(planoMover)}.</b> <button class="mini" type="button" data-pl="cancelar">Cancelar</button>`
    : (sin.length ? `Sin lugar en el mapa: ${sin.map(p => admin ? `<button class="mini" type="button" data-pl="mover" data-id="${esc(p.id)}">📍 Colocar ${esc(p.id)}</button>` : esc(p.id)).join(' ')} · ` : '') + 'Toca un punto para ver quién está ahí. Verde: cubierto · amarillo: falta gente · rojo: sin nadie.';
  pintarInfoPunto();
}
function pintarInfoPunto() {
  const box = $('#cobPlanoInfo'); if (!box) return;
  const p = COB_PUNTOS.find(x => x.id === planoSel); if (!p) { box.hidden = true; return; }
  const f = estadoPuntos()[p.id], { min } = cobAhora(), admin = puedeAsignar();
  const ahora = f && f.t ? `${esc(f.t[2])} · ${cobHora(f.t[0])} a ${cobHora(f.t[1])}` : 'Sin turno en este momento';
  const gente = f ? [...f.gente.map(g => `${esc(cobNombre(g.cod))}${g.fuera ? ' (de refuerzo en ' + esc(g.fuera) + ')' : g.conf != null ? ' ✓' : ' · no ha llegado'}`), ...f.refs.map(r => `${esc(cobNombre(r.cod))} (refuerzo)`)] : [];
  const prox = p.turnos.find(t => t[0] > min);
  box.hidden = false;
  box.innerHTML = `<div class="pl-info-cab"><span class="pl-cod">${esc(p.id)}</span><div><b>${esc(p.n)}</b><small>${esc(SEDES[p.sede] ? SEDES[p.sede].nombre : p.sede)} · ${esc(p.tipo || '')}</small></div>${f ? `<span class="chip ${(COB_EST[f.est] || ['', ''])[1]}">${(COB_EST[f.est] || [''])[0]}</span>` : ''}</div>
    <div class="dato"><span>Ahora</span><b>${ahora}</b></div>
    <div class="dato"><span>Quién</span><b>${gente.length ? gente.join(', ') : 'Nadie asignado'}</b></div>
    ${prox ? `<div class="dato"><span>Próximo turno</span><b>${cobHora(prox[0])} · ${prox[3].map(([c]) => esc(cobCorto(c))).join(', ') || 'sin asignar'}</b></div>` : ''}
    <div class="pl-acc"><button class="mini" type="button" data-cob="plan" data-p="${esc(p.id)}">Ver turnos del punto</button>${p.lugar ? `<button class="mini" type="button" data-cob="mapa" data-p="${esc(p.id)}">Cómo llegar</button>` : ''}${admin ? `<button class="mini" type="button" data-pl="mover" data-id="${esc(p.id)}">📍 Mover</button>` : ''}<button class="mini" type="button" data-pl="cerrar">Cerrar</button></div>`;
}
function imprimirPlano() {
  const sede = planoSede, titulo = sede === 'todas' ? 'Todas las sedes' : SEDES[sede].nombre;
  const fecha = new Date(ahoraMs()).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santo_Domingo' });
  const filas = COB_PUNTOS.filter(p => sede === 'todas' || p.sede === sede).map(p => `<tr><td><span class="cod">${esc(p.id)}</span></td><td><b>${esc(p.n)}</b><br><small>${esc(SEDES[p.sede] ? SEDES[p.sede].corto : p.sede)} · ${esc(p.tipo || '')}${posPunto(p) ? '' : ' · sin lugar en el mapa'}</small></td><td>${p.turnos.map(t => `${cobHora(t[0])}–${cobHora(t[1])} · ${t[3].length ? t[3].map(([c]) => esc(cobNombre(c))).join(', ') : '<i>sin asignar</i>'}`).join('<br>') || 'Sin turnos'}</td><td class="vacio"></td></tr>`).join('');
  // Se imprime desde un marco escondido: funciona en el teléfono y en la app instalada. Al imprimir: «Guardar como PDF».
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f); const w = f.contentWindow;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset=utf-8><title>Mapa de puntos · ${esc(titulo)} · MINUME XVII</title>
    <style>@page{size:A4 portrait;margin:11mm}body{font-family:Barlow,Arial,sans-serif;color:#1b1f45;margin:0}h1{font-family:'Barlow Condensed',Arial;font-size:26px;margin:0;text-transform:uppercase;color:#0a0464}
    .cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0090fb;padding-bottom:6px;margin-bottom:10px}.cab small{color:#5b6390}
    .plano{border:1px solid #dde3f5;border-radius:12px;overflow:hidden;page-break-inside:avoid}.plano svg{width:100%;height:auto;display:block}
    .ley{display:flex;gap:14px;font-size:10px;color:#5b6390;margin:6px 2px}.ley i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:10.5px}th{background:#0a0464;color:#fff;text-align:left;padding:6px;font-family:'Barlow Condensed',Arial;text-transform:uppercase}td{border-bottom:1px solid #dde3f5;padding:6px;vertical-align:top}td.vacio{width:24%}
    .cod{display:inline-block;background:#0a2a6b;color:#fff;border-radius:99px;padding:2px 8px;font-weight:800;font-family:'Barlow Condensed',Arial}.pie{margin-top:8px;font-size:9.5px;color:#5b6390}</style></head><body>
    <div class="cab"><div><small>MINUME XVII · Seguridad y Traslado</small><h1>Mapa de puntos · ${esc(titulo)}</h1></div><small>${esc(fecha)} · ${esc(yoNombre())}</small></div>
    <div class="plano">${svgPlano(sede, true)}</div>
    <div class="ley"><span><i style="background:#f0952b"></i>Renaissance Jaragua</span><span><i style="background:#3b7fd9"></i>Sheraton</span><span><i style="background:#ef7fae"></i>Malecón Terrace</span><span><i style="background:#0a2a6b;border-radius:50%"></i>Punto de cobertura</span></div>
    <table><thead><tr><th>Punto</th><th>Lugar</th><th>Turnos y personas</th><th>Notas / asignar</th></tr></thead><tbody>${filas}</tbody></table>
    <p class="pie">Los puntos, turnos y personas se cambian en la página (Cobertura y «Datos del evento»). Plano hecho con las calles y contornos de OpenStreetMap; confirmar en la visita.</p></body></html>`);
  w.document.close(); toast('Elige «Guardar como PDF» para bajar el mapa');
  setTimeout(() => { try { w.focus(); w.print(); } catch {} setTimeout(() => f.remove(), 60000); }, 500);
}
function moverPuntoA(e) {
  const svg = $('#cobPlano svg'); if (!svg || !planoMover) return false;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  const [x0, , , y1] = PL_CAJA[planoSede] || PLANO.caja, p = COB_PUNTOS.find(x => x.id === planoMover); if (!p) return false;
  p.x = Math.round((q.x + x0) * 10) / 10; p.y = Math.round((y1 - q.y) * 10) / 10;
  guardarComp(CFG('puntos'), DATOS.puntos.leer());
  registrar('📍 Punto en el mapa', `${p.id} · ${p.n} quedó colocado en el mapa`);
  toast(`${p.id} quedó en ese lugar del mapa`); planoSel = p.id; planoMover = null; pintarPlano(); return true;
}
$('#cobPlano').addEventListener('click', e => {
  if (planoMover && moverPuntoA(e)) return;
  const g = e.target.closest('[data-pt]'); if (!g) return;
  planoSel = planoSel === g.dataset.pt ? null : g.dataset.pt; pintarPlano();
});
$('#cobPlano').addEventListener('keydown', e => { const g = e.target.closest('[data-pt]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); planoSel = g.dataset.pt; pintarPlano(); } });
$('#cobertura').addEventListener('click', e => {
  const b = e.target.closest('[data-pl]'); if (!b) return;
  if (b.dataset.pl === 'mover') { planoMover = b.dataset.id; const p = COB_PUNTOS.find(x => x.id === planoMover); if (p && planoSede !== 'todas' && p.sede !== planoSede) planoSede = p.sede; toast(`Toca en el mapa dónde va ${planoMover}`); }
  else if (b.dataset.pl === 'cancelar') planoMover = null;
  else if (b.dataset.pl === 'cerrar') planoSel = null;
  pintarPlano();
});
$('#planoSedes').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { planoSede = b.dataset.s; pintarPlano(); } });
$('#planoPdf').addEventListener('click', imprimirPlano);
addEventListener('storage', e => { if (e.key && /config\.(puntos|turnos|staff)$|compartido\.cobertura$/.test(e.key)) pintarPlano(); });
setInterval(() => { if (!document.hidden && !planoMover) pintarPlano(); }, 60000);
pintarPlano();
