// ---------- Plano de asientos (Eventos y Protocolo) ----------
// Cada lugar con su capacidad real (cuadro de capacidades de cada hotel). Se toca un asiento para
// asignarle una persona, marcarlo libre, reservado o no disponible. Cada evento tiene su propio plano.
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ORDEN_PRESIDIUM = [4, 3, 5, 2, 6, 1, 7];   // el centro primero y luego alternando, como en protocolo

function planoTeatro(nombre, filas, bloques, presidium, capacidad) {
  // bloques: asientos por bloque de izquierda a derecha, con pasillo entre bloques
  const asientos = [], ancho = bloques.reduce((a, b) => a + b, 0) + (bloques.length - 1) * 2, cx = ancho / 2;
  for (let p = 1; p <= presidium; p++) asientos.push({ id: `P${p}`, x: cx - (presidium + 1) / 2 + p, y: 2.75, zona: 'Presídium', fila: 'P', num: p });
  for (let f = 0; f < filas; f++) {
    let x = 0.5, num = 1;
    bloques.forEach((n, b) => {
      for (let i = 0; i < n; i++, num++) {
        const xx = x + i, curva = 0.0035 * (xx - cx) ** 2;
        asientos.push({ id: `${LETRAS[f]}${num}`, x: xx, y: 6.5 + 0.0035 * cx ** 2 + f * 1.15 - curva, zona: (bloques.length === 2 ? ['Bloque izquierdo', 'Bloque derecho'] : ['Lateral izquierdo', 'Centro', 'Lateral derecho'])[b] || 'Platea', fila: LETRAS[f], num });
      }
      x += n + 2;
    });
  }
  const alto = 6.5 + filas * 1.15 + 0.0035 * cx ** 2 + 2;
  return { nombre, capacidad, ancho: ancho + 1, alto, asientos, escenario: { x: cx - presidium / 2 - 2, y: 0.4, w: presidium + 4, h: 3.4, t: 'TARIMA · PRESÍDIUM' }, tipo: 'teatro' };
}
function planoBanquete(nombre, mesasX, mesasY, sillas, capacidad) {
  const asientos = [], mesas = [], paso = 4.2, ancho = mesasX * paso + 2;
  const principal = sillas;            // mesa principal frente a la tarima
  for (let s = 1; s <= principal; s++) asientos.push({ id: `MP-${s}`, x: ancho / 2 - (principal + 1) / 2 + s, y: 4.6, zona: 'Mesa principal', fila: 'MP', num: s });
  mesas.push({ x: ancho / 2 - principal / 2 - 0.2, y: 3.6, w: principal + 0.4, h: 0.6, t: 'Mesa principal', rect: true });
  let m = 1;
  for (let j = 0; j < mesasY; j++) for (let i = 0; i < mesasX; i++, m++) {
    const cx = 1 + paso / 2 + i * paso, cy = 8.5 + j * paso;
    mesas.push({ x: cx, y: cy, r: 1.05, t: String(m) });
    for (let s = 0; s < sillas; s++) {
      const a = s / sillas * Math.PI * 2 - Math.PI / 2;
      asientos.push({ id: `M${m}-${s + 1}`, x: cx + Math.cos(a) * 1.7, y: cy + Math.sin(a) * 1.7, zona: `Mesa ${m}`, fila: `M${m}`, num: s + 1 });
    }
  }
  return { nombre, capacidad, ancho, alto: 8.5 + mesasY * paso, asientos, mesas, escenario: { x: ancho / 2 - 7, y: 0.4, w: 14, h: 2.4, t: 'TARIMA' }, tipo: 'banquete' };
}
const PLANOS = {
  // Teatro La Fiesta: 1,152 en teatro · 24 filas (A a X) de 12 + 24 + 12, y presídium de 7
  teatro: planoTeatro('Teatro La Fiesta · Renaissance Jaragua', 24, [12, 24, 12], 7, 1152),
  // Malecón Terrace: banquete de 500 · 49 mesas redondas de 10 y la mesa principal de 10
  banquete: planoBanquete('Malecón Terrace · Sheraton', 7, 7, 10, 500),
  // Anacaona (salón completo, 40 x 18 m): 800 en teatro · 20 filas (A a T) de 20 + 20, y presídium de 5
  anacaona: planoTeatro('Anacaona · Renaissance Jaragua', 20, [20, 20], 5, 800),
};
const planoDe = e => /Teatro La Fiesta/i.test(e.lugar) ? PLANOS.teatro : /Malec[oó]n Terrace/i.test(e.lugar) ? PLANOS.banquete : /Anacaona/i.test(e.lugar) ? PLANOS.anacaona : null;
const EST_AS = { libre: ['Libre', '#2fd38c'], ocupado: ['Asignado', '#45c8ff'], sentado: ['Ya se sentó', '#2f7bff'], reservado: ['Reservado', '#ffd23f'], bloqueado: ['No disponible', '#5b6685'] };

// Lo que ya viene del protocolo: invitados con su lugar y algunas reservas de ejemplo
function semillaAsientos(e) {
  const s = {}, plano = planoDe(e); if (!plano) return s;
  for (const g of INV_LISTA.filter(x => x.ev === e.id)) {
    let id = null; const m = /Presídium · (centro|\d+)/i.exec(g.lugar), f = /fila · ([A-Z]\d+)/i.exec(g.lugar);
    if (m) id = `P${m[1] === 'centro' ? ORDEN_PRESIDIUM[0] : ORDEN_PRESIDIUM[+m[1] - 1] || m[1]}`;
    else if (f) id = f[1].toUpperCase();
    if (id && plano.asientos.some(a => a.id === id)) s[id] = { est: 'ocupado', n: g.n, nota: g.cargo };
  }
  if (plano.tipo === 'teatro') {
    for (const a of plano.asientos) if ((a.fila === 'A' || a.fila === 'B') && a.zona === 'Centro' && !s[a.id]) s[a.id] = { est: 'reservado', nota: 'Invitados especiales' };
    const ult = LETRAS[plano.asientos.filter(a => a.fila !== 'P').reduce((m, a) => Math.max(m, LETRAS.indexOf(a.fila)), 0)];
    for (const a of plano.asientos) if (a.fila === ult && a.zona === 'Centro' && a.num >= 23 && a.num <= 26) s[a.id] = { est: 'bloqueado', nota: 'Cabina de sonido' };
  } else {
    for (const a of plano.asientos) if (a.fila === 'MP' && !s[a.id]) s[a.id] = { est: 'reservado', nota: 'Secretaría General' };
    for (const a of plano.asientos) if (['M1', 'M2'].includes(a.fila)) s[a.id] = { est: 'reservado', nota: 'Mesa del staff' };
  }
  return s;
}
const leerAs = () => leerComp('asientos', {});
const clave = (ev, id) => `${ev}|${id}`;
function estadoAs(e, id, todo = leerAs(), semilla = semillaAsientos(e)) {
  const g = todo[clave(e.id, id)];
  return g ? g : semilla[id] || { est: 'libre' };
}
function guardarAs(cambios) { guardarComp('asientos', { ...leerAs(), ...cambios }); }
const asientoDe = (evId, nombre) => {
  const e = EV_LISTA.find(x => x.id === evId); if (!e || !planoDe(e)) return null;
  const todo = leerAs(), sem = semillaAsientos(e), n = nombre.toLowerCase();
  const a = planoDe(e).asientos.find(x => { const s = estadoAs(e, x.id, todo, sem); return ['ocupado', 'sentado'].includes(s.est) && (s.n || '').toLowerCase() === n; });
  return a ? a.id : null;
};

let asEvento = null, asModo = 'ver', asZoom = 1, asSel = null, asPintando = false, asLote = {};
const evConPlano = () => EV_LISTA.filter(planoDe);
function pintarAsientos() {
  const sec = $('#asientos'); if (!sec || !estado.usuario) return;
  if (escribiendo($('#asFicha'))) return;
  const evs = evConPlano(); if (!evs.length) return;
  if (!evs.some(e => e.id === asEvento)) { const { dia, min } = partesDR(ahoraEvento()); asEvento = (evs.find(e => e.dia > dia || (e.dia === dia && aMinutos(e.f) > min)) || evs[0]).id; }
  const e = EV_LISTA.find(x => x.id === asEvento), plano = planoDe(e), todo = leerAs(), sem = semillaAsientos(e);
  $('#asEventos').innerHTML = evs.map(x => `<button data-e="${x.id}" class="${x.id === asEvento ? 'on' : ''}">${esc(x.n)} · ${DIAS_PROG.find(([d]) => d === x.dia)[1]}</button>`).join('');
  const est = Object.fromEntries(plano.asientos.map(a => [a.id, estadoAs(e, a.id, todo, sem)]));
  const cuenta = k => plano.asientos.filter(a => est[a.id].est === k).length, total = plano.asientos.length;
  const ocupados = cuenta('ocupado') + cuenta('sentado');
  $('#asResumen').innerHTML = `<div class="as-titulo"><b>${esc(plano.nombre)}</b><small>${esc(e.n)} · ${e.i} a ${e.f} · capacidad ${plano.capacidad.toLocaleString('es-DO')}</small></div>
    <div class="as-cifras">${[['libre', cuenta('libre')], ['ocupado', cuenta('ocupado')], ['sentado', cuenta('sentado')], ['reservado', cuenta('reservado')], ['bloqueado', cuenta('bloqueado')]].map(([k, n]) => `<span style="--c:${EST_AS[k][1]}"><i></i><b>${n.toLocaleString('es-DO')}</b>${EST_AS[k][0]}</span>`).join('')}</div>
    <div class="cv-barra"><i style="width:${(ocupados + cuenta('reservado')) / total * 100}%;background:var(--azul)"></i></div>`;
  const q = ($('#asBuscar').value || '').toLowerCase().trim();
  const coincide = a => q && ((est[a.id].n || '').toLowerCase().includes(q) || a.id.toLowerCase() === q);
  const R = plano.tipo === 'banquete' ? 0.42 : 0.4;
  const svg = [`<svg viewBox="-1 -0.5 ${plano.ancho + 2} ${plano.alto + 1}" style="width:${Math.round(asZoom * 100)}%" role="img" aria-label="Plano de asientos de ${esc(plano.nombre)}">`];
  const t = plano.escenario; svg.push(`<rect class="as-tarima" x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="0.4"/><text class="as-tarima-t" x="${t.x + t.w / 2}" y="${t.y + (plano.tipo === 'teatro' ? 1.15 : t.h / 2 + 0.25)}">${t.t}</text>`);
  for (const m of plano.mesas || []) svg.push(m.rect ? `<rect class="as-mesa" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="0.2"/>` : `<circle class="as-mesa" cx="${m.x}" cy="${m.y}" r="${m.r}"/><text class="as-mesa-t" x="${m.x}" y="${m.y + 0.3}">${m.t}</text>`);
  if (plano.tipo === 'teatro') { const filas = [...new Set(plano.asientos.filter(a => a.fila !== 'P').map(a => a.fila))]; for (const f of filas) { const a = plano.asientos.find(x => x.fila === f); svg.push(`<text class="as-fila" x="-0.6" y="${a.y + 0.25}">${f}</text>`); } }
  for (const a of plano.asientos) {
    const s = est[a.id], c = EST_AS[s.est][1];
    svg.push(`<circle data-as="${a.id}" class="as-a ${s.est}${asSel === a.id ? ' sel' : ''}${coincide(a) ? ' hallado' : ''}" cx="${a.x.toFixed(2)}" cy="${a.y.toFixed(2)}" r="${R}" fill="${c}"><title>${a.id}${s.n ? ' · ' + esc(s.n) : ''}${s.nota ? ' · ' + esc(s.nota) : ''} (${EST_AS[s.est][0]})</title></circle>`);
  }
  svg.push('</svg>');
  $('#asPlano').innerHTML = svg.join('');
  $$('#asModos button').forEach(b => b.classList.toggle('on', b.dataset.m === asModo));
  $('#asPlano').classList.toggle('pintar', asModo !== 'ver');
  const hallados = q ? plano.asientos.filter(coincide) : [];
  $('#asHallados').innerHTML = q ? (hallados.length ? hallados.slice(0, 12).map(a => `<button class="mini" data-ir="${a.id}">${a.id} · ${esc(est[a.id].n || EST_AS[est[a.id].est][0])}</button>`).join('') : '<span class="cob-sub">Nadie con ese nombre en este evento.</span>') : '';
  pintarFichaAs(e, plano, est);
}
function pintarFichaAs(e, plano, est) {
  const caja = $('#asFicha');
  if (!asSel || !plano.asientos.some(a => a.id === asSel)) { caja.innerHTML = `<b class="cond" style="font-size:22px">Toca un asiento</b><p class="cob-sub">Para asignarle una persona, marcar que ya se sentó o cambiar su estado. Para marcar muchos seguidos, elige arriba «Pintar» y pasa el dedo por encima.</p>`; return; }
  const a = plano.asientos.find(x => x.id === asSel), s = est[a.id], nombres = [...new Set(INV_LISTA.filter(g => g.ev === e.id).map(g => g.n))];
  caja.innerHTML = `<div class="as-f-cab"><span class="as-cod">${a.id}</span><div><b>${esc(a.zona)}${a.fila !== 'P' && a.fila !== 'MP' && !a.fila.startsWith('M') ? ` · fila ${a.fila}, asiento ${a.num}` : ''}</b><small style="color:${EST_AS[s.est][1]}">● ${EST_AS[s.est][0]}${s.por ? ` · ${esc(s.por)} ${s.t ? horaDR(s.t) : ''}` : ''}</small></div></div>
    <label for="asNombre">Persona</label><input id="asNombre" list="asNombres" value="${esc(s.n || '')}" placeholder="Nombre de quien se sienta aquí" autocomplete="off"><datalist id="asNombres">${nombres.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <label for="asNota">Nota (opcional)</label><input id="asNota" value="${esc(s.nota || '')}" placeholder="Ej.: delegación de Japón, silla de ruedas">
    <div class="as-f-acc"><button class="boton" data-asf="ocupado" type="button">Asignar</button>${['ocupado', 'sentado'].includes(s.est) ? `<button class="boton sec" data-asf="${s.est === 'sentado' ? 'ocupado' : 'sentado'}" type="button">${s.est === 'sentado' ? 'Todavía no llega' : 'Ya se sentó'}</button>` : ''}</div>
    <div class="as-f-acc"><button class="mini" data-asf="libre" type="button">Dejar libre</button><button class="mini" data-asf="reservado" type="button">Reservar</button><button class="mini" data-asf="bloqueado" type="button">No disponible</button></div>`;
}
function cambiarAs(id, est, datos = {}) {
  const e = EV_LISTA.find(x => x.id === asEvento), previo = estadoAs(e, id);
  return { [clave(asEvento, id)]: { est, n: est === 'libre' ? '' : datos.n !== undefined ? datos.n : est === 'bloqueado' ? '' : previo.n || '', nota: datos.nota !== undefined ? datos.nota : previo.nota || '', t: ahoraMs(), por: yoNombre() } };
}
$('#asEventos').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; asEvento = b.dataset.e; asSel = null; pintarAsientos(); };
$('#asModos').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; asModo = b.dataset.m; pintarAsientos(); };
$('#asZoom').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; asZoom = Math.min(4, Math.max(1, asZoom * (b.dataset.z === '+' ? 1.4 : 1 / 1.4))); pintarAsientos(); };
$('#asBuscar').oninput = pintarAsientos;
$('#asHallados').onclick = e => { const b = e.target.closest('[data-ir]'); if (!b) return; asSel = b.dataset.ir; asModo = 'ver'; pintarAsientos(); const c = $(`#asPlano [data-as="${asSel}"]`); if (c) c.scrollIntoView({ block: 'center', inline: 'center' }); };
// Tocar o «pintar» pasando el dedo
const asientoBajo = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); return el && el.dataset && el.dataset.as; };
$('#asPlano').addEventListener('pointerdown', ev => {
  const id = asientoBajo(ev); if (!id) return;
  if (asModo === 'ver') { asSel = id; pintarAsientos(); return; }
  ev.preventDefault(); asPintando = true; asLote = cambiarAs(id, asModo);
  const c = ev.target.closest('[data-as]'); if (c) c.setAttribute('fill', EST_AS[asModo][1]);
});
$('#asPlano').addEventListener('pointermove', ev => {
  if (!asPintando) return; const id = asientoBajo(ev); if (!id || asLote[clave(asEvento, id)]) return;
  Object.assign(asLote, cambiarAs(id, asModo)); const c = $(`#asPlano [data-as="${id}"]`); if (c) c.setAttribute('fill', EST_AS[asModo][1]);
});
addEventListener('pointerup', () => {
  if (!asPintando) return; asPintando = false;
  const n = Object.keys(asLote).length; if (n) { guardarAs(asLote); toast(`${n} ${n === 1 ? 'asiento marcado' : 'asientos marcados'} como «${EST_AS[asModo][0]}»`); }
  asLote = {}; pintarAsientos();
});
$('#asFicha').onclick = ev => {
  const b = ev.target.closest('[data-asf]'); if (!b || !asSel) return;
  const est = b.dataset.asf, n = $('#asNombre').value.trim(), nota = $('#asNota').value.trim();
  if (est === 'ocupado' && !n) return $('#asNombre').focus();
  guardarAs(cambiarAs(asSel, est, { n: ['ocupado', 'sentado'].includes(est) ? n : undefined, nota }));
  if (['ocupado', 'sentado'].includes(est)) registrar('🪑 Asiento', `${asSel} · ${n} (${EST_AS[est][0]})`);
  toast(est === 'ocupado' ? `${asSel} asignado a ${n}` : `${asSel}: ${EST_AS[est][0]}`);
  pintarAsientos();
};
