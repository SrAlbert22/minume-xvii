// ---------- Rondas ----------
const RUTAS = [
  { id: 'R1', n: 'Jaragua · salones y lobby', cada: 60, puntos: ['Lobby y acreditación', 'Pasillo de salones', 'Anacaona', 'Salones pequeños (Marién a Las Olas)', 'Salida de emergencia', 'Puerta este'] },
  { id: 'R2', n: 'Jaragua · nocturna', cada: 90, horario: [21 * 60, 24 * 60], puntos: ['Lobby', 'Pisos de habitaciones', 'Casino y Teatro La Fiesta', 'Parqueo'] },
  { id: 'R3', n: 'Camino Jaragua – Sheraton', cada: 60, puntos: ['Puerta este del Jaragua', 'Borde del parqueo', 'Canchas de tenis', 'Calle interna', 'Entrada oeste del Sheraton'] },
  { id: 'R4', n: 'Sheraton y Malecón Terrace', cada: 60, puntos: ['Lobby del Sheraton', 'Salones (Samaná a Board Room)', 'Baños', 'Carpa del Malecón Terrace'] },
];
function leerRondas() {
  let l = leerComp('rondas', null); if (l) return l;
  const t = ahoraMs(), m = (min, i, ok = true, nota = '') => ({ t: t - min * 60000 + i * 90000, ok, nota });
  l = [
    { id: 'rd1', ruta: 'R1', por: 'Darlin Féliz', porCod: 'S06', ini: t - 32 * 60000, fin: t - 22 * 60000, marcas: { 0: m(32, 0), 1: m(32, 1), 2: m(32, 2, false, 'Puerta lateral de Maguana sin seguro; avisé a mantenimiento'), 3: m(32, 3), 5: m(32, 5) } },
    { id: 'rd2', ruta: 'R3', por: 'Yaneris Cruz', porCod: 'S02', ini: t - 88 * 60000, fin: t - 79 * 60000, marcas: { 0: m(88, 0), 1: m(88, 1), 2: m(88, 2), 3: m(88, 3) } },
    { id: 'rd3', ruta: 'R4', por: 'José Peña', porCod: 'S05', ini: t - 41 * 60000, fin: t - 33 * 60000, marcas: { 0: m(41, 0), 1: m(41, 1), 2: m(41, 2), 3: m(41, 3) } },
  ];
  guardarComp('rondas', l); return l;
}
function estadoRuta(r, l) {
  const { min } = partesDR(ahoraEvento());
  const de = l.filter(x => x.ruta === r.id).sort((a, b) => b.ini - a.ini), ult = de[0];
  if (ult && !ult.fin) return { k: 'curso', t: 'En curso', cl: '', ult };
  if (r.horario && (min < r.horario[0] || min >= r.horario[1])) return { k: 'fuera', t: `Empieza a las ${Math.floor(r.horario[0] / 60)}:00`, cl: '', ult };
  if (!ult) return { k: 'atrasada', t: 'Sin rondas hoy', cl: 'rojo', ult };
  const pasaron = Math.round((ahoraMs() - ult.fin) / 60000);
  return pasaron > r.cada ? { k: 'atrasada', t: `Atrasada ${pasaron - r.cada} min`, cl: 'rojo', ult } : { k: 'dia', t: `Al día · próxima en ${r.cada - pasaron} min`, cl: 'verde', ult };
}
let rnNovedad = null, rnConfirmar = false;
const miRonda = l => l.find(x => !x.fin && x.porCod === yoCod());
function pintarRondas() {
  const sec = $('#rondas'); if (!sec || !estado.usuario || !['seguridad', 'coordinacion'].includes(estado.usuario.rol)) return;
  if (escribiendo(sec)) return;
  const l = leerRondas(), hoy = l.filter(x => diaDR(x.ini) === hoyDR()), est = RUTAS.map(r => ({ r, e: estadoRuta(r, l) }));
  const novedades = hoy.reduce((s, x) => s + Object.values(x.marcas).filter(m => !m.ok).length, 0), atras = est.filter(x => x.e.k === 'atrasada').length;
  $('#rnTiles').innerHTML = tile(est.filter(x => x.e.k === 'dia' || x.e.k === 'curso').length + '/' + est.filter(x => x.e.k !== 'fuera').length, 'rutas al día', '#2fd38c', '') + tile(atras, atras === 1 ? 'ruta atrasada' : 'rutas atrasadas', '#ff4d5e', '', atras > 0) + tile(novedades, 'novedades hoy', '#ffd23f', '', novedades > 0) + tile(hoy.length, 'rondas hechas hoy', '#45c8ff', '');
  const act = miRonda(l);
  if (act) {
    const r = RUTAS.find(x => x.id === act.ruta), hechos = Object.keys(act.marcas).length, faltan = r.puntos.length - hechos;
    $('#rnActiva').innerHTML = `<div class="tarjeta rn-activa"><div class="cob-cab" style="margin-bottom:6px"><span class="chip verde">Tu ronda en curso</span><b class="cond" style="font-size:26px">${r.n}</b><small class="cob-sub" style="margin:0 0 0 auto">Empezaste ${haceMin(act.ini)} · ${hechos} de ${r.puntos.length} puntos</small></div>
      ${r.puntos.map((p, i) => { const mk = act.marcas[i]; return `<div class="rn-punto ${mk ? (mk.ok ? 'ok' : 'nov') : ''}"><span class="rn-num">${i + 1}</span><div><b>${p}</b>${mk ? `<small>${mk.ok ? 'En orden' : 'Novedad: ' + esc(mk.nota)} · ${horaDR(mk.t)}</small>` : ''}${rnNovedad === i ? `<div class="rn-nov"><input id="rnNovTxt" placeholder="Qué encontraste"><button class="mini on" data-rn="nov-ok" data-i="${i}">Guardar</button><button class="mini" data-rn="nov-no">Cancelar</button></div>` : ''}</div>
        ${mk ? `<button class="mini" data-rn="deshacer" data-i="${i}">Cambiar</button>` : `<span class="rn-acc"><button class="mini on" data-rn="ok" data-i="${i}">En orden</button><button class="mini" data-rn="nov" data-i="${i}">Novedad</button></span>`}</div>`; }).join('')}
      ${rnConfirmar && faltan ? `<div class="cob-asignar" style="margin-top:12px"><span>Te ${faltan === 1 ? 'falta 1 punto' : `faltan ${faltan} puntos`}. Si los saltas, dirección lo verá.</span><button class="mini on" data-rn="fin-si">Terminar igual</button><button class="mini" data-rn="fin-no">Seguir la ronda</button></div>` : `<button class="boton" data-rn="fin" style="margin-top:12px">Terminar ronda</button>`}</div>`;
  } else $('#rnActiva').innerHTML = '';
  const puede = estado.usuario.rol === 'seguridad';
  $('#rnRutas').innerHTML = est.map(({ r, e }) => {
    const u = e.ult, saltos = u && u.fin ? r.puntos.length - Object.keys(u.marcas).length : 0, nov = u ? Object.values(u.marcas).filter(m => !m.ok) : [];
    return `<div class="tarjeta rn-ruta ${e.k}"><div class="cob-cab" style="margin-bottom:4px"><b class="cond" style="font-size:22px">${r.n}</b><span class="chip ${e.cl}" style="margin-left:auto">${e.t}</span></div>
      <small class="cob-sub" style="margin:0">Cada ${r.cada} min · ${r.puntos.length} puntos: ${r.puntos.join(', ')}</small>
      ${u ? `<div class="dato" style="margin-top:8px"><span>Última</span><b>${esc(u.por)} · ${u.fin ? 'terminó ' + haceMin(u.fin) : 'empezó ' + haceMin(u.ini)}</b></div>
        <div class="dato"><span>Puntos</span><b style="color:${saltos ? 'var(--amarillo)' : 'var(--verde)'}">${Object.keys(u.marcas).length} de ${r.puntos.length}${saltos ? ` · saltó: ${r.puntos.filter((_, i) => !u.marcas[i]).join(', ')}` : ''}</b></div>
        ${nov.length ? `<div class="dato"><span>Novedad</span><b style="color:var(--amarillo)">${nov.map(m => esc(m.nota)).join(' · ')}</b></div>` : ''}` : ''}
      ${puede && !act && e.k !== 'curso' ? `<button class="boton sec" data-rn="empezar" data-r="${r.id}" style="margin-top:10px">Empezar esta ronda</button>` : ''}</div>`;
  }).join('');
  const h = hoy.slice().sort((a, b) => b.ini - a.ini);
  $('#rnHist').innerHTML = h.length ? h.map(x => { const r = RUTAS.find(y => y.id === x.ruta), n = Object.values(x.marcas).filter(m => !m.ok); return `<div class="pedido"><div><b>${r.n} · ${esc(x.por)}</b><small>${horaDR(x.ini)}${x.fin ? ' a ' + horaDR(x.fin) : ' · en curso'} · ${Object.keys(x.marcas).length} de ${r.puntos.length} puntos${n.length ? ' · Novedad: ' + n.map(m => esc(m.nota)).join(' · ') : ''}</small></div>${n.length ? '<span class="chip amarillo">Novedad</span>' : x.fin && Object.keys(x.marcas).length < r.puntos.length ? '<span class="chip amarillo">Saltó puntos</span>' : '<span class="chip verde">Completa</span>'}</div>`; }).join('') : '<p class="cob-sub">Todavía no hay rondas hoy.</p>';
}
$('#rondas').addEventListener('click', e => {
  const b = e.target.closest('[data-rn]'); if (!b) return;
  const a = b.dataset.rn, l = leerRondas(), act = miRonda(l), i = +b.dataset.i;
  if (a === 'empezar') {
    const r = RUTAS.find(x => x.id === b.dataset.r), otra = l.find(x => !x.fin && x.ruta === r.id);
    if (otra) return toast(`${otra.por} ya está haciendo esta ronda`);
    l.push({ id: nuevoId('rd'), ruta: r.id, por: yoNombre(), porCod: yoCod(), ini: ahoraMs(), fin: null, marcas: {} }); guardarComp('rondas', l);
    registrar('🛡️ Ronda', `Empezó la ronda ${r.n}`); toast('Ronda empezada: marca cada punto al pasar'); rnConfirmar = false;
  } else if (!act) return;
  else if (a === 'ok') { act.marcas[i] = { t: ahoraMs(), ok: true, nota: '' }; guardarComp('rondas', l); }
  else if (a === 'nov') { rnNovedad = i; pintarRondas(); setTimeout(() => $('#rnNovTxt') && $('#rnNovTxt').focus(), 30); return; }
  else if (a === 'nov-no') rnNovedad = null;
  else if (a === 'nov-ok') {
    const t = ($('#rnNovTxt').value || '').trim(); if (!t) return $('#rnNovTxt').focus();
    const r = RUTAS.find(x => x.id === act.ruta); act.marcas[i] = { t: ahoraMs(), ok: false, nota: t }; guardarComp('rondas', l); rnNovedad = null;
    registrar('⚠️ Novedad en ronda', `${r.n} · ${r.puntos[i]}: ${t}`); toast('Novedad guardada; dirección ya la ve');
  } else if (a === 'deshacer') { delete act.marcas[i]; guardarComp('rondas', l); }
  else if (a === 'fin' || a === 'fin-si') {
    const r = RUTAS.find(x => x.id === act.ruta), faltan = r.puntos.length - Object.keys(act.marcas).length;
    if (a === 'fin' && faltan) { rnConfirmar = true; pintarRondas(); return; }
    act.fin = ahoraMs(); guardarComp('rondas', l); rnConfirmar = false;
    registrar('🛡️ Ronda', `Terminó la ronda ${r.n}: ${r.puntos.length - faltan} de ${r.puntos.length} puntos`); toast('Ronda terminada');
  } else if (a === 'fin-no') rnConfirmar = false;
  pintarRondas();
});
