// ---------- Registro de atenciones de Bienestar (físico y emocional) ----------
const AT_AREA = { fisico: ['Físico', '#45c8ff'], emocional: ['Emocional', '#c58bff'] };
const AT_MOTIVOS = {
  fisico: ['Dolor de cabeza', 'Mareo o desmayo', 'Dolor de estómago', 'Golpe o herida', 'Alergia', 'Presión o azúcar', 'Calor o deshidratación', 'Otro'],
  emocional: ['Ansiedad o nervios', 'Ataque de pánico', 'Crisis de llanto', 'Estrés por el debate', 'Conflicto con otra persona', 'Extraña a su familia', 'Otro'],
};
const AT_SALIDA = ['Regresó a su comisión', 'Se quedó en reposo', 'Se avisó a su tutor o acudiente', 'Se fue a casa', 'Derivado al 9-1-1'];
const AT_PERSONA = ['Delegado', 'Staff', 'Mesa directiva', 'Otro'];
function leerAtenciones() {
  let l = leerComp('atenciones', null); if (l) return l;
  const t = ahoraMs();
  l = [
    { id: 'at1', area: 'fisico', nombre: 'Valeria Núñez', persona: 'Delegado', com: 'CSNU', motivo: 'Dolor de cabeza', que: 'Dolor de cabeza desde el desayuno', hizo: 'Agua y reposo con luz baja', seguir: false, llega: t - 95 * 60000, sale: t - 70 * 60000, salida: 'Regresó a su comisión', por: 'Sofía Matos' },
    { id: 'at2', area: 'emocional', nombre: 'Carlos Medina', persona: 'Delegado', com: 'CIJ', motivo: 'Ansiedad o nervios', que: 'Nervios antes de su discurso', hizo: 'Respiración guiada 10 min', seguir: true, llega: t - 60 * 60000, sale: t - 42 * 60000, salida: 'Regresó a su comisión', por: 'Marcos Peña' },
    { id: 'at3', area: 'fisico', nombre: 'Laura Peña', persona: 'Staff', com: '', motivo: 'Calor o deshidratación', que: 'Mareada después del traslado', hizo: 'Suero oral y sombra', seguir: false, llega: t - 18 * 60000, sale: null, por: 'Sofía Matos' },
    { id: 'at4', area: 'emocional', nombre: 'Andrea Féliz', persona: 'Delegado', com: 'AMS', motivo: 'Extraña a su familia', que: 'Llorando en el pasillo', hizo: 'Acompañamiento y llamada a su mamá', seguir: true, llega: t - 9 * 60000, sale: null, por: 'Marcos Peña' },
  ];
  guardarComp('atenciones', l); return l;
}
const miArea = () => (estado.usuario && (estado.usuario.area || (CODIGOS[estado.usuario.codigo] || {}).area)) || 'fisico';
let atFormArea = null, atArea = null, atVer = 'punto', atSaliendo = null, atDe = null;
$('#atPersona').innerHTML = AT_PERSONA.map(p => `<option>${p}</option>`).join('');
$('#atCom').innerHTML = '<option value="">No aplica</option>' + COMISIONES.map(([c]) => `<option>${c}</option>`).join('');
function pintarFormAt() { $$('#atFormArea button').forEach(b => b.classList.toggle('on', b.dataset.a === atFormArea)); $('#atMotivo').innerHTML = AT_MOTIVOS[atFormArea].map(m => `<option>${m}</option>`).join(''); }
function pintarAtenciones() {
  const sec = $('#atenciones'); if (!sec || !estado.usuario || !['bienestar', 'coordinacion'].includes(estado.usuario.rol)) return;
  const coord = esCoord();
  if (atDe !== yoCod()) { atDe = yoCod(); atFormArea = atArea = null; }
  if (!atFormArea) { atFormArea = miArea(); pintarFormAt(); }
  if (!atArea) atArea = coord ? 'todas' : miArea();
  $('#atFormCaja').hidden = coord;
  $('#atLead').textContent = coord ? 'Resumen de Bienestar físico y emocional sin nombres: por qué llegan, de qué comisión y cómo salen. Los nombres y detalles solo los ve Bienestar.' : 'Cada persona que llega al punto de bienestar: por qué vino, qué se hizo y cómo salió. Bienestar físico y bienestar emocional llevan su propio registro.';
  const l = leerAtenciones(), hoy = l.filter(x => diaDR(x.llega) === hoyDR()), enPunto = l.filter(x => !x.sale);
  $('#atTiles').innerHTML = tile(enPunto.length, 'en el punto ahora', '#ffd23f', '', enPunto.length > 0) + tile(hoy.length, 'atendidos hoy', '#2fd38c', '') + tile(`${hoy.filter(x => x.area === 'fisico').length} / ${hoy.filter(x => x.area === 'emocional').length}`, 'físico / emocional hoy', '#45c8ff', '') + tile(l.filter(x => x.seguir).length, 'requieren seguimiento', '#c58bff', '');
  $$('#atVer button').forEach(b => b.classList.toggle('on', b.dataset.v === atVer));
  $$('#atArea button').forEach(b => b.classList.toggle('on', b.dataset.a === atArea));
  const vista = (atVer === 'punto' ? enPunto : hoy).filter(x => atArea === 'todas' || x.area === atArea).sort((a, b) => b.llega - a.llega);
  if (escribiendo($('#atLista'))) return;
  $('#atLista').innerHTML = vista.length ? vista.map(x => {
    const [an, ac] = AT_AREA[x.area], min = Math.round(((x.sale || ahoraMs()) - x.llega) / 60000);
    const quien = coord ? `${esc(x.persona)}${x.com ? ' · ' + esc(x.com) : ''}` : `${esc(x.nombre)} · ${esc(x.persona)}${x.com ? ' · ' + esc(x.com) : ''}`;
    return `<div class="ob-item at-item" style="--c:${ac}"><div class="ob-cab"><b>${quien}</b><span class="chip" style="color:${ac};border-color:${ac}66">${an}</span></div>
      <small>${esc(x.motivo)} · llegó a las ${horaDR(x.llega)} · ${x.sale ? `estuvo ${min} min · ${esc(x.salida)}` : `lleva ${min} min`}${x.seguir ? ' · <b style="color:#c58bff">seguimiento</b>' : ''}</small>
      ${!coord && x.que ? `<small>${esc(x.que)}${x.hizo ? ' · Se hizo: ' + esc(x.hizo) : ''} · atendió ${esc(x.por)}</small>` : ''}
      ${!coord && !x.sale ? (atSaliendo === x.id ? `<div class="rn-nov"><select id="atSal">${AT_SALIDA.map(s => `<option>${s}</option>`).join('')}</select><button class="mini on" data-at="sal-ok" data-id="${x.id}">Guardar salida</button><button class="mini" data-at="sal-no">Cancelar</button></div>` : `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="mini" data-at="salida" data-id="${x.id}">Dar salida</button><button class="mini" data-at="seguir" data-id="${x.id}">${x.seguir ? 'Quitar seguimiento' : 'Marcar seguimiento'}</button></div>`) : ''}
    </div>`;
  }).join('') : `<p class="cob-sub">${atVer === 'punto' ? 'No hay nadie en el punto ahora.' : 'Todavía no hay atenciones hoy.'}</p>`;
  $('#atExp').hidden = coord;
}
$('#atFormArea').onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; atFormArea = b.dataset.a; pintarFormAt(); };
$('#atVer').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; atVer = b.dataset.v; pintarAtenciones(); };
$('#atArea').onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; atArea = b.dataset.a; pintarAtenciones(); };
$('#atGuardar').onclick = () => {
  const nombre = $('#atNombre').value.trim(); if (!nombre) return $('#atNombre').focus();
  const l = leerAtenciones(), x = { id: nuevoId('at'), area: atFormArea, nombre, persona: $('#atPersona').value, com: $('#atCom').value, motivo: $('#atMotivo').value, que: $('#atQue').value.trim(), hizo: $('#atHizo').value.trim(), seguir: $('#atSeguir').checked, llega: ahoraMs(), sale: null, por: yoNombre() };
  l.push(x); guardarComp('atenciones', l); ['#atNombre', '#atQue', '#atHizo'].forEach(s => $(s).value = ''); $('#atSeguir').checked = false;
  registrar(`💚 Atención ${AT_AREA[x.area][0].toLowerCase()}`, `${x.motivo}${x.com ? ' · ' + x.com : ''}`);
  atVer = 'punto'; toast('Llegada registrada'); pintarAtenciones();
};
$('#atLista').onclick = e => {
  const b = e.target.closest('[data-at]'); if (!b) return;
  const l = leerAtenciones(), x = l.find(y => y.id === b.dataset.id), a = b.dataset.at;
  if (a === 'salida') { atSaliendo = x.id; pintarAtenciones(); return; }
  if (a === 'sal-no') { atSaliendo = null; pintarAtenciones(); return; }
  if (a === 'seguir') x.seguir = !x.seguir;
  if (a === 'sal-ok') {
    x.sale = ahoraMs(); x.salida = $('#atSal').value; atSaliendo = null;
    if (x.salida === 'Derivado al 9-1-1') enviarAviso('seguridad', { tipo: 'Ambulancia en camino', texto: 'Bienestar derivó a una persona al 9-1-1: facilitar el acceso', comision: x.com, sede: '', donde: 'Punto de bienestar', por: yoNombre() });
    registrar('💚 Salida de bienestar', `${x.motivo} · ${x.salida}`); toast(x.salida === 'Derivado al 9-1-1' ? 'Salida guardada y Seguridad avisada para facilitar el acceso' : 'Salida guardada');
  }
  guardarComp('atenciones', l); pintarAtenciones();
};
