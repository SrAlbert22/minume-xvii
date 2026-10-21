// ---------- Autobuses de participantes: abordaje, salida y llegada a cada hotel ----------
// Cada día se lleva la cuenta en la clave compartida "buses": { dia, v: { idDelAutobus: { ab, salio, p: { hotel: { t, n } }, sede } } }.
// Traslado, Seguridad y Coordinación marcan; todos ven al instante si los participantes llegaron a su hotel.
// Para corregir una marca se pone t: 0 (la base junta los cambios de varios teléfonos y no borra claves).
const CLAVE_BUS = 'buses';
const vivoBuses = () => { const v = leerComp(CLAVE_BUS, null); return v && v.dia === hoyDR() && v.v ? v : { dia: hoyDR(), v: {} }; };
const hotelDe = c => { const t = String(c).trim().toLowerCase(); if (!t) return null; return HOTELES.find(h => h.id.toLowerCase() === t) || HOTELES.find(h => h.n.toLowerCase().includes(t)) || null; };
const paradasDe = b => String(b.paradas || '').split(',').map(x => x.trim()).filter(Boolean).map(x => hotelDe(x) || { id: x.toUpperCase(), n: x, zona: '', sinDatos: true });
const diaDeEvento = () => DIAS_PROG.some(([d]) => d === hoyDR());   // fuera de esos días nada sale «retrasado»
const puedeBus = () => !!estado.usuario && ['traslado', 'seguridad', 'coordinacion'].includes(estado.usuario.rol);
const hhmm = ms => ms ? horaDR(ms) : '';
const sumaParadas = (s, ps) => ps.reduce((a, p) => a + (s.p && s.p[p.id] && s.p[p.id].t ? +s.p[p.id].n || 0 : 0), 0);
function estadoBus(b, vv) {
  const s = vv.v[b.id] || {}, ps = paradasDe(b), m = partesDR(ahoraEvento()).min, sale = aMinutos(b.h);
  const marcadas = ps.filter(p => s.p && s.p[p.id] && s.p[p.id].t).length;
  const fin = b.tipo === 'Ida' ? !!(s.sede && s.sede.t) : ps.length > 0 && marcadas === ps.length;
  if (fin) return ['llego', b.tipo === 'Ida' ? 'Llegó a la sede' : 'Todos en su hotel', 'verde'];
  if (s.salio || marcadas) return ['camino', 'En camino', 'azul'];
  if (!diaDeEvento()) return ['prog', 'Programado', ''];
  if (m > sale + 10) return ['tarde', `Retrasado ${m - sale} min`, 'rojo'];
  if (m >= sale - 30) return ['abordando', b.tipo === 'Ida' ? 'Por recoger' : 'Abordando', 'amarillo'];
  return ['prog', 'Programado', ''];
}
function guardarBus(id, cambio, nota) {
  if (!puedeBus()) return toast('Esto lo marca Traslado, Seguridad o Coordinación');
  const vv = vivoBuses(), s = vv.v[id] || (vv.v[id] = {});
  cambio(s); s.por = yoNombre(); s.t = ahoraMs();
  guardarComp(CLAVE_BUS, vv);
  if (nota) registrar('🚌 Autobús', nota, { area: 'Traslado' });
  pintarBuses();
}

function pintarBuses() {
  if (!$('#busLista')) return;
  const vv = vivoBuses(), ok = puedeBus();
  const est = Object.fromEntries(BUSES.map(b => [b.id, estadoBus(b, vv)]));
  const regreso = BUSES.filter(b => b.tipo === 'Regreso');
  const enHotel = regreso.reduce((a, b) => a + sumaParadas(vv.v[b.id] || {}, paradasDe(b)), 0);
  const enBus = regreso.reduce((a, b) => a + (+b.pax || 0), 0);
  const cifra = (n, t, c = '') => `<div class="bus-cifra ${c}"><b>${n}</b><small>${t}</small></div>`;
  $('#busCifras').innerHTML = cifra(BUSES.length, 'autobuses hoy') + cifra(BUSES.filter(b => est[b.id][0] === 'camino').length, 'en camino', 'azul')
    + cifra(BUSES.filter(b => est[b.id][0] === 'tarde').length, 'retrasados', BUSES.some(b => est[b.id][0] === 'tarde') ? 'rojo' : '')
    + cifra(`${enHotel}<span>/${enBus}</span>`, 'ya en su hotel (regreso)', enBus && enHotel >= enBus ? 'verde' : '');
  $('#busHoy').textContent = diaDeEvento() ? new Date(ahoraMs()).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santo_Domingo' }) : 'Horario de cada día del evento';

  $('#busLista').innerHTML = BUSES.length ? BUSES.map(b => {
    const s = vv.v[b.id] || {}, ps = paradasDe(b), [cod, txt, color] = est[b.id], ida = b.tipo === 'Ida', sede = SEDES[b.sede] ? SEDES[b.sede].corto : b.sede;
    const ab = +s.ab || 0, bajaron = sumaParadas(s, ps), m = aMinutos(b.h);
    // la ruta en orden: Ida = hoteles → sede; Regreso = sede → hoteles
    const punto = (t, hecho, extra = '') => `<span class="bus-punto${hecho ? ' hecho' : ''}"><i></i>${esc(t)}${extra}</span>`;
    const ruta = ida ? ps.map(p => punto(p.n, s.p && s.p[p.id] && s.p[p.id].t)).join('') + punto(sede, s.sede && s.sede.t)
      : punto(sede, !!s.salio) + ps.map(p => punto(p.n, s.p && s.p[p.id] && s.p[p.id].t)).join('');
    const filaParada = (p, k) => {
      const x = (s.p && s.p[p.id]) || {}, hecho = !!x.t, ultima = k === ps.length - 1;
      const sugerido = ida ? '' : ultima ? Math.max(0, ab - sumaParadas(s, ps.filter((q, j) => j !== k))) || '' : '';
      return `<div class="bus-parada${hecho ? ' hecho' : ''}"><div><b>${esc(p.n)}</b><small>${p.sinDatos ? 'Hotel sin registrar: agrégalo en «Editar hoteles»' : esc(p.zona || '')}</small></div>
        ${hecho ? `<span class="chip verde">✓ ${hhmm(x.t)} · ${ida ? 'subieron' : 'bajaron'} ${+x.n || 0}</span>${ok ? `<button class="mini" type="button" data-acc="corregir" data-b="${b.id}" data-h="${esc(p.id)}">Corregir</button>` : ''}`
          : ok ? `<label class="bus-num">${ida ? 'Subieron' : 'Bajaron'}<input type="number" min="0" inputmode="numeric" value="${sugerido}" data-cant="${b.id}|${esc(p.id)}"></label><button class="boton" type="button" data-acc="parada" data-b="${b.id}" data-h="${esc(p.id)}">${ida ? 'Recogidos ✓' : 'Llegó ✓'}</button>` : '<span class="chip">Pendiente</span>'}</div>`;
    };
    let alerta = '';
    if (!ida && cod === 'llego' && ab && bajaron !== ab) alerta = `<div class="bus-alerta">Abordaron ${ab} y bajaron ${bajaron}: ${bajaron < ab ? `confirma dónde están ${ab - bajaron}` : 'revisa el conteo'}.</div>`;
    if (ida && s.sede && s.sede.t && b.pax && sumaParadas(s, ps) < b.pax) alerta = `<div class="bus-alerta amar">Llegaron ${sumaParadas(s, ps)} de ${b.pax} participantes esperados en este autobús.</div>`;
    return `<article class="bus ${cod}">
      <div class="bus-arriba"><div class="hora">${b.h}<small>${m < 720 ? 'a. m.' : 'p. m.'}</small></div>
        <div class="bus-tit"><b>${esc(b.unidad)}</b><span class="chip">${ida ? 'Ida · hotel → sede' : 'Regreso · sede → hotel'}</span><span class="chip ${color}">${txt}</span></div></div>
      <div class="bus-ruta">${ruta}</div>
      <div class="bus-datos">${b.resp ? `<span>👤 A bordo: <b>${esc(b.resp)}</b></span>` : ''}<span>🧑‍🤝‍🧑 ${b.pax || '—'} participantes</span>${s.por ? `<span>Última marca: ${esc(s.por)} · ${haceMin(s.t)}</span>` : ''}</div>
      ${!ida ? `<div class="bus-abordo"><span>Abordaron</span>${ok && !s.salio ? `<button type="button" data-acc="menos" data-b="${b.id}">−</button>` : ''}<b>${ab}</b>${ok && !s.salio ? `<button type="button" data-acc="mas" data-b="${b.id}">+</button>` : ''}<small>de ${b.pax || '—'}</small>
        ${s.salio ? `<span class="chip azul">Salió ${hhmm(s.salio)}</span>${ok ? `<button class="mini" type="button" data-acc="nosalio" data-b="${b.id}">Corregir</button>` : ''}` : ok ? `<button class="boton" type="button" data-acc="salio" data-b="${b.id}">Salió el autobús</button>` : ''}</div>` : ''}
      <div class="bus-paradas">${ps.map(filaParada).join('') || '<p class="cob-sub">Este autobús no tiene paradas. Agrégalas en «Editar autobuses».</p>'}
        ${ida ? `<div class="bus-parada${s.sede && s.sede.t ? ' hecho' : ''}"><div><b>${esc(SEDES[b.sede] ? SEDES[b.sede].nombre : b.sede)}</b><small>Llegada a la sede</small></div>${s.sede && s.sede.t ? `<span class="chip verde">✓ ${hhmm(s.sede.t)}</span>${ok ? `<button class="mini" type="button" data-acc="nosede" data-b="${b.id}">Corregir</button>` : ''}` : ok ? `<button class="boton" type="button" data-acc="sede" data-b="${b.id}">Llegó a la sede ✓</button>` : '<span class="chip">Pendiente</span>'}</div>` : ''}</div>
      ${alerta}
    </article>`;
  }).join('') : '<p class="cob-sub">Todavía no hay autobuses. Agrégalos en «Editar autobuses».</p>';

  // ¿Llegaron a su hotel? Un renglón por hotel con lo que dicen los autobuses de regreso
  $('#hotLista').innerHTML = HOTELES.map(h => {
    const suyos = regreso.filter(b => paradasDe(b).some(p => p.id === h.id));
    const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.n + ' Santo Domingo')}`;
    let chip;
    if (h.apie) chip = '<span class="chip">🚶 Llegan a pie desde la sede</span>';
    else if (!suyos.length) chip = '<span class="chip rojo">Sin autobús de regreso</span>';
    else {
      const marcas = suyos.map(b => ((vv.v[b.id] || {}).p || {})[h.id]).filter(x => x && x.t);
      const llegaron = marcas.reduce((a, x) => a + (+x.n || 0), 0);
      if (marcas.length === suyos.length) chip = `<span class="chip verde">✓ Llegaron ${llegaron}${h.pax ? ` de ${h.pax}` : ''} · ${hhmm(Math.max(...marcas.map(x => x.t)))}</span>${h.pax && llegaron < h.pax ? `<span class="chip amarillo">Faltan ${h.pax - llegaron}</span>` : ''}`;
      else { const b = suyos.find(x => !(((vv.v[x.id] || {}).p || {})[h.id] || {}).t); const e = est[b.id]; chip = e[0] === 'camino' ? `<span class="chip azul">En camino · ${esc(b.unidad)}</span>` : e[0] === 'tarde' ? `<span class="chip rojo">${esc(b.unidad)} · ${e[1]}</span>` : `<span class="chip amarillo">Esperando · ${esc(b.unidad)} sale ${b.h}</span>`; }
    }
    return `<div class="hot"><div><b>${esc(h.n)}</b><small>${esc(h.zona || '')}${h.pax ? ` · ${h.pax} participantes` : ''}</small></div><div class="hot-estado">${chip}<a class="mini" href="${mapa}" target="_blank" rel="noopener">Ver en Maps</a></div></div>`;
  }).join('') + `<p class="cob-sub" style="margin:10px 0 0">¿Falta un hotel? ${puedeEditar('hoteles') ? 'Toca «Editar hoteles» arriba y agrégalo.' : 'Pídele a Traslado o a Coordinación que lo agregue.'}</p>`;
}

$('#busLista').addEventListener('click', e => {
  const x = e.target.closest('[data-acc]'); if (!x) return;
  const id = x.dataset.b, b = BUSES.find(y => y.id === id); if (!b) return;
  const h = x.dataset.h, acc = x.dataset.acc, p = h ? paradasDe(b).find(q => q.id === h) : null;
  if (acc === 'mas' || acc === 'menos') return guardarBus(id, s => { s.ab = Math.max(0, (+s.ab || 0) + (acc === 'mas' ? 1 : -1)); });
  if (acc === 'salio') { const n = +(vivoBuses().v[id] || {}).ab || 0; if (!n) return toast('Primero cuenta cuántos abordaron'); return guardarBus(id, s => { s.salio = ahoraMs(); }, `${b.unidad} salió de ${SEDES[b.sede] ? SEDES[b.sede].corto : b.sede} con ${n} participantes`); }
  if (acc === 'nosalio') return guardarBus(id, s => { s.salio = 0; });
  if (acc === 'sede') return guardarBus(id, s => { s.sede = { t: ahoraMs() }; }, `${b.unidad} llegó a ${SEDES[b.sede] ? SEDES[b.sede].corto : b.sede}`);
  if (acc === 'nosede') return guardarBus(id, s => { s.sede = { t: 0 }; });
  if (acc === 'corregir') return guardarBus(id, s => { s.p = s.p || {}; s.p[h] = { t: 0, n: 0 }; });
  if (acc === 'parada') {
    const inp = $$('#busLista [data-cant]').find(i => i.dataset.cant === `${id}|${h}`), n = inp && inp.value !== '' ? Math.max(0, Math.round(+inp.value)) : NaN;
    if (Number.isNaN(n)) { toast(b.tipo === 'Ida' ? 'Escribe cuántos subieron' : 'Escribe cuántos bajaron'); if (inp) inp.focus(); return; }
    guardarBus(id, s => { s.p = s.p || {}; s.p[h] = { t: ahoraMs(), n }; if (b.tipo === 'Ida' && !s.salio) s.salio = ahoraMs(); },
      b.tipo === 'Ida' ? `${b.unidad} recogió ${n} en ${p ? p.n : h}` : `${b.unidad} llegó a ${p ? p.n : h}: bajaron ${n}`);
  }
});
addEventListener('storage', e => { if (e.key === CLAVE_COMP(CLAVE_BUS) && !escribiendo($('#traslado'))) pintarBuses(); });
setInterval(() => { if (!document.hidden && !escribiendo($('#traslado'))) pintarBuses(); }, 60000);
window.BUSES_LISTO = true;
pintarBuses();
