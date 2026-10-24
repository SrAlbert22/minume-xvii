// ---------- Códigos de acceso del staff (solo Coordinación general) ----------
// Los crea el servidor: el código completo se muestra una sola vez y en la base solo queda cifrado.
const TIPOS_CODIGO = [['AS', 'Asistente de comisión'], ['CO', 'Subsecretaría de Asistencia'], ['SE', 'Seguridad'], ['TR', 'Traslado'], ['BI', 'Bienestar'], ['EP', 'Eventos y Protocolo'], ['CG', 'Coordinación general']];
const puedeCodigos = () => !!window.MINUME_RPC && SISTEMA === 'coordinacion' && estado.usuario && estado.usuario.rol === 'coordinacion';
let listaCodigos = null;
async function pintarCodigos(recargar) {
  const caja = $('#codigosAcceso'); if (!caja) return;
  caja.hidden = !puedeCodigos(); if (caja.hidden) return;
  if (recargar || !listaCodigos) {
    try { listaCodigos = await window.MINUME_RPC('minume_codigos_lista', {}); }
    catch (e) { $('#codLista').innerHTML = `<p class="cob-sub">${navigator.onLine === false ? 'Sin internet: la lista de códigos se ve cuando vuelva la señal.' : esc(e.message)}</p>`; return; }
  }
  const q = ($('#codBuscar').value || '').toLowerCase().trim();
  const vista = listaCodigos.filter(k => !q || [k.nombre, k.prefijo, k.comision, k.area].join(' ').toLowerCase().includes(q));
  $('#codCuenta').textContent = `${listaCodigos.filter(k => k.activo).length} activos · ${listaCodigos.length} en total`;
  $('#codLista').innerHTML = vista.map(k => `<div class="cod-fila${k.activo ? '' : ' anulado'}"><span class="cod-pre">${k.prefijo}</span>
    <div><b>${esc(k.nombre)}${k.yo ? ' (tú)' : ''}</b><small>${esc((TIPOS_CODIGO.find(t => t[0] === k.prefijo) || ['', k.rol])[1])}${k.comision ? ' · ' + esc(k.comision) : ''}${k.area ? ' · ' + esc(k.area) : ''}${k.nivel === 'direccion' ? ' · <b style="color:var(--amarillo)">Dirección</b>' : ''} · ${k.usado ? 'entró ' + haceMin(Date.parse(k.usado)) : 'todavía no ha entrado'}</small></div>
    ${k.yo ? '' : `<span class="cod-acc">${k.activo && !['CO', 'CG'].includes(k.prefijo) ? `<button class="mini" type="button" data-nivel="${k.id}" data-a="${k.nivel === 'direccion' ? 'voluntario' : 'direccion'}">${k.nivel === 'direccion' ? 'Quitar dirección' : 'Hacer dirección'}</button>` : ''}<button class="mini" type="button" data-cod="${k.id}" data-activo="${k.activo ? 0 : 1}">${k.activo ? 'Anular' : 'Activar'}</button></span>`}</div>`).join('') || '<p class="cob-sub">Nadie coincide.</p>';
}
$('#codTipo').innerHTML = TIPOS_CODIGO.map(([p, n]) => `<option value="${p}">${p} · ${n}</option>`).join('');
$('#codComision').innerHTML = '<option value="">Comisión (si es asistente)</option>' + COMISIONES.map(([c]) => `<option>${c}</option>`).join('');
const ajustarCampos = () => { const t = $('#codTipo').value; $('#codComision').hidden = t !== 'AS'; $('#codArea').hidden = t !== 'BI'; $('#codNivel').hidden = ['CO', 'CG'].includes(t); };
$('#codTipo').onchange = ajustarCampos; ajustarCampos();
$('#codCrear').onclick = async () => {
  const nombre = $('#codNombre').value.trim(); if (!nombre) return $('#codNombre').focus();
  const b = $('#codCrear'); b.disabled = true;
  try {
    const r = await window.MINUME_RPC('minume_codigo_crear', { p_prefijo: $('#codTipo').value, p_nombre: nombre, p_area: $('#codArea').value, p_comision: $('#codComision').value, p_nivel: $('#codNivel').hidden ? 'direccion' : $('#codNivel').value });
    $('#codNuevo').hidden = false;
    $('#codNuevo').innerHTML = `<b>${esc(r.nombre)}</b><span class="cod-grande">${esc(r.codigo)}</span><small>Cópialo y entrégaselo en persona o por mensaje privado. Por seguridad no se vuelve a mostrar.</small><button class="mini" type="button" id="codCopiar">Copiar</button>`;
    $('#codCopiar').onclick = () => navigator.clipboard.writeText(r.codigo).then(() => toast('Código copiado'));
    $('#codNombre').value = ''; registrar('🔑 Código', `Nuevo código para ${r.nombre}`); pintarCodigos(true);
  } catch (e) { toast(e.message || 'No se pudo crear el código'); }
  b.disabled = false;
};
$('#codLista').onclick = async e => {
  const nv = e.target.closest('[data-nivel]');
  if (nv) {
    try { await window.MINUME_RPC('minume_codigo_nivel', { p_id: +nv.dataset.nivel, p_nivel: nv.dataset.a }); toast(nv.dataset.a === 'direccion' ? 'Ahora es dirección: ve todo su sistema y asigna' : 'Ahora es voluntario: ve solo lo suyo'); pintarCodigos(true); }
    catch (er) { toast(er.message || 'No se pudo cambiar'); }
    return;
  }
  const b = e.target.closest('[data-cod]'); if (!b) return;
  try { await window.MINUME_RPC('minume_codigo_activo', { p_id: +b.dataset.cod, p_activo: b.dataset.activo === '1' }); toast(b.dataset.activo === '1' ? 'Código activado' : 'Código anulado: esa persona ya no puede entrar'); pintarCodigos(true); }
  catch (er) { toast(er.message || 'No se pudo cambiar'); }
};
$('#codBuscar').oninput = () => pintarCodigos();
