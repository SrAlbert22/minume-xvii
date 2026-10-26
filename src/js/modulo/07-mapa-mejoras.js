// MINUME XVII · Mapa: buscador, acercar y alejar, pantalla completa y teclado · Albert Silvestre
// ---------- Mapa: buscador, acercar y alejar, pantalla completa y teclado ----------
// El buscador encuentra salones, comisiones (por siglas o nombre) y puntos del mapa, y vuela hasta ellos.
// Los botones de la derecha acercan, alejan, centran y ponen el mapa en pantalla completa (muy útil en el teléfono).
const sinTildeMapa = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---- Buscador ----
function resultadosMapa(q) {
  q = sinTildeMapa(q.trim()); if (q.length < 2) return [];
  const r = [];
  for (const [c, nom] of COMISIONES) {
    const a = ASIGNA[c]; if (!a) continue;
    if (sinTildeMapa(`${c} ${nom}`).includes(q)) r.push({ tipo: 'Comisión', t: `${c} · ${a[1]}`, sub: `${nom} · ${SEDES[a[0]].nombre}`, ir: () => { const l = lugarDeSalon(a[1], a[0]); $('#rDestino').value = l.id; mostrarSalon(a[1], a[0]); } });
  }
  for (const l of MAPA.lugares) {
    if (l.tipo === 'referencia' || !sinTildeMapa(l.n).includes(q)) continue;
    const coms = Object.entries(ASIGNA).filter(([, a]) => lugarDeSalon(a[1], a[0]).id === l.id).map(([c]) => c);
    r.push({ tipo: 'Lugar', t: l.n, sub: `${SEDES[l.sede] ? SEDES[l.sede].nombre : ''}${coms.length ? ' · ' + coms.join(', ') : ''}`, ir: () => { $('#rDestino').value = l.id; mostrarLugar(l.id); } });
  }
  for (const p of estado.puntos || []) {
    if (!p.ll || !(sinTildeMapa(p.n).includes(q) || sinTildeMapa((CATS[p.cat] || [''])[0]).includes(q))) continue;
    r.push({ tipo: (CATS[p.cat] || ['Punto'])[0], t: p.n, sub: 'Punto del mapa', ir: () => mostrarLugar(p.ll, p.n) });
  }
  // lo que empieza igual que lo escrito, primero
  const empieza = x => sinTildeMapa(x.t).startsWith(q) ? 0 : 1;
  return r.sort((a, b) => empieza(a) - empieza(b)).slice(0, 8);
}
let mbLista = [], mbSel = -1;
function pintarResultadosMapa() {
  const q = $('#mbTexto').value; mbLista = resultadosMapa(q); mbSel = mbLista.length ? 0 : -1;
  const caja = $('#mbRes');
  caja.hidden = q.trim().length < 2;
  caja.innerHTML = mbLista.length ? mbLista.map((x, i) => `<button type="button" role="option" class="mb-op${i === mbSel ? ' on' : ''}" data-i="${i}" aria-selected="${i === mbSel}"><span class="mb-tipo">${esc(x.tipo)}</span><b>${esc(x.t)}</b><small>${esc(x.sub)}</small></button>`).join('')
    : '<p class="mb-nada">No encontré nada con ese nombre. Prueba con las siglas de la comisión o el nombre del salón.</p>';
}
function elegirResultadoMapa(i) {
  const x = mbLista[i]; if (!x) return;
  x.ir(); $('#mbRes').hidden = true; $('#mbTexto').value = x.t; $('#mbTexto').blur();
  if (matchMedia('(max-width: 900px)').matches && !$('#caja').classList.contains('completo')) $('#caja').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#mbTexto').addEventListener('input', pintarResultadosMapa);
$('#mbTexto').addEventListener('focus', () => { if ($('#mbTexto').value.trim().length >= 2) pintarResultadosMapa(); });
$('#mbTexto').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!mbLista.length) return; e.preventDefault();
    mbSel = (mbSel + (e.key === 'ArrowDown' ? 1 : -1) + mbLista.length) % mbLista.length;
    $$('#mbRes .mb-op').forEach((b, i) => { b.classList.toggle('on', i === mbSel); b.setAttribute('aria-selected', i === mbSel); });
  } else if (e.key === 'Enter') { e.preventDefault(); elegirResultadoMapa(Math.max(0, mbSel)); }
  else if (e.key === 'Escape') { $('#mbRes').hidden = true; }
});
$('#mbRes').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) elegirResultadoMapa(+b.dataset.i); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('#mapaBuscar')) $('#mbRes').hidden = true; });

// ---- Acercar, alejar, centrar y pantalla completa ----
const vistaActual = () => VISTAS[estado.sede] || VISTAS.todas;
function salirPantallaCompleta() {
  const c = $('#caja'); if (!c.classList.contains('completo')) return;
  c.classList.remove('completo'); document.body.classList.remove('mapa-completo');
  $('#mapaNav [data-nav="completo"]').setAttribute('aria-label', 'Pantalla completa');
}
function pantallaCompleta() {
  const c = $('#caja');
  if (c.classList.contains('completo')) return salirPantallaCompleta();
  c.classList.add('completo'); document.body.classList.add('mapa-completo');
  $('#mapaNav [data-nav="completo"]').setAttribute('aria-label', 'Salir de pantalla completa');
  iniciarMapa().catch(() => {});
}
function navMapa(a) {
  if (a === 'completo') return pantallaCompleta();
  if (esquemaOn) { if (a === 'mas') zoomEsquema(0.7); else if (a === 'menos') zoomEsquema(1.45); else if (a === 'centro') centrarEsquema(); return; }
  if (!mapa || !mapa.listo) return;
  if (a === 'mas') mapa.zoom(0.7);
  else if (a === 'menos') mapa.zoom(1.45);
  else if (a === 'centro') mapa.volar(vistaActual(), 900);
}
$('#mapaNav').addEventListener('click', e => { const b = e.target.closest('[data-nav]'); if (b) navMapa(b.dataset.nav); });
// el botón atrás del teléfono primero cierra la pantalla completa
addEventListener('popstate', salirPantallaCompleta);
// Teclado en la PC: + y − acercan y alejan, 0 centra, F pantalla completa, Esc sale
document.addEventListener('keydown', e => {
  const completo = $('#caja').classList.contains('completo');   // en pantalla completa el mapa es fijo y seVe() no lo cuenta
  if (!(completo || seVe($('#caja'))) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
  const k = { '+': 'mas', '=': 'mas', '-': 'menos', '_': 'menos', '0': 'centro', f: 'completo', F: 'completo' }[e.key];
  if (e.key === 'Escape' && completo) { e.preventDefault(); return salirPantallaCompleta(); }
  if (k) { e.preventDefault(); navMapa(k); }
});
