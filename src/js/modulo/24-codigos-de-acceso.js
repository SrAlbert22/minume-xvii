// ---------- Códigos de acceso del staff (solo Coordinación general) ----------
// Los crea el servidor: el código completo se muestra una sola vez y en la base solo queda cifrado.
const TIPOS_CODIGO = [['AS', 'Asistente de comisión'], ['CO', 'Coordinación de Asistencia'], ['AC', 'Acreditación'], ['SE', 'Seguridad y Traslado (SE)'], ['TR', 'Seguridad y Traslado (TR)'], ['BI', 'Bienestar'], ['EP', 'Eventos y Protocolo'], ['CG', 'Dirección (Coordinación general)']];
const puedeCodigos = () => !!window.MINUME_RPC && SISTEMA === 'coordinacion' && estado.usuario && estado.usuario.rol === 'coordinacion';
let listaCodigos = null;
const esCodPrueba = k => k.creado_por === 'Prueba' || String(k.ref || '').startsWith('demo-');
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
  // Antes del evento: los códigos de prueba salen escritos en la página, así que cualquiera podría entrar con ellos
  let aviso = $('#codPrueba'); if (!aviso) { aviso = document.createElement('div'); aviso.id = 'codPrueba'; $('#codLista').before(aviso); }
  const pruebas = listaCodigos.filter(k => k.activo && esCodPrueba(k) && !k.yo);
  aviso.className = 'cod-prueba'; aviso.hidden = !pruebas.length;
  aviso.innerHTML = pruebas.length ? `<div><b>${pruebas.length} códigos de prueba siguen activos</b><small>Salen escritos en la página: cualquiera puede entrar con ellos. Anúlalos antes del 14 de noviembre.</small></div><button class="boton" type="button" id="codAnularPrueba">Anular los ${pruebas.length}</button>` : '';
  $('#codLista').innerHTML = vista.map(k => `<div class="cod-fila${k.activo ? '' : ' anulado'}"><span class="cod-pre">${k.prefijo}</span>
    <div><b>${esc(k.nombre)}${k.yo ? ' (tú)' : ''}${esCodPrueba(k) ? ' <span class="chip amarillo">prueba</span>' : ''}</b><small>${esc((TIPOS_CODIGO.find(t => t[0] === k.prefijo) || ['', k.rol])[1])}${k.comision ? ' · ' + esc(k.comision) : ''}${k.area ? ' · ' + esc(k.area) : ''}${k.nivel && k.nivel !== 'voluntario' ? ` · <b style="color:var(--amarillo)">${NIVELES[k.nivel] || k.nivel}</b>` : ''} · ${k.usado ? 'entró ' + haceMin(Date.parse(k.usado)) : 'todavía no ha entrado'}</small></div>
    ${k.yo ? '' : `<span class="cod-acc">${k.activo && k.prefijo !== 'CG' ? `<select class="cod-nivel" data-nivel="${k.id}" aria-label="Nivel de ${esc(k.nombre)}">${Object.entries(NIVELES).filter(([v]) => !(k.prefijo === 'CO' && v === 'voluntario')).map(([v, t]) => `<option value="${v}"${(k.nivel === 'direccion' ? 'subdirector' : k.nivel) === v ? ' selected' : ''}>${t}</option>`).join('')}</select>` : ''}<button class="mini" type="button" data-cod="${k.id}" data-activo="${k.activo ? 0 : 1}">${k.activo ? 'Anular' : 'Activar'}</button></span>`}</div>`).join('') || '<p class="cob-sub">Nadie coincide.</p>';
}
$('#codTipo').innerHTML = TIPOS_CODIGO.map(([p, n]) => `<option value="${p}">${p} · ${n}</option>`).join('');
$('#codComision').innerHTML = '<option value="">Comisión (si es asistente)</option>' + COMISIONES.map(([c]) => `<option>${c}</option>`).join('');
const ajustarCampos = () => { const t = $('#codTipo').value; $('#codComision').hidden = t !== 'AS'; $('#codArea').hidden = t !== 'BI'; $('#codNivel').hidden = t === 'CG'; const vol = $('#codNivel').querySelector('[value=voluntario]'); vol.hidden = vol.disabled = t === 'CO'; if (t === 'CO' && $('#codNivel').value === 'voluntario') $('#codNivel').value = 'coordinacion'; };
$('#codTipo').onchange = ajustarCampos; ajustarCampos();
$('#codCrear').onclick = async () => {
  const nombre = $('#codNombre').value.trim(); if (!nombre) return $('#codNombre').focus();
  const b = $('#codCrear'); b.disabled = true;
  try {
    const r = await window.MINUME_RPC('minume_codigo_crear', { p_prefijo: $('#codTipo').value, p_nombre: nombre, p_area: $('#codArea').value, p_comision: $('#codComision').value, p_nivel: $('#codNivel').hidden ? 'subdirector' : $('#codNivel').value });
    $('#codNuevo').hidden = false;
    $('#codNuevo').innerHTML = `<b>${esc(r.nombre)}</b><span class="cod-grande">${esc(r.codigo)}</span><small>Cópialo y entrégaselo en persona o por mensaje privado. Por seguridad no se vuelve a mostrar.</small><button class="mini" type="button" id="codCopiar">Copiar</button>`;
    $('#codCopiar').onclick = () => navigator.clipboard.writeText(r.codigo).then(() => toast('Código copiado'));
    $('#codNombre').value = ''; registrar('🔑 Código', `Nuevo código para ${r.nombre}`); pintarCodigos(true);
  } catch (e) { toast(e.message || 'No se pudo crear el código'); }
  b.disabled = false;
};
$('#codLista').onclick = async e => {
  const b = e.target.closest('[data-cod]'); if (!b) return;
  try { await window.MINUME_RPC('minume_codigo_activo', { p_id: +b.dataset.cod, p_activo: b.dataset.activo === '1' }); toast(b.dataset.activo === '1' ? 'Código activado' : 'Código anulado: esa persona ya no puede entrar'); pintarCodigos(true); }
  catch (er) { toast(er.message || 'No se pudo cambiar'); }
};
$('#codLista').onchange = async e => {
  const nv = e.target.closest('select[data-nivel]'); if (!nv) return;
  try { await window.MINUME_RPC('minume_codigo_nivel', { p_id: +nv.dataset.nivel, p_nivel: nv.value }); toast(nv.value === 'voluntario' ? 'Ahora es voluntario: ve solo lo suyo' : `Ahora es ${NIVELES[nv.value]}: ve todo su equipo y asigna`); }
  catch (er) { toast(er.message || 'No se pudo cambiar'); }
  pintarCodigos(true);
};
$('#codBuscar').oninput = () => pintarCodigos();
document.addEventListener('click', async e => {
  if (!e.target.closest('#codAnularPrueba')) return;
  const l = (listaCodigos || []).filter(k => k.activo && esCodPrueba(k) && !k.yo);
  if (!l.length || !confirm(`¿Anular los ${l.length} códigos de prueba? Nadie podrá volver a entrar con ellos (los puedes activar otra vez desde esta lista).`)) return;
  e.target.disabled = true; let ok = 0, error = '';
  for (const k of l) { try { await window.MINUME_RPC('minume_codigo_activo', { p_id: k.id, p_activo: false }); ok++; } catch (er) { error = er.message || 'No se pudo'; break; } }
  toast(error ? `Se anularon ${ok}. Se detuvo: ${error}` : `Se anularon los ${ok} códigos de prueba`);
  if (ok) registrar('🔑 Códigos', `Se anularon ${ok} códigos de prueba`);
  pintarCodigos(true);
});
