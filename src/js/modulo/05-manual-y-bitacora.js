// ---------- Manual: contactos, ficha, reporte en 20 segundos y bitácora ----------
// Contactos operativos del manual (sin teléfonos: en la página real cada uno abre su canal oficial)
const AREAS = [
  ['coordinacion', 'Coordinación de Asistencia', 'Beatriz Pérez'], ['subsecretaria', 'Subsecretario de Asistencia', 'Baldwin Ureña'],
  ['voluntarios', 'Gestión de Voluntarios', 'Adrian Triunfer'], ['bienestar', 'Bienestar', 'Laura Melián'],
  ['seguridad', 'Seguridad / Traslado', 'Brahyant Pérez'], ['eventos', 'Eventos / Protocolo', 'Daniela Sirit'], ['sgl', 'Soporte SGL', 'Kervin Diaz'],
];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#contactos').innerHTML = AREAS.map(([, a, p]) => `<div class="dato"><span>${a}</span><b>${p}</b></div>`).join('');

estado.ficha = leer('ficha', {});
function pintarFicha() {
  const a = estado.comision ? ASIGNA[estado.comision] : null, f = estado.ficha || {};
  $('#fCom').value = estado.comision ? `${estado.comision} · ${COMISIONES.find(c => c[0] === estado.comision)[1]}` : 'Escoge tu comisión en Inicio';
  $('#fSalon').value = a ? `${SEDES[a[0]].nombre} · Salón ${a[1]}` : '—';
  $$('#mi-comision [data-f]').forEach(i => { if (document.activeElement !== i) i.value = f[i.dataset.f] || ''; });
  const l = LISTAS.pre, m = estado.marcas.pre || [], faltan = l.filter((_, i) => !m.includes(i));
  $('#fResumen').innerHTML = `<div class="dato"><span>Checklist de Pre-MINUME</span><b style="color:${faltan.length ? 'var(--amarillo)' : 'var(--verde)'}">${m.length} de ${l.length}</b></div>`
    + faltan.slice(0, 4).map(t => `<div class="dato"><span>${t}</span><b style="color:var(--amarillo)">Falta</b></div>`).join('');
}
$('#mi-comision').addEventListener('input', e => { const k = e.target.dataset.f; if (!k) return; estado.ficha[k] = e.target.value; guardar('ficha', estado.ficha); });
$('#fIrLista').onclick = () => { listaVista = 'pre'; pintarListas(); $('#listas').scrollIntoView(); };
$('#momentos').onclick = e => { const m = e.target.closest('.momento'); if (!m) return; listaVista = m.dataset.e; pintarListas(); $('#listas').scrollIntoView(); };

const CONFIRMA = ['Sé cuál es mi comisión y dónde está', 'Conozco a mi mesa directiva', 'Tengo el canal de contacto de Beatriz', 'Sé qué materiales debo verificar', 'Sé cómo registrar una incidencia', 'Sé qué puedo resolver y qué debo escalar'];
function pintarConfirma() { const m = estado.marcas.confirma || []; $('#confirma').innerHTML = CONFIRMA.map((t, i) => `<div class="item${m.includes(i) ? ' ok' : ''}" data-i="${i}"><div class="caja"></div><span>${t}</span></div>`).join(''); }
$('#confirma').onclick = e => {
  const it = e.target.closest('.item'); if (!it) return;
  const i = +it.dataset.i, m = estado.marcas.confirma = estado.marcas.confirma || [];
  m.includes(i) ? m.splice(m.indexOf(i), 1) : m.push(i); guardar('marcas', estado.marcas); pintarConfirma();
  if (m.length === CONFIRMA.length) toast('Listo para tu primera sesión');
};

// Cierre: "Tu entrega del día"
function entregaDelDia() {
  const pend = estado.bitacora.filter(b => b.estatus === 'pendiente').length, m = estado.marcas.cierre || [];
  const fila = (t, ok, txt) => `<div class="dato"><span>${t}</span><b style="color:${ok ? 'var(--verde)' : 'var(--amarillo)'}">${txt}</b></div>`;
  return `<div class="extra-lista"><b class="t">Tu entrega del día</b>${fila('Bitácora', m.includes(5), pend ? `${pend} pendiente${pend === 1 ? '' : 's'} identificado${pend === 1 ? '' : 's'}` : m.includes(5) ? 'Cerrada' : 'Por cerrar')}${fila('Materiales', m.includes(2), m.includes(2) ? 'Recuperados o entregados' : 'Por recuperar')}${fila('Salón', m.includes(0) && m.includes(3), m.includes(0) && m.includes(3) ? 'Revisado y ordenado' : 'Por revisar')}${fila('Novedades', m.includes(5), m.includes(5) ? 'Reportadas a Beatriz' : 'Por reportar')}
    <div style="margin-top:10px"><b style="color:#fff">Antes de irte:</b> "¿queda algo sin resolver que pueda afectar la próxima sesión?". Si la respuesta es sí, déjalo reportado con responsable y estatus.</div></div>`;
}

// Reportar en 20 segundos: arma el mensaje con la fórmula del manual
$('#iArea').innerHTML = '<option value="">Nadie: lo resolví en piso</option>' + AREAS.map(([k, a, p]) => `<option value="${k}">${a} · ${p}</option>`).join('');
const AREA_NIVEL = { 1: '', 2: 'coordinacion', 3: 'bienestar' };
function textoReporte() {
  const a = estado.comision ? ASIGNA[estado.comision] : null, v = id => $(id).value.trim();
  return `Comisión ${estado.comision || '[nombre]'}. Situación: ${v('#iTexto') || '[qué pasa]'}. Impacto: ${$('#iImpacto').value}. Ya hice: ${v('#iHice') || '[acción]'}. Necesito: ${v('#iNecesito') || '[apoyo concreto]'}. Estoy en: ${v('#iDonde') || (a ? 'Salón ' + a[1] : '[ubicación]')}.`;
}
const vistaReporte = () => { $('#iVista').textContent = textoReporte(); };
$('#iNivel').onchange = () => { $('#iArea').value = AREA_NIVEL[$('#iNivel').value]; vistaReporte(); };
['#iTexto', '#iHice', '#iNecesito', '#iDonde', '#iImpacto', '#iArea'].forEach(id => $(id).addEventListener('input', vistaReporte));
$('#iArea').value = 'coordinacion'; vistaReporte();
$('#bCopiar').onclick = async () => { try { await navigator.clipboard.writeText(textoReporte()); toast('Mensaje copiado: pégalo en el canal'); } catch { toast('No se pudo copiar el mensaje'); } };

// Bitácora con el formato del manual: Hora · Situación · Acción · Área contactada · Estatus
const ETIQ = { resuelto: 'Resuelto', pendiente: 'Pendiente', escalado: 'Escalado' }, CICLO = { resuelto: 'pendiente', pendiente: 'escalado', escalado: 'resuelto' };
const EJEMPLOS = [['10:18 a. m.', 'Faltó un placard de la delegación de España.', 'Solución temporal colocada.', 'Coordinación', 'pendiente'],
  ['12:42 p. m.', 'Flujo congestionado en la salida al almuerzo.', 'Apoyo en el pasillo; resuelto en 5 min.', 'Coordinación', 'resuelto'],
  ['4:05 p. m.', 'Delegado presentó malestar.', 'Se activó Bienestar y se facilitó el acceso.', 'Bienestar', 'escalado']];
function pintarBitacora() {
  const pend = estado.bitacora.filter(b => b.estatus === 'pendiente').length;
  $('#bPend').textContent = `${pend} pendiente${pend === 1 ? '' : 's'}`; $('#bPend').className = 'chip ' + (pend ? 'amarillo' : 'verde');
  $('#bLista').innerHTML = estado.bitacora.length
    ? estado.bitacora.map((b, i) => ({ b, i })).reverse().map(({ b, i }) => `<tr><td style="white-space:nowrap">${b.hora}</td><td>${b.impacto ? `<span class="impacto ${b.impacto.toLowerCase()}" title="Impacto ${b.impacto}"></span>` : ''}<b>${esc(b.tipo)}</b> · ${esc(b.texto)}${b.comision ? `<div style="color:var(--suave);font-size:12px">${b.comision}</div>` : ''}</td><td>${esc(b.accion || '—')}</td><td>${esc(b.area || '—')}</td><td><button class="estatus ${b.estatus || 'resuelto'}" data-i="${i}">${ETIQ[b.estatus || 'resuelto']}</button></td></tr>`).join('')
    : EJEMPLOS.map(([h, s, a, ar, e]) => `<tr class="ejemplo"><td style="white-space:nowrap">${h}</td><td><b>Ejemplo</b> · ${s}</td><td>${a}</td><td>${ar}</td><td><span class="estatus ${e}">${ETIQ[e]}</span></td></tr>`).join('');
  if (listaVista === 'cierre') $('#lExtra').innerHTML = entregaDelDia();
}
$('#bLista').onclick = e => { const b = e.target.closest('button.estatus'); if (!b) return; const r = estado.bitacora[+b.dataset.i]; r.estatus = CICLO[r.estatus || 'resuelto']; guardar('bitacora', estado.bitacora); pintarBitacora(); };
function registrar(tipo, texto, extra = {}) {
  estado.bitacora.push({ tipo, texto, estatus: 'resuelto', ...extra, hora: new Date().toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }), comision: estado.comision });
  guardar('bitacora', estado.bitacora); pintarBitacora();
}
$('#bReportar').onclick = () => {
  const t = $('#iTexto').value.trim(); if (!t) return $('#iTexto').focus();
  const n = $('#iNivel').value, ar = AREAS.find(x => x[0] === $('#iArea').value);
  registrar(`Nivel ${n}`, t, { accion: $('#iHice').value.trim(), area: ar ? `${ar[1]} (${ar[2]})` : 'Resuelto en piso', estatus: n === '1' ? 'resuelto' : n === '3' ? 'escalado' : 'pendiente', impacto: $('#iImpacto').value });
  // nivel 2 y 3 le llegan al equipo que corresponde: Coordinación de Asistencia, Bienestar o Seguridad
  const destino = { coordinacion: 'asistencia', subsecretaria: 'asistencia', bienestar: 'bienestar', seguridad: 'seguridad' }[$('#iArea').value], asg = estado.comision ? ASIGNA[estado.comision] : null;
  if (destino && n !== '1') enviarAviso(destino, { tipo: `Nivel ${n} · impacto ${$('#iImpacto').value.toLowerCase()}`, texto: t, accion: $('#iHice').value.trim(), necesito: $('#iNecesito').value.trim(), comision: estado.comision || '', salon: asg ? asg[1] : '', donde: $('#iDonde').value.trim(), sede: asg ? SEDES[asg[0]].nombre : '', por: estado.usuario ? estado.usuario.nombre : (estado.nombre || '') });
  ['#iTexto', '#iHice', '#iNecesito'].forEach(id => $(id).value = ''); vistaReporte(); toast(destino && n !== '1' ? `Registrado y enviado a ${destino === 'asistencia' ? 'Coordinación' : NOMBRE_SIS[destino]}` : 'Registrado en la bitácora');
};
pintarConfirma();
