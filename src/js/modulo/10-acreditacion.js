// MINUME XVII · Acreditación con QR · Albert Silvestre
// ---------- Acreditación con QR ----------
// Gafetes de ejemplo. En la versión real salen de la base de datos y la firma la pone el servidor con una llave que nadie ve.
const GAFETES = {
  'ACR-7F3K2': { n: 'María Pérez', rol: 'asistencia', com: 'AMS' }, 'ACR-5K8CN': { n: 'Carla Núñez', rol: 'acreditacion' }, 'ACR-2H9QD': { n: 'Luis Gómez', rol: 'seguridad' },
  'ACR-5T7WX': { n: 'Ana Rosario', rol: 'traslado' }, 'ACR-1C0RD': { n: 'Coordinación general', rol: 'coordinacion' },
  'ACR-8P4SN': { n: 'Pedro Santos', rol: 'asistencia', com: 'CDT' }, 'ACR-3L6PN': { n: 'Laura Peña', rol: 'asistencia', com: 'CSNU' },
  'ACR-9M2OT': { n: 'Miguel Ortiz', rol: 'asistencia', com: 'OMT' }, 'ACR-4Y7CZ': { n: 'Yaneris Cruz', rol: 'seguridad' },
  'ACR-6R1AL': { n: 'Rosa Almonte', rol: 'traslado' }, 'ACR-0C5MD': { n: 'Carlos Méndez', rol: 'traslado' },
  'ACR-7S3MT': { n: 'Sofía Marte', rol: 'asistencia', com: 'AMS' },
  'ACR-8B1EN': { n: 'Sofía Matos', rol: 'bienestar' }, 'ACR-2B6LM': { n: 'Luisa Mejía', rol: 'bienestar' },
};
const VENTANA = 30000, SECRETO = 'minume17-demo';
function firma(s) { let h = 2166136261; for (const ch of SECRETO + s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6); }
const ventanaAhora = () => Math.floor(Date.now() / VENTANA);
const qrTexto = (id, v = ventanaAhora()) => `M17.${id}.${v.toString(36)}.${firma(id + '.' + v)}`;
function validarQR(txt) {
  const m = /^M17\.(ACR-[A-Z0-9]{5})\.([a-z0-9]+)\.([A-Z0-9]{6})$/.exec((txt || '').trim());
  if (!m) return { mal: 'Este QR no es un gafete de MINUME XVII.', nivel: 'rojo' };
  const [, id, v36, f] = m, v = parseInt(v36, 36);
  if (firma(id + '.' + v) !== f || !GAFETES[id]) return { mal: 'QR inventado o alterado: la firma no coincide. No dejes pasar a esta persona y avisa a Seguridad.', nivel: 'rojo' };
  if (Math.abs(ventanaAhora() - v) > 1) return { mal: `Este QR es de hace ${Math.round((ventanaAhora() - v) * VENTANA / 60000)} min: parece una captura de pantalla. Pídele que abra su gafete en vivo.`, nivel: 'amarillo', id };
  return { id };
}
const hora = (ms = Date.now()) => new Date(ms).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' });
const hoyA = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return +d; };
estado.acreditados = leer('acreditados', { 'ACR-1C0RD': { t: hoyA(6, 55), por: 'Mesa de acreditación' }, 'ACR-3L6PN': { t: hoyA(7, 42), por: 'Mesa de acreditación' }, 'ACR-4Y7CZ': { t: hoyA(7, 50), por: 'Lobby del Sheraton' } });
function pintarGafete() {
  const u = estado.usuario; if (!u || !GAFETES[u.acr]) return;
  const g = GAFETES[u.acr], color = COLOR_ROL[u.rol], acr = estado.acreditados[u.acr];
  $('#gAv').textContent = iniciales(u.nombre); $('#gAv').style.background = color;
  $('#gNombre').textContent = u.nombre; $('#gRol').textContent = ROLES[u.rol][0]; $('#gRol').style.color = color;
  const sede = g.com ? ASIGNA[g.com] : null;
  $('#gDet').textContent = g.com ? `${g.com} · ${SEDES[sede[0]].nombre} · ${sede[1]}` : 'Equipo de la Secretaría · todas las sedes';
  $('#gId').textContent = u.acr;
  $('#gafete').classList.toggle('ok', !!acr);
  $('#gEstado').className = 'chip ' + (acr ? 'verde' : 'amarillo'); $('#gEstado').textContent = acr ? `✓ Acreditado · ${hora(acr.t)}` : 'Pendiente';
  pintarQR(true);
}
let qrVentana = null;
function pintarQR(forzar) {
  const u = estado.usuario; if (!u || !window.qrcode) return;
  const v = ventanaAhora(), resta = Math.ceil((VENTANA - Date.now() % VENTANA) / 1000);
  if (forzar || v !== qrVentana) { qrVentana = v; const q = qrcode(0, 'M'); q.addData(qrTexto(u.acr, v)); q.make(); const svg = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }); $('#qr').innerHTML = svg; $('#qrG').innerHTML = svg; }
  $('#qrBarra').style.width = (resta / 30 * 100) + '%'; $('#qrSeg').textContent = `El QR cambia en ${resta} s`;
}
setInterval(() => { if (seVe($('#qr'))) pintarQR(false); }, 1000);
// QR en grande: pantalla blanca y, si el teléfono lo permite, que no se apague mientras lo escanean
let candado = null;
$('#bQrGrande').onclick = async () => { $('#qrGNombre').textContent = estado.usuario ? estado.usuario.nombre : ''; $('#qrGrande').classList.add('on'); try { candado = await navigator.wakeLock.request('screen'); } catch {} };
$('#qrGrande').onclick = () => { $('#qrGrande').classList.remove('on'); try { candado && candado.release(); } catch {} candado = null; };
let verAcr = 'llegaron';
$('#acrVer').onclick = e => { const b = e.target.closest('button'); if (!b) return; verAcr = b.dataset.v; $$('#acrVer button').forEach(x => x.classList.toggle('on', x === b)); pintarLlegadas(); };
function pintarLlegadas() {
  const l = Object.entries(estado.acreditados).sort((a, b) => b[1].t - a[1].t), tot = Object.keys(GAFETES).length;
  $('#acrCuenta').textContent = `${l.length} de ${tot}`; $('#acrBarra').style.width = (l.length / tot * 100) + '%';
  $('#acrFaltan').textContent = l.length < tot ? `Faltan ${tot - l.length}` : 'Llegaron todos ✓';
  const fila = (g, abajo, der) => `<div class="llegada"><div class="av" style="background:${COLOR_ROL[g.rol]}">${iniciales(g.n)}</div><div><b>${esc(g.n)}</b><small>${ROLES[g.rol][0]}${g.com ? ' · ' + g.com : ''}${abajo}</small></div>${der}</div>`;
  if (verAcr === 'faltan') { const f = Object.entries(GAFETES).filter(([id]) => !estado.acreditados[id]); $('#acrLista').innerHTML = f.map(([, g]) => fila(g, '', '<span class="hora" style="color:var(--amarillo)">Pendiente</span>')).join('') || '<div style="color:var(--suave);font-size:13px;padding:8px 0">Ya llegaron todos ✓</div>'; return; }
  $('#acrLista').innerHTML = l.slice(0, 6).map(([id, a]) => fila(GAFETES[id], ` · por ${esc(a.por)}`, `<span class="hora">${hora(a.t)}</span>`)).join('');
}
let audio = null;
function pitido(bien) { try { audio = audio || new AudioContext(); const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = bien ? 1320 : 330; o.type = bien ? 'sine' : 'square'; g.gain.setValueAtTime(.12, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + (bien ? .18 : .4)); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .4); } catch {} }
function resultado(nivel, html) { const r = $('#resultado'); r.className = 'resultado ' + nivel; r.innerHTML = html; pitido(nivel === 'verde'); try { navigator.vibrate && navigator.vibrate(nivel === 'verde' ? 80 : [60, 60, 60]); } catch {} }
function procesarQR(txt) {
  const r = validarQR(txt);
  if (r.mal) return resultado(r.nivel, `<b class="grande">${r.nivel === 'rojo' ? '✗ No válido' : '⚠️ Revisa'}</b>${r.mal}${r.id ? `<br><small>Gafete de ${esc(GAFETES[r.id].n)}</small>` : ''}`);
  const g = GAFETES[r.id], ya = estado.acreditados[r.id], sede = g.com ? ASIGNA[g.com] : null;
  const ficha = `${ROLES[g.rol][0]}${g.com ? ` · ${g.com}<br>🏨 ${SEDES[sede[0]].nombre} · ${sede[1]}` : ' · Equipo de la Secretaría'}`;
  if (ya) return resultado('amarillo', `<b class="grande">Ya se acreditó</b>${esc(g.n)} entró a las ${hora(ya.t)} (${esc(ya.por)}).<br>Si está entrando otra vez, está bien. Si son dos personas con el mismo gafete, avisa a Seguridad.`);
  const por = estado.usuario ? estado.usuario.nombre : 'Mesa de acreditación';
  estado.acreditados[r.id] = { t: Date.now(), por }; guardar('acreditados', estado.acreditados);
  registrar('🪪 Acreditación', `${g.n} acreditado (${g.com || ROLES[g.rol][0]})`);
  resultado('verde', `<b class="grande">Bienvenido, ${esc(g.n.split(' ')[0])}</b>${ficha}<br>Acreditado a las ${hora()}.`);
  pintarLlegadas(); if (estado.usuario && r.id === estado.usuario.acr) pintarGafete();
}
$('#simular').onclick = e => {
  const b = e.target.closest('button[data-sim]'); if (!b) return;
  const mio = estado.usuario && estado.usuario.acr, ids = Object.keys(GAFETES).filter(id => id !== mio);
  const s = b.dataset.sim;
  if (s === 'ok') { const id = ids.find(id => !estado.acreditados[id]); return id ? procesarQR(qrTexto(id)) : toast('Ya se acreditaron todos los gafetes de ejemplo'); }
  if (s === 'repetido') return procesarQR(qrTexto(ids.find(id => estado.acreditados[id]) || 'ACR-3L6PN'));
  if (s === 'vencido') return procesarQR(qrTexto('ACR-9M2OT', ventanaAhora() - 40));
  procesarQR(`M17.ACR-8P4SN.${ventanaAhora().toString(36)}.ABC123`);
};
// Cámara: usa el lector de QR del navegador si existe; si no, carga jsQR. Sirve para los dos escáneres.
function cargarJsQR() { return window.jsQR ? Promise.resolve() : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); }); }
function crearEscaner(vid, msg, boton, alLeer) {
  let flujo = null, detector = null, ultimo = '', ultimoT = 0;
  const lz = document.createElement('canvas'), cx = lz.getContext('2d', { willReadFrequently: true });
  const apagado = t => { msg.style.display = 'grid'; msg.textContent = t; };
  async function abrir() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return apagado('Este navegador no deja usar la cámara aquí. En la página publicada (https) sí funciona. Mientras, usa los botones de prueba.');
    try {
      apagado('Abriendo la cámara…');
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      vid.srcObject = flujo; await vid.play(); msg.style.display = 'none';
      if ('BarcodeDetector' in window) { try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; } }
      if (!detector) await cargarJsQR();
      boton.textContent = '⏹ Cerrar la cámara'; leer();
    } catch { cerrar(); apagado('No se pudo abrir la cámara (permiso negado o no hay cámara). Usa los botones de prueba.'); }
  }
  function cerrar() { if (flujo) flujo.getTracks().forEach(t => t.stop()); flujo = null; vid.srcObject = null; boton.textContent = '📷 Abrir la cámara'; apagado('La cámara está apagada.'); }
  async function leer() {
    if (!flujo) return; let txt = null;
    try {
      if (vid.readyState >= 2) {
        if (detector) { const r = await detector.detect(vid); if (r.length) txt = r[0].rawValue; }
        else if (window.jsQR) { const w = lz.width = Math.min(640, vid.videoWidth), h = lz.height = Math.round(vid.videoHeight * w / vid.videoWidth); cx.drawImage(vid, 0, 0, w, h); const r = jsQR(cx.getImageData(0, 0, w, h).data, w, h); if (r) txt = r.data; }
      }
    } catch {}
    if (txt && (txt !== ultimo || Date.now() - ultimoT > 4000)) { ultimo = txt; ultimoT = Date.now(); alLeer(txt); }
    setTimeout(leer, 180);
  }
  boton.onclick = () => flujo ? cerrar() : abrir();
  return { abrir, cerrar };
}
crearEscaner($('#video'), $('#visorMsg'), $('#bCamara'), procesarQR);

// ---------- Acreditación de delegados (solo Acreditación y Coordinación) ----------
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const NOMBRES = ['Valeria', 'Santiago', 'Camila', 'Mateo', 'Isabella', 'Sebastián', 'Sofía', 'Diego', 'Mariana', 'Andrés', 'Gabriela', 'Daniel', 'Lucía', 'Alejandro', 'Paula', 'Gabriel', 'Daniela', 'Samuel', 'Ana Laura', 'José Miguel', 'Nicole', 'Emmanuel', 'Ariana', 'Kevin'];
const APELLIDOS = ['Rodríguez', 'Martínez', 'García', 'Pérez', 'Reyes', 'Jiménez', 'Castillo', 'Fernández', 'Mejía', 'Santana', 'Peña', 'Díaz', 'Vásquez', 'Ramírez', 'Ortiz', 'Guzmán', 'Núñez', 'Rosario', 'Morel', 'Taveras'];
const PAISES = ['Francia', 'Japón', 'Brasil', 'Canadá', 'Kenia', 'India', 'México', 'Alemania', 'Noruega', 'Egipto', 'Chile', 'Corea del Sur', 'Australia', 'Sudáfrica', 'Italia', 'Argentina', 'Indonesia', 'Marruecos'];
const COLEGIOS = ['Colegio Horizonte', 'Liceo Los Pinos', 'Instituto Nuevo Amanecer', 'Colegio Arcoíris', 'Liceo Brisas del Mar', 'Colegio Monte Verde', 'Instituto Puerta del Sol', 'Colegio Las Palmas'];
function delegadosEjemplo() { let r = 7; const az = n => (r = r * 16807 % 2147483647) % n, l = []; COMISIONES.forEach(([c]) => { for (let i = 0; i < 8; i++) l.push({ id: 'D-' + String(l.length + 1).padStart(3, '0'), n: `${NOMBRES[az(NOMBRES.length)]} ${APELLIDOS[az(APELLIDOS.length)]} ${APELLIDOS[az(APELLIDOS.length)]}`, com: c, del: PAISES[az(PAISES.length)], col: COLEGIOS[az(COLEGIOS.length)] }); }); return l; }
// La lista de delegados y quién ya se acreditó son compartidas: todas las mesas ven lo mismo al instante y nadie se acredita dos veces.
// (Se leen directo del navegador porque este módulo carga antes que la base compartida.)
const compAcr = k => { try { return JSON.parse(localStorage.getItem('minume.compartido.' + k) || 'null'); } catch { return null; } };
const guardarAcr = () => { try { localStorage.setItem('minume.compartido.acreditados', JSON.stringify(estado.delAcr)); } catch {} };
let DELEGADOS = compAcr('config.delegados') || leer('delegados', null) || delegadosEjemplo();
estado.delAcr = compAcr('acreditados') || {};
let colaDel = leer('colaDel', []), simOffline = false, fichaDel = null;
const qrDel = d => `M17D.${d.id}.${firma('D.' + d.id)}`; // en la versión real: firma con llave privada, se comprueba sin internet con la llave pública
const enLinea = () => navigator.onLine && !simOffline;
function pintarSync() {
  const on = enLinea(), n = colaDel.length;
  $('#dSync').classList.toggle('off', !on);
  $('#dSyncTxt').textContent = on ? (n ? `Subiendo ${n}…` : 'En línea · todo guardado en la nube') : `Sin internet · ${n} guardada${n === 1 ? '' : 's'} en este teléfono`;
  $('#dOffline').textContent = simOffline ? '📶 Volver a tener internet' : '📴 Simular sin internet';
}
function sincronizar() {
  pintarSync(); if (!enLinea() || !colaDel.length) return;
  const n = colaDel.length;
  setTimeout(() => { colaDel.forEach(id => { if (estado.delAcr[id]) estado.delAcr[id].sync = true; }); colaDel = []; guardar('colaDel', colaDel); guardarAcr(); pintarDelegados(); pintarTablero(); toast(`☁️ Volvió el internet: se subieron ${n} acreditación${n === 1 ? '' : 'es'}`); }, 1300);
}
addEventListener('online', sincronizar); addEventListener('offline', pintarSync);
$('#dOffline').onclick = () => { simOffline = !simOffline; if (simOffline) { pintarSync(); toast('📴 Sin internet: puedes seguir acreditando'); } else sincronizar(); };
function abrirFicha(d, como) {
  fichaDel = d; const ya = estado.delAcr[d.id], a = ASIGNA[d.com], nom = (COMISIONES.find(c => c[0] === d.com) || [d.com, ''])[1];
  const box = $('#dFicha'); box.className = 'resultado ficha-del ' + (ya ? 'amarillo' : 'verde');
  box.innerHTML = `<b class="grande">${ya ? '⚠️ Ya está acreditado' : como === 'qr' ? '✓ QR válido' : '🔎 Encontrado en la lista'}</b>
    <div style="font:800 28px 'Barlow Condensed';color:#fff;margin:6px 0 8px;line-height:1.05">${esc(d.n)}</div>
    <div class="fila"><span>Comisión</span><b>${esc(d.com)}${nom ? ` · <small style="font-weight:500">${esc(nom)}</small>` : ''}</b></div>
    <div class="fila"><span>Delegación</span><b>${esc(d.del || '—')}</b></div><div class="fila"><span>Colegio</span><b>${esc(d.col || '—')}</b></div>
    <div class="fila"><span>Sede · salón</span><b>${a ? `${SEDES[a[0]].nombre} · ${a[1]}` : 'Por confirmar'}</b></div><div class="fila"><span>ID</span><b>${d.id}</b></div>
    ${ya ? `<p style="margin:10px 0 0">Llegó a las ${hora(ya.t)} · ${esc(ya.por)}${ya.sync ? '' : ' · <b>guardado sin internet, se sube al volver la señal</b>'}. Si es otra persona con el mismo QR, avisa a Seguridad.</p><button class="boton sec" id="dCerrar" style="margin-top:12px">Siguiente →</button>`
    : `${como === 'manual' ? '<p style="margin:10px 0 0">Sin QR: pide su identificación o su carné del colegio antes de confirmar.</p>' : ''}
      <div class="entregas"><label><input type="checkbox" id="eGafete" checked> 🪪 Gafete</label><label><input type="checkbox" id="eKit" checked> 🎒 Kit</label><label><input type="checkbox" id="eMat"> 📘 Material</label></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="boton" id="dConfirmar">Confirmar acreditación</button><button class="boton sec" id="dCerrar">Cancelar</button></div>`}`;
  $('#dCerrar').onclick = () => { box.className = 'resultado'; box.textContent = 'Listo para el siguiente delegado.'; $('#dBuscar').value = ''; $('#dResultados').innerHTML = ''; };
  if (!ya) $('#dConfirmar').onclick = () => confirmarDel(d, como);
}
function confirmarDel(d, como) {
  const on = enLinea();
  estado.delAcr[d.id] = { t: Date.now(), por: estado.usuario ? estado.usuario.nombre : 'Mesa', sync: on, manual: como === 'manual', gafete: $('#eGafete').checked, kit: $('#eKit').checked, material: $('#eMat').checked };
  if (!on) colaDel.push(d.id);
  guardarAcr(); guardar('colaDel', colaDel);
  registrar('🪪 Delegado', `${d.n} (${d.com}) acreditado${como === 'manual' ? ' a mano' : ''}`);
  const box = $('#dFicha'); box.className = 'resultado verde';
  box.innerHTML = `<b class="grande">${esc(d.n.split(' ')[0])} acreditado${on ? '' : ' (sin internet)'}</b>${esc(d.com)} · ${esc(d.del || '')} · ${hora()}<br>${on ? 'Guardado en la nube.' : 'Guardado en este teléfono: se sube solo cuando vuelva el internet.'}`;
  pitido(true); $('#dBuscar').value = ''; $('#dResultados').innerHTML = ''; pintarDelegados(); pintarTablero();
}
function procesarDel(txt) {
  const m = /^M17D\.(D-\d{3,5})\.([A-Z0-9]{6})$/.exec((txt || '').trim()), d = m && DELEGADOS.find(x => x.id === m[1]);
  if (!m || !d || firma('D.' + m[1]) !== m[2]) { const b = $('#dFicha'); b.className = 'resultado rojo'; b.innerHTML = `<b class="grande">No válido</b>${m ? 'QR inventado o alterado: la firma no coincide.' : 'Este QR no es de un delegado de MINUME XVII.'} Búscalo por nombre y pide su identificación.`; pitido(false); return; }
  abrirFicha(d, 'qr'); pitido(!estado.delAcr[d.id]);
}
crearEscaner($('#video2'), $('#visorMsg2'), $('#bCamara2'), procesarDel);
$('#simDel').onclick = e => {
  const b = e.target.closest('button[data-sim]'); if (!b) return; const s = b.dataset.sim;
  if (s === 'ok') { const d = DELEGADOS.find(x => !estado.delAcr[x.id]); return d ? procesarDel(qrDel(d)) : toast('Ya están todos acreditados'); }
  if (s === 'repetido') { const d = DELEGADOS.find(x => estado.delAcr[x.id]); return d && procesarDel(qrDel(d)); }
  procesarDel('M17D.D-007.ZZZ999');
};
$('#dBuscar').oninput = () => {
  const q = norm($('#dBuscar').value.trim()); if (q.length < 2) { $('#dResultados').innerHTML = ''; return; }
  const r = DELEGADOS.filter(d => norm(`${d.n} ${d.del} ${d.col} ${d.com} ${d.id}`).includes(q)).slice(0, 8);
  $('#dResultados').innerHTML = r.map(d => `<div class="del-res" data-id="${d.id}"><div><b>${esc(d.n)}</b><small>${esc(d.com)} · ${esc(d.del || '')} · ${esc(d.col || '')}</small></div>${estado.delAcr[d.id] ? '<span class="chip verde">Llegó</span>' : '<span class="chip amarillo">Pendiente</span>'}</div>`).join('') || '<div style="color:var(--suave);font-size:13px;padding:8px 0">No aparece. Revisa cómo se escribe o avisa a coordinación.</div>';
};
$('#dResultados').onclick = e => { const el = e.target.closest('[data-id]'); if (el) abrirFicha(DELEGADOS.find(d => d.id === el.dataset.id), 'manual'); };
function pintarDelegados() {
  const tot = DELEGADOS.length, ok = DELEGADOS.filter(d => estado.delAcr[d.id]).length;
  $('#dTotal').textContent = `${ok} de ${tot}`; $('#dBarra').style.width = (tot ? ok / tot * 100 : 0) + '%';
  $('#dComisiones').innerHTML = [...new Set(DELEGADOS.map(d => d.com))].map(c => { const l = DELEGADOS.filter(d => d.com === c), k = l.filter(d => estado.delAcr[d.id]).length; return `<div><b>${esc(c)}</b>${k} de ${l.length}<i style="width:${k / l.length * 100}%"></i></div>`; }).join('');
  pintarSync();
}
function cargarXLSX() { return window.XLSX ? Promise.resolve() : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); }); }
$('#dArchivo').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    await cargarXLSX();
    const wb = XLSX.read(await f.arrayBuffer()), filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const col = (fila, ...claves) => { const k = Object.keys(fila).find(k => claves.some(c => norm(k).includes(c))); return k ? String(fila[k]).trim() : ''; };
    const l = filas.map((r, i) => ({ id: 'D-' + String(i + 1).padStart(3, '0'), n: col(r, 'nombre'), com: col(r, 'comis').toUpperCase(), del: col(r, 'deleg', 'pais'), col: col(r, 'colegio', 'centro', 'escuela', 'institu') })).filter(d => d.n);
    if (!l.length) { toast('No encontré la columna "nombre" en el archivo'); return; }
    const ya = Object.keys(estado.delAcr).length;
    if (ya && !confirm(`Ya hay ${ya} delegados acreditados. Si cambias la lista, sus marcas pueden quedar en otra persona. ¿Seguir?`)) { e.target.value = ''; return; }
    DELEGADOS = l; guardar('delegados', l);
    if (esDir()) try { localStorage.setItem('minume.compartido.config.delegados', JSON.stringify(l)); } catch {}   // la lista nueva llega a todas las mesas
    $('#dFuente').textContent = `Usando tu lista "${f.name}": ${l.length} delegados.`; pintarDelegados(); pintarTablero(); toast(esDir() ? `Se cargaron ${l.length} delegados para todas las mesas` : `Se cargaron ${l.length} delegados en este teléfono. Para todas las mesas, súbela con el código de la subdirección.`);
  } catch { toast('No se pudo leer el archivo. Prueba con la plantilla.'); }
  e.target.value = '';
};
$('#dPlantilla').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeffnombre,comision,delegacion,colegio\nValeria Rodríguez Peña,CSNU,Francia,Colegio Horizonte\n'], { type: 'text/csv' })); a.download = 'plantilla-delegados.csv'; a.click(); };
if (compAcr('config.delegados') || leer('delegados', null)) $('#dFuente').textContent = `Usando la lista oficial: ${DELEGADOS.length} delegados.`;
// Otra mesa acreditó a alguien o la subdirección subió la lista: se ve aquí al instante
addEventListener('storage', e => {
  if (e.key === 'minume.compartido.acreditados') { estado.delAcr = compAcr('acreditados') || {}; pintarDelegados(); if (fichaDel && estado.delAcr[fichaDel.id] && $('#dConfirmar')) abrirFicha(fichaDel, 'manual'); }
  if (e.key === 'minume.compartido.config.delegados') { const l = compAcr('config.delegados'); if (l && l.length) { DELEGADOS = l; $('#dFuente').textContent = `Usando la lista oficial: ${l.length} delegados.`; pintarDelegados(); } }
});
