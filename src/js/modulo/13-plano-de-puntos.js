// ---------- Plano de puntos: el mapa de las sedes con cada punto de cobertura marcado ----------
// Pedido de la dirección de Seguridad y Traslado (24 de octubre): un plano como el del V CND para asignar los puntos
// y mandarlo en PDF. Sale de los mismos datos del mapa (caminos y lugares en metros) y de los puntos de «Datos del evento».
let planoSede = 'todas';
const COLOR_SEDE = { jaragua: '#00b5ff', sheraton: '#ffbeff', malecon: '#00fdef' };
function puntosEnPlano(sede) {
  return COB_PUNTOS.filter(p => (sede === 'todas' || p.sede === sede)).map(p => ({ p, l: p.lugar && LUGAR[p.lugar] })).filter(x => x.l);
}
function svgPlano(sede, claro) {
  const lugares = MAPA.lugares.filter(l => l.tipo !== 'referencia' && (sede === 'todas' || l.sede === sede));
  const nodos = Object.entries(MAPA.xy).filter(([id]) => sede === 'todas' || lugares.some(l => l.nodo === id) || MAPA.tramos.some(([a, b]) => (a === id || b === id) && lugares.some(l => l.nodo === a || l.nodo === b)));
  const pts = [...lugares.map(l => l.xy), ...nodos.map(([, xy]) => xy)];
  if (!pts.length) return '';
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), m = 30;
  const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
  const X = x => (x - x0).toFixed(1), Y = y => (y1 - y).toFixed(1);   // en el mapa el norte es +y; en el dibujo, arriba
  const tinta = claro ? '#1b1f45' : '#e9eeff', suave = claro ? '#8a93b8' : 'rgba(233,238,255,.45)', camino = claro ? '#c9d2ee' : 'rgba(0,181,255,.35)';
  const enNodos = new Set(nodos.map(([id]) => id));
  const lineas = MAPA.tramos.filter(([a, b]) => enNodos.has(a) && enNodos.has(b)).map(([a, b, , afuera]) => `<line x1="${X(MAPA.xy[a][0])}" y1="${Y(MAPA.xy[a][1])}" x2="${X(MAPA.xy[b][0])}" y2="${Y(MAPA.xy[b][1])}" stroke="${camino}" stroke-width="${afuera ? 4 : 2.5}" stroke-linecap="round"${afuera ? '' : ' stroke-dasharray="5 4"'}/>`).join('');
  const marcas = lugares.map((l, i) => `<g><circle cx="${X(l.xy[0])}" cy="${Y(l.xy[1])}" r="3.2" fill="${COLOR_SEDE[l.sede] || suave}"/><text x="${(+X(l.xy[0]) + 5).toFixed(1)}" y="${(+Y(l.xy[1]) + 3).toFixed(1)}" font-size="7.5" fill="${suave}" font-family="Barlow, Arial">${esc(l.n.replace(/ \(.*\)/, ''))}</text></g>`).join('');
  const puntos = puntosEnPlano(sede).map(({ p, l }, i) => { const x = +X(l.xy[0]), y = +Y(l.xy[1]) - 14 - (i % 2) * 9, w = p.id.length * 6.4 + 10;
    return `<g><line x1="${x}" y1="${+Y(l.xy[1])}" x2="${x}" y2="${y + 5}" stroke="#e53535" stroke-width="1.2"/><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="${w.toFixed(1)}" height="12" rx="6" fill="#e53535"/><text x="${x}" y="${(y + 3.2).toFixed(1)}" font-size="8.5" font-weight="700" text-anchor="middle" fill="#fff" font-family="Barlow Condensed, Arial">${esc(p.id)}</text></g>`; }).join('');
  const norte = `<g transform="translate(${(x1 - x0 - 18).toFixed(1)},18)"><path d="M0 -10 L5 4 L0 1 L-5 4 Z" fill="${tinta}"/><text y="14" font-size="8" text-anchor="middle" fill="${tinta}" font-family="Barlow, Arial">N</text></g>`;
  const escala = `<g transform="translate(14,${(y1 - y0 - 12).toFixed(1)})"><line x1="0" y1="0" x2="50" y2="0" stroke="${tinta}" stroke-width="2"/><text x="25" y="-4" font-size="7.5" text-anchor="middle" fill="${tinta}" font-family="Barlow, Arial">50 m</text></g>`;
  return `<svg viewBox="0 0 ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de puntos de cobertura">${lineas}${marcas}${puntos}${norte}${escala}</svg>`;
}
// Quién cubre cada punto: los turnos del día con las personas asignadas
function filasPlano(sede) {
  return COB_PUNTOS.filter(p => sede === 'todas' || p.sede === sede).map(p => ({ p, turnos: p.turnos.map(t => `${cobHora(t[0])}–${cobHora(t[1])}: ${t[3].length ? t[3].map(([c]) => cobNombre(c)).join(', ') : 'sin asignar'}`) }));
}
function pintarPlano() {
  const caja = $('#cobPlano'); if (!caja) return;
  $$('#planoSedes button').forEach(b => b.classList.toggle('on', b.dataset.s === planoSede));
  caja.innerHTML = svgPlano(planoSede, false) || '<p class="cob-sub">No hay lugares en el mapa para esta sede.</p>';
  const sin = COB_PUNTOS.filter(p => (planoSede === 'todas' || p.sede === planoSede) && !(p.lugar && LUGAR[p.lugar]));
  $('#cobPlanoNota').textContent = sin.length ? `Sin lugar en el mapa (salen solo en la lista del PDF): ${sin.map(p => p.id).join(', ')}.` : 'Los puntos en rojo son los de cobertura; los demás son lugares de referencia.';
}
function imprimirPlano() {
  // Se imprime desde un marco escondido: funciona en el teléfono y en la app instalada (sin ventanas emergentes). «Guardar como PDF» al imprimir.
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f); const w = f.contentWindow;
  const sede = planoSede, titulo = sede === 'todas' ? 'Todas las sedes' : SEDES[sede].nombre;
  const fecha = new Date(ahoraMs()).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santo_Domingo' });
  const filas = filasPlano(sede).map(({ p, turnos }) => `<tr><td><b>${esc(p.id)}</b></td><td>${esc(p.n)}</td><td>${esc(SEDES[p.sede] ? SEDES[p.sede].corto : p.sede)}</td><td>${esc(p.tipo || '')}</td><td>${turnos.map(esc).join('<br>') || 'Sin turnos'}</td><td class="vacio"></td></tr>`).join('');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset=utf-8><title>Plano de puntos · ${esc(titulo)} · MINUME XVII</title>
    <style>@page{size:A4 landscape;margin:12mm}body{font-family:Barlow,Arial,sans-serif;color:#1b1f45;margin:0}h1{font-family:'Barlow Condensed',Arial;font-size:26px;margin:0;text-transform:uppercase;color:#0a0464}
    .cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0090fb;padding-bottom:6px;margin-bottom:10px}.cab small{color:#5b6390}
    .plano{border:1px solid #dde3f5;border-radius:10px;padding:6px;page-break-inside:avoid}.plano svg{width:100%;height:auto;max-height:150mm;display:block}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}th{background:#0a0464;color:#fff;text-align:left;padding:6px;font-family:'Barlow Condensed',Arial;text-transform:uppercase}td{border-bottom:1px solid #dde3f5;padding:6px;vertical-align:top}td.vacio{width:22%}
    .pie{margin-top:8px;font-size:10px;color:#5b6390}</style></head><body>
    <div class="cab"><div><small>MINUME XVII · Seguridad y Traslado</small><h1>Plano de puntos · ${esc(titulo)}</h1></div><small>${esc(fecha)} · ${esc(yoNombre())}</small></div>
    <div class="plano">${svgPlano(sede, true)}</div>
    <table><thead><tr><th>Punto</th><th>Lugar</th><th>Sede</th><th>Tipo</th><th>Turnos y personas</th><th>Notas / asignar</th></tr></thead><tbody>${filas}</tbody></table>
    <p class="pie">Los puntos y turnos se cambian en «Datos del evento». El plano sale de la maqueta de las sedes: confirmar distancias en la visita.</p></body></html>`);
  w.document.close(); toast('Elige «Guardar como PDF» para bajar el plano');
  setTimeout(() => { try { w.focus(); w.print(); } catch {} setTimeout(() => f.remove(), 60000); }, 500);
}
$('#planoSedes').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { planoSede = b.dataset.s; pintarPlano(); } });
$('#planoPdf').addEventListener('click', imprimirPlano);
addEventListener('storage', e => { if (e.key && /config\.(puntos|turnos|staff)$/.test(e.key)) pintarPlano(); });
pintarPlano();
