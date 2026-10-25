// ---------- Fotos de los invitados especiales ----------
// Eventos y Protocolo (y Coordinación general) adjuntan la foto de cada invitado para reconocerlo en la puerta.
// La foto se achica aquí mismo (JPEG de ~30 KB) y va a su propia tabla (minume_fotos). Solo se descargan las de los
// invitados que se están viendo, una vez por sesión; si alguien cambia una, el tiempo real avisa y se vuelve a pedir.
const fotos = new Map();            // clave → data URL (o null si no tiene)
const fotosPidiendo = new Set();
const claveFoto = id => 'inv.' + String(id).toLowerCase().replace(/[^a-z0-9_-]/g, '');
const puedeFoto = () => !!window.MINUME_RPC && (SISTEMA === 'eventos' || SISTEMA === 'coordinacion');
const fotoDe = id => fotos.get(claveFoto(id)) || null;

async function pedirFotos(ids) {
  if (!window.MINUME_RPC) return;
  const faltan = ids.map(claveFoto).filter(k => !fotos.has(k) && !fotosPidiendo.has(k)).slice(0, 40);
  if (!faltan.length) return;
  faltan.forEach(k => fotosPidiendo.add(k));
  try {
    const r = await window.MINUME_RPC('minume_foto_leer', { p_claves: faltan }) || {};
    faltan.forEach(k => fotos.set(k, r[k] || null));
    pintarInvitados();
  } catch {} finally { faltan.forEach(k => fotosPidiendo.delete(k)); }
}

// Achica la foto: lado largo de 480 px, recortada al centro en cuadrado para que la cara se vea bien en el círculo
async function achicarFoto(archivo) {
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = URL.createObjectURL(archivo); });
  const lado = Math.min(img.naturalWidth, img.naturalHeight), T = Math.min(480, lado);
  const c = document.createElement('canvas'); c.width = c.height = T;
  c.getContext('2d').drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, T, T);
  URL.revokeObjectURL(img.src);
  let q = 0.78, d = c.toDataURL('image/jpeg', q);
  while (d.length > 150000 && q > 0.4) { q -= 0.12; d = c.toDataURL('image/jpeg', q); }
  return d;
}

const elegirFoto = document.createElement('input'); elegirFoto.type = 'file'; elegirFoto.accept = 'image/*'; elegirFoto.hidden = true; document.body.appendChild(elegirFoto);
let fotoPara = null;
elegirFoto.addEventListener('change', async () => {
  const f = elegirFoto.files && elegirFoto.files[0], g = INV_LISTA.find(x => x.id === fotoPara); elegirFoto.value = '';
  if (!f || !g) return;
  toast('Subiendo la foto…');
  try {
    const d = await achicarFoto(f);
    await window.MINUME_RPC('minume_foto_guardar', { p_clave: claveFoto(g.id), p_data: d });
    fotos.set(claveFoto(g.id), d); pintarInvitados(); toast(`Foto de ${g.n} guardada`);
  } catch (e) { toast(navigator.onLine === false ? 'Sin internet: la foto no se pudo subir' : (e && e.message) || 'No se pudo subir la foto'); }
});

// Ver la foto en grande, con lo que hace falta para recibir al invitado
function verFoto(g) {
  const d = fotoDe(g.id); if (!d) return;
  const v = document.createElement('div'); v.className = 'sos-velo on push-velo foto-velo'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = `<div class="tarjeta"><img src="${d}" alt="Foto de ${esc(g.n)}"><b class="cond" style="font-size:26px">${esc(g.n)}</b><p>${esc(g.cargo)}<br>Saludar como <b>${esc(g.trato)}</b> · ${esc(g.puerta)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${puedeFoto() ? `<button class="boton sec" type="button" data-f="cambiar">📷 Cambiar foto</button><button class="boton sec" type="button" data-f="quitar">Quitar foto</button>` : ''}<button class="boton" type="button" data-f="cerrar">Cerrar</button></div></div>`;
  v.addEventListener('click', async e => {
    const b = e.target.closest('[data-f]'); if (!b && e.target !== v) return;
    v.remove();
    if (b && b.dataset.f === 'cambiar') { fotoPara = g.id; elegirFoto.click(); }
    if (b && b.dataset.f === 'quitar') { try { await window.MINUME_RPC('minume_foto_borrar', { p_clave: claveFoto(g.id) }); fotos.set(claveFoto(g.id), null); pintarInvitados(); toast('Foto quitada'); } catch (er) { toast(er.message || 'No se pudo quitar'); } }
  });
  document.body.appendChild(v);
}

$('#invLista').addEventListener('click', e => {
  const s = e.target.closest('[data-inv-subir]'); if (s) { fotoPara = s.dataset.invSubir; elegirFoto.click(); return; }
  const a = e.target.closest('[data-inv-foto]'); if (a) { const g = INV_LISTA.find(x => x.id === a.dataset.invFoto); if (g) verFoto(g); }
});
// otra persona cambió una foto: se vuelve a pedir
addEventListener('minume-foto', e => { const k = e.detail && e.detail.clave; if (k && fotos.has(k)) { fotos.delete(k); if ($('#invitados') && $('#invitados').offsetParent) pintarInvitados(); } });
