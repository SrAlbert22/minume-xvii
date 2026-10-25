// MINUME XVII · Mandar a la gente: órdenes de la subdirección · Albert Silvestre
// ---------- Mandar a la gente: órdenes de la subdirección ----------
// La subdirección (o la coordinación) de un equipo manda a una persona de su staff a un punto o a una tarea.
// A esa persona le aparece arriba «Te mandan…» con «Voy en camino», «Ya llegué» o «No puedo», y le suena en el
// teléfono aunque esté bloqueado (la base avisa por Web Push, ver supabase/esquema.sql). Quien la mandó ve la respuesta.
// Clave compartida «ordenes»: [{ id, para (ref del código), paraN, de, deRef, sis, que, t, estado, tE }]
const CLAVE_ORD = 'ordenes';
const EST_ORD = { nueva: ['Enviada', 'amarillo'], voy: ['En camino', ''], llegue: ['Ya llegó', 'verde'], nopuedo: ['No puede', 'rojo'] };
const leerOrdenes = () => leerComp(CLAVE_ORD, []);
const miRef = () => estado.usuario && estado.usuario.ref;
const ordenesDeHoy = () => leerOrdenes().filter(o => diaDR(o.t) === hoyDR());
const ultimaOrden = ref => ordenesDeHoy().filter(o => o.para === ref).sort((a, b) => b.t - a.t)[0];
let ordVistas = new Set(leerOrdenes().map(o => o.id));

function cambiarOrden(id, est) {
  const l = leerOrdenes(), o = l.find(x => x.id === id); if (!o) return;
  o.estado = est; o.tE = ahoraMs(); guardarComp(CLAVE_ORD, l.slice(-300)); borrarNotificaciones(['ord-' + id]);
  registrar('Orden', `${o.que} · ${EST_ORD[est][0]}`);
  pintarOrdenes();
}

// Lo que le llega a cada persona
function pintarOrdenes() {
  const b = $('#bannerOrden'); if (!b) return;
  const ref = miRef(); if (!ref) { b.hidden = true; return; }
  const l = ordenesDeHoy().filter(o => o.para === ref && (o.estado === 'nueva' || o.estado === 'voy')).sort((a, c) => c.t - a.t);
  for (const o of l) if (!ordVistas.has(o.id)) {
    ordVistas.add(o.id);
    if (o.estado === 'nueva') { tono(988, .2, .3); setTimeout(() => tono(1318, .2, .3), 230); setTimeout(() => tono(988, .3, .3), 460); vibrar([400, 150, 400, 150, 700]); toast(`${o.de.split(' ')[0]} te manda: ${o.que}`); }
  }
  if (!l.length) { b.hidden = true; return; }
  const o = l[0];
  b.hidden = false; b.className = 'banner-orden' + (o.estado === 'nueva' ? ' nueva' : '');
  b.innerHTML = `<div class="bo-txt"><b>${esc(o.de)} te manda</b><span>${esc(o.que)}</span><small>${horaDR(o.t)}${o.estado === 'voy' ? ' · vas en camino' : ''}${l.length > 1 ? ` · y ${l.length - 1} más` : ''}</small></div>
    <div class="bo-acc">${o.estado === 'nueva' ? `<button class="boton" type="button" data-ord="voy" data-id="${o.id}">Voy en camino</button>` : ''}<button class="boton${o.estado === 'voy' ? '' : ' sec'}" type="button" data-ord="llegue" data-id="${o.id}">Ya llegué</button><button class="boton sec" type="button" data-ord="nopuedo" data-id="${o.id}">No puedo</button></div>`;
}
$('#bannerOrden').addEventListener('click', e => {
  const x = e.target.closest('[data-ord]'); if (!x) return;
  cambiarOrden(x.dataset.id, x.dataset.ord);
  toast({ voy: 'Avisaste que vas en camino', llegue: 'Avisaste que ya llegaste', nopuedo: 'Avisaste que no puedes' }[x.dataset.ord]);
});

// Ventana para mandar a una persona (solo la dirección de su equipo)
function ventanaMandar(p) {
  if (!esDir() || !p || !p.ref) return;
  const rapidos = (SISTEMA === 'seguridad' && typeof COB_PUNTOS !== 'undefined' ? COB_PUNTOS.map(x => `Ve a ${x.id} · ${x.n}`) : []).concat(['Ven a donde estoy', 'Llámame en cuanto puedas', 'Ve a la entrada a apoyar']);
  const v = document.createElement('div'); v.className = 'sos-velo on push-velo'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = `<div class="tarjeta"><b class="cond" style="font-size:28px">Mandar a ${esc(p.nombre.split(' ')[0])}</b>
    <p>Le aparece arriba en su página y le suena en el teléfono. Te va a responder «Voy en camino», «Ya llegué» o «No puedo».</p>
    <label for="ordQue">¿Qué tiene que hacer?</label><textarea id="ordQue" rows="2" maxlength="200" placeholder="Ejemplo: Ve a la entrada del Sheraton a apoyar"></textarea>
    <div class="ord-rapidos">${rapidos.map(t => `<button type="button" class="mini" data-txt="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="boton" type="button" data-m="enviar">Mandar</button><button class="boton sec" type="button" data-m="cerrar">Cancelar</button></div></div>`;
  v.addEventListener('click', e => {
    if (e.target === v || e.target.closest('[data-m="cerrar"]')) return v.remove();
    const r = e.target.closest('[data-txt]'); if (r) { $('#ordQue').value = r.dataset.txt; $('#ordQue').focus(); return; }
    if (!e.target.closest('[data-m="enviar"]')) return;
    const que = $('#ordQue').value.trim(); if (!que) return $('#ordQue').focus();
    const l = leerOrdenes(), o = { id: nuevoId('o'), para: p.ref, paraN: p.nombre, de: yoNombre(), deRef: miRef(), sis: SISTEMA, que, t: ahoraMs(), estado: 'nueva' };
    l.push(o); ordVistas.add(o.id); guardarComp(CLAVE_ORD, l.slice(-300));
    registrar('Orden', `${p.nombre}: ${que}`);
    toast(`Le mandaste a ${p.nombre.split(' ')[0]}: ${que}`); v.remove();
    if (window.SUBDIR_LISTO) pintarSubdireccion();
  });
  document.body.appendChild(v);
  setTimeout(() => $('#ordQue').focus(), 50);
}

addEventListener('storage', e => { if (e.key === CLAVE_COMP(CLAVE_ORD)) { pintarOrdenes(); if (window.SUBDIR_LISTO && seccionActual === 'subdireccion') pintarSubdireccion(); } });
setInterval(pintarOrdenes, 5000);
pintarOrdenes();
