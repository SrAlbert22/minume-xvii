// Mapa en PDF para que la dirección de Seguridad y Traslado marque sus puntos · Albert Silvestre
// Arma docs/mapa-para-asignar.html con el plano 2D (estilo del mapa del V CND) y una cuadrícula para ubicar cada punto,
// más una tabla para anotarlos. Después se imprime a PDF con Edge (ver el final de este archivo).
//   node herramientas/mapa_para_asignar.js
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const cargar = (archivo, nombre) => { const s = fs.readFileSync(path.join(RAIZ, 'src/js/modulo', archivo), 'utf8'); return JSON.parse(s.slice(s.indexOf('{', s.indexOf(nombre)), s.lastIndexOf('}') + 1)); };
const MAPA = cargar('07-datos-mapa.js', 'const MAPA'), D = cargar('07-mapa-2d-datos.js', 'const MAPA_2D');
const LUGAR = Object.fromEntries(MAPA.lugares.map(l => [l.id, l]));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const C = {
  suelo: '#cfe8a8', verde: ['#b3da86', '#9cc873'], arbol: ['#6db544', '#5aa337'], parqueo: ['#e7e4dc', '#d6d2c6'], piscina: ['#6fc3ef', '#4aa9de'], cancha: ['#dcc78f', '#fff'],
  jaragua: ['#3aa83a', '#2c8a2c'], sheraton: ['#3b7fd9', '#2a63b3'], malecon: ['#e86f93', '#c94d75'],
  oscuro: ['#2f8a2f', '#23702a'], naranja: ['#e8921b', '#c06e10'], morado: ['#8e6bd8', '#6c4fb5'], claro: ['#e9a0b0', '#c9748a'], azulOsc: ['#2d68c0', '#1f4f99'],
};
const ZONAS = [
  ['Teatro La Fiesta', '', -175.7, -90.2, 34, 24, 'naranja'], ['Casino', '', -155.9, -62.1, 26, 16, 'morado'],
  ['Anacaona', 'Salones 1, 2 y 3', -104.9, -104.3, 36, 16, 'oscuro'], ['Salones', 'Marién · Maguá · Higüey · Maguana', -75, -93.5, 34, 15, 'oscuro'],
  ['Las Olas', '', -57.5, -81.8, 16, 11, 'oscuro'], ['Lobby', 'Jaragua', -68, -66.6, 24, 14, 'claro'], ['Sol de Oro', '', -59.6, -34, 20, 11, 'oscuro'],
];
const SHERATON = [['Lobby', 's-lobby', 20, 10, 'claro'], ['Samaná', 'samana', 11, 8], ['Bonanza', 'bonanza', 11, 8], ['Constanza', 'constanza', 11, 8], ['Yarey', 'yarey', 11, 8],
  ['Da Vinci', 'da-vinci', 9, 7], ['Board Room', 'board-room', 9, 7], ['Este I', 'este-1', 6, 5], ['Este II', 'este-2', 6, 5], ['Este III', 'este-3', 6, 5], ['Este IV', 'este-4', 6, 5], ['Este V', 'este-5', 6, 5], ['Este VI', 'este-6', 6, 5]];
const GIRO = -23.6;

function texto(txt, x, y, w, h, color = '#fff', sub = '') {
  const t = Math.max(2.4, Math.min(7.5, w / Math.max(4, txt.length) * 1.55, h * (sub ? 0.34 : 0.45)));
  return `<text x="${x}" y="${(y + (sub ? -t * 0.15 : t * 0.35)).toFixed(1)}" font-size="${t.toFixed(1)}" font-weight="700" fill="${color}" text-anchor="middle">${esc(txt)}</text>`
    + (sub ? `<text x="${x}" y="${(y + t * 0.95).toFixed(1)}" font-size="${(t * 0.55).toFixed(1)}" fill="${color}" opacity=".92" text-anchor="middle">${esc(sub)}</text>` : '');
}
// Plano con cuadrícula. pre: letra de la página para nombrar los cuadros (J-C4); celda: tamaño del cuadro en metros
function plano([x0, y0, x1, y1], pre, celda) {
  const W = x1 - x0, H = y1 - y0, X = x => +(x - x0).toFixed(1), Y = y => +(y1 - y).toFixed(1), pts = l => l.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
  const lejos = l => l.every(([x, y]) => x < x0 - 30 || x > x1 + 30 || y < y0 - 30 || y > y1 + 30);
  const bloque = (l, [f, b], w = 1.4) => `<polygon points="${pts(l)}" fill="${f}" stroke="${b}" stroke-width="${w}" stroke-linejoin="round"/>`;
  let s = `<rect width="${W}" height="${H}" fill="${C.suelo}"/>`;
  if (D.mar.length) s += `<polygon points="${pts(D.mar)}" fill="#9fd3f2"/>`;
  const vias = D.calles.filter(c => !lejos(c.p) && c.t !== 'cycleway');
  s += vias.map(c => `<polyline points="${pts(c.p)}" fill="none" stroke="#efece4" stroke-width="${c.t === 'trunk' ? 12 : 8}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const nombres = new Set();
  vias.forEach((c, i) => { if (!c.n || nombres.has(c.n)) return; nombres.add(c.n); let l = c.p; if (l[0][0] > l[l.length - 1][0]) l = l.slice().reverse();
    s += `<path id="v-${pre}-${i}" d="M${l.map(([x, y]) => `${X(x)} ${Y(y)}`).join(' L')}" fill="none"/><text font-size="4.4" fill="#8a8f9c" dy="1.5"><textPath href="#v-${pre}-${i}" startOffset="50%" text-anchor="middle">${esc(c.n)}</textPath></text>`; });
  for (const a of D.areas.filter(a => !lejos(a.p))) s += bloque(a.p, C[a.t === 'verde' ? 'verde' : a.t] || C.parqueo, a.t === 'cancha' ? 1.2 : .8);
  D.areas.filter(a => a.t === 'verde' && !lejos(a.p)).forEach(a => { const cx = a.p.reduce((t, p) => t + p[0], 0) / a.p.length, cy = a.p.reduce((t, p) => t + p[1], 0) / a.p.length;
    s += [[0, 0], [7, 4], [-6, 5], [4, -7], [-7, -4]].map(([dx, dy], i) => `<circle cx="${X(cx + dx)}" cy="${Y(cy + dy)}" r="${2.6 + (i % 2)}" fill="${C.arbol[i % 2]}"/>`).join(''); });
  for (const e of D.edificios) s += bloque(e.p, C[e.t], 1.6);
  s += bloque(D.carpa, C.malecon, 1.6);
  for (const [n, sub, cx, cy, w, h, c] of ZONAS) { if (lejos([[cx, cy]])) continue; const [f, b] = C[c];
    s += `<rect x="${X(cx - w / 2)}" y="${Y(cy + h / 2)}" width="${w}" height="${h}" rx="3" fill="${f}" stroke="${b}" stroke-width="1.2"/>` + texto(n, X(cx), Y(cy), w, h, c === 'claro' ? '#7a1f3a' : '#fff', sub); }
  for (const [n, id, w, h, c] of SHERATON) { const l = LUGAR[id]; if (!l || lejos([l.xy])) continue; const [f, b] = C[c || 'azulOsc'], x = X(l.xy[0]), y = Y(l.xy[1]);
    s += `<g transform="rotate(${GIRO} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2" fill="${f}" stroke="${b}" stroke-width="1"/>${texto(n, x, y, w, h, c === 'claro' ? '#7a1f3a' : '#fff')}</g>`; }
  const rot = (t, x, y, tam) => `<text x="${X(x)}" y="${Y(y)}" font-size="${tam}" font-weight="800" fill="#fff" text-anchor="middle" paint-order="stroke" stroke="rgba(0,0,0,.18)" stroke-width="1.2">${esc(t)}</text>`;
  if (!lejos([[-128, -40]])) s += rot('Renaissance Jaragua', -128, -40, 9);
  if (!lejos([[104, 4]])) s += `<g transform="rotate(${GIRO} ${X(104)} ${Y(4)})">${rot('Sheraton', 104, 4, 8)}</g>`;
  const cm = D.carpa.reduce((t, p) => [t[0] + p[0] / D.carpa.length, t[1] + p[1] / D.carpa.length], [0, 0]);
  if (!lejos([cm])) s += `<g transform="rotate(${GIRO} ${X(cm[0])} ${Y(cm[1])})">${texto('Malecón Terrace', X(cm[0]), Y(cm[1]), 28, 14, '#fff', 'Carpa · almuerzo')}</g>`;
  // referencias: entradas, lobbies, canchas y puntos de encuentro
  s += MAPA.lugares.filter(l => ['entrada', 'encuentro', 'referencia'].includes(l.tipo) && !lejos([l.xy])).map(l => { const x = X(l.xy[0]), y = Y(l.xy[1]), pe = l.tipo === 'encuentro';
    return `<circle cx="${x}" cy="${y}" r="${pe ? 4 : 2.4}" fill="${pe ? '#2fb36b' : '#1b1f45'}" stroke="#fff" stroke-width="1"/><text x="${x + 5}" y="${y + 1.6}" font-size="4" fill="#1b1f45" paint-order="stroke" stroke="rgba(255,255,255,.75)" stroke-width="1.4">${esc(l.n)}</text>`; }).join('');
  // cuadrícula: letras arriba (columnas) y números a la izquierda (filas)
  const cols = Math.ceil(W / celda), filas = Math.ceil(H / celda), L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 1; i < cols; i++) s += `<line x1="${i * celda}" y1="0" x2="${i * celda}" y2="${H}" stroke="#1b1f45" stroke-opacity=".28" stroke-width=".5" stroke-dasharray="2 2"/>`;
  for (let j = 1; j < filas; j++) s += `<line x1="0" y1="${j * celda}" x2="${W}" y2="${j * celda}" stroke="#1b1f45" stroke-opacity=".28" stroke-width=".5" stroke-dasharray="2 2"/>`;
  // las etiquetas no se tapan entre sí (la primera columna y la primera fila se corren) ni se salen del borde
  for (let i = 0; i < cols; i++) { const cx = i * celda + celda / 2; if (cx + 6 > W) continue; s += `<rect x="${cx - 6}" y="1.5" width="12" height="8" rx="2" fill="#0a0464"/><text x="${cx}" y="7.6" font-size="5.6" font-weight="800" fill="#fff" text-anchor="middle">${pre}-${L[i]}</text>`; }
  for (let j = 0; j < filas; j++) { const cy = Math.max(j * celda + celda / 2, 17); if (cy + 4 > H) continue; s += `<rect x="1.5" y="${cy - 4}" width="9" height="8" rx="2" fill="#0a0464"/><text x="6" y="${cy + 2.1}" font-size="5.6" font-weight="800" fill="#fff" text-anchor="middle">${j + 1}</text>`; }
  s += `<g transform="translate(${W - 14},20)"><circle r="8" fill="#fff" opacity=".95"/><path d="M0 -5.5 L3.6 3.5 L0 1.3 L-3.6 3.5 Z" fill="#e85d2a"/><text y="-9.5" font-size="5" text-anchor="middle" font-weight="800" fill="#1b1f45">N</text></g>`;
  s += `<g transform="translate(16,${H - 9})"><rect x="-4" y="-8" width="${celda + 8}" height="11" rx="3" fill="#fff" opacity=".9"/><line x1="0" y1="0" x2="${celda}" y2="0" stroke="#1b1f45" stroke-width="1.6"/><text x="${celda / 2}" y="-2.6" font-size="4.4" text-anchor="middle" fill="#1b1f45">${celda} m (un cuadro)</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Barlow, Arial, sans-serif">${s}</svg>`;
}

const PAGINAS = [
  ['Las dos sedes', 'Vista general · cada cuadro mide 40 m', [-215, -170, 160, 145], 'G', 40],
  ['Renaissance Jaragua', 'Cada cuadro mide 20 m', [-205, -160, -15, 35], 'J', 20],
  ['Sheraton y Malecón Terrace', 'Cada cuadro mide 20 m', [-5, -60, 150, 140], 'S', 20],
];
const cab = (t, sub, n) => `<div class="cab"><div><span class="eti">MINUME XVII · Seguridad y Traslado · Mapa para asignar puntos</span><h1>${esc(t)}</h1><small>${esc(sub)}</small></div><img src="../src/marca/minume-xvii-oscuro.svg" alt="MINUME XVII"><span class="pag">${n}</span></div>`;
const filas = Array.from({ length: 18 }, (_, i) => `<tr><td>P${i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');
const html = `<!doctype html><html lang="es-DO"><head><meta charset="utf-8"><title>MINUME XVII · Mapa para asignar puntos</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet">
<!-- Lo arma herramientas/mapa_para_asignar.js · Albert Silvestre -->
<style>
  @page { size: Letter landscape; margin: 9mm; }
  * { box-sizing: border-box; } body { margin: 0; font: 10pt/1.4 Barlow, Arial, sans-serif; color: #1b1f45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hoja { height: 197mm; display: flex; flex-direction: column; page-break-after: always; }
  .hoja:last-child { page-break-after: auto; }
  .cab { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid; border-image: linear-gradient(90deg, #0a0464, #002193, #0043c5, #0090fb, #00b5ff, #00fdef) 1; padding-bottom: 4px; margin-bottom: 6px; }
  .cab > div { flex: 1; } .cab img { height: 13mm; } .eti { font: 700 7.5pt Barlow; letter-spacing: .08em; text-transform: uppercase; color: #0043c5; }
  h1 { margin: 0; font: 800 22pt/1 'Barlow Condensed', Arial; text-transform: uppercase; color: #0a0464; } .cab small { color: #5b6390; }
  .pag { font: 800 12pt 'Barlow Condensed'; color: #fff; background: #0a0464; border-radius: 99px; padding: 2px 10px; }
  .mapa { flex: 1; min-height: 0; display: flex; justify-content: center; } .mapa svg { height: 100%; width: auto; max-width: 100%; border-radius: 10px; border: 1px solid #c9d2ee; }
  .como { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 6px; }
  .como div { background: #f2f5ff; border-left: 4px solid #0090fb; border-radius: 8px; padding: 6px 8px; font-size: 8.6pt; } .como b { display: block; font: 800 10pt 'Barlow Condensed'; color: #0a0464; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; } th { background: #0a0464; color: #fff; text-align: left; padding: 6px; font: 700 9.5pt 'Barlow Condensed'; text-transform: uppercase; letter-spacing: .03em; }
  td { border-bottom: 1px solid #c9d2ee; height: 8.2mm; padding: 2px 6px; } td:first-child { font: 800 11pt 'Barlow Condensed'; color: #0043c5; width: 12mm; }
  tr.ej td { color: #8a93b8; font-style: italic; height: 7mm; } tr.ej td:first-child { color: #8a93b8; }
  .tipos { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 6px 0; font-size: 8.8pt; } .tipos span::before { content: '○'; color: #0043c5; font-weight: 800; margin-right: 4px; }
  .pie { font-size: 8pt; color: #5b6390; margin-top: 4px; }
</style></head><body>
${PAGINAS.map(([t, sub, caja, pre, celda], i) => `<section class="hoja">${cab(t, sub, i + 1)}<div class="mapa">${plano(caja, pre, celda)}</div>
${i === 0 ? `<div class="como"><div><b>1 · Marca el punto</b>Dibuja un círculo donde va cada punto (puerta, pasillo, puesto) y escríbele un código: P1, P2, P3…</div><div><b>2 · Usa la hoja grande</b>Para el Jaragua y el Sheraton usa las páginas 2 y 3: los cuadros son más pequeños y se ve cada salón.</div><div><b>3 · Anótalo en la tabla</b>En la última página pon el código, el nombre, el cuadro (por ejemplo J-C4), el tipo y quién lo cubre.</div><div><b>4 · Mándalo</b>Con eso cada punto se coloca en el mapa de la página y le sale a cada persona en su teléfono.</div></div>` : `<p class="pie">Los cuadros se nombran con la letra de esta página: ${pre}-A, ${pre}-B… y el número de la fila. Ejemplo: «${pre}-C4».</p>`}</section>`).join('\n')}
<section class="hoja">${cab('Mis puntos', 'Un renglón por punto. El cuadro sale de la cuadrícula de las páginas 1 a 3.', 4)}
  <div class="tipos"><b style="margin-right:4px">Tipo:</b><span>Puerta o acceso</span><span>Pasillo</span><span>Interior (lobby, salón)</span><span>Movilización (camino entre sedes)</span><span>Perímetro / parqueo</span><span>Nocturno</span></div>
  <table><thead><tr><th>Código</th><th style="width:28%">Nombre del punto</th><th style="width:11%">Cuadro</th><th style="width:15%">Tipo</th><th style="width:16%">Horario</th><th>Quién lo cubre</th></tr></thead>
  <tbody><tr class="ej"><td>P0</td><td>Ejemplo: Puerta del lobby del Jaragua</td><td>J-F5</td><td>Puerta</td><td>7:00 – 13:00</td><td>Luis Gómez y Kelvin Rosario</td></tr>${filas}</tbody></table>
  <p class="pie">Plano hecho con la maqueta de las sedes y las calles de OpenStreetMap (ODbL); los salones del Jaragua van donde quedan en la maqueta y se confirman en la visita. Hecho por Albert Silvestre.</p></section>
</body></html>`;
fs.writeFileSync(path.join(RAIZ, 'docs', 'mapa-para-asignar.html'), html);
console.log('docs/mapa-para-asignar.html listo. PDF:');
console.log('"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu --no-pdf-header-footer --user-data-dir=<carpeta temporal> --print-to-pdf=docs/MINUME-XVII-Mapa-para-asignar-puntos.pdf docs/mapa-para-asignar.html');
