// MINUME XVII · Avisos entre sistemas · Albert Silvestre
// ---------- Avisos entre sistemas ----------
// Lo único que comparten los tres sistemas. En la versión real es una tabla "avisos" en la misma base de Supabase,
// con tiempo real; en esta demo viaja por el navegador (abre los sistemas en el mismo navegador para verlo).
const CLAVE_AVISOS = 'minume.compartido.avisos';
const EST_AVISO = { nuevo: ['Enviado', 'amarillo'], visto: ['Visto', 'amarillo'], camino: ['En camino', ''], atencion: ['En atención', ''], resuelto: ['Resuelto', 'verde'], derivado: ['Derivado al 9-1-1', 'rojo'] };
const NOMBRE_SIS = { asistencia: 'Asistencia', seguridad: 'Seguridad', bienestar: 'Bienestar', eventos: 'Eventos y Protocolo', coordinacion: 'Coordinación' };
const CERRADO = a => a.estado === 'resuelto' || a.estado === 'derivado';
function leerAvisos() { try { return JSON.parse(localStorage.getItem(CLAVE_AVISOS) || '[]'); } catch { return []; } }
function guardarAvisos(l) { try { localStorage.setItem(CLAVE_AVISOS, JSON.stringify(l.slice(-80))); } catch {} }
const firmaDe = l => JSON.stringify(l.map(a => [a.id, a.estado]));
let firmaAvisos = firmaDe(leerAvisos());
function enviarAviso(para, datos) {
  const l = leerAvisos(), a = { id: 'av' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), para, de: SISTEMA === 'todo' ? 'asistencia' : SISTEMA, estado: 'nuevo', t: Date.now(), ...datos };
  l.push(a); guardarAvisos(l); firmaAvisos = firmaDe(l); return a;
}
function cambiarAviso(id, est) {
  const l = leerAvisos(), a = l.find(x => x.id === id); if (!a) return;
  a.estado = est; a.tCambio = Date.now(); if (estado.usuario) a.quien = `${estado.usuario.nombre.split(' ')[0]} (${NOMBRE_SIS[SISTEMA] || 'Coordinación'})`;
  guardarAvisos(l); firmaAvisos = firmaDe(l);
}
const avisosPara = s => leerAvisos().filter(a => a.para === s);
function filaAviso(a, acciones) {
  const [e, cl] = EST_AVISO[a.estado] || EST_AVISO.nuevo, lugar = a.salon ? 'Salón ' + a.salon : a.donde || a.sede || '';
  const der = acciones && !CERRADO(a) ? `<div class="estados">${acciones.filter(([k]) => k !== a.estado).map(([k, txt]) => `<button class="mini" data-acc="aviso" data-id="${a.id}" data-e="${k}">${txt}</button>`).join('')}</div>` : `<span class="chip ${cl}">${e}</span>`;
  return `<div class="pedido"><span class="punto-aviso ${a.estado}"></span><div><b>${esc(a.tipo)}${lugar ? ' · ' + esc(lugar) : ''}</b><small>${esc(a.texto)}${a.comision ? ' · ' + esc(a.comision) : ''} · ${esc(a.por || '')} · ${hora(a.t)}${acciones ? ' · ' + e : ''}${a.quien ? ' · ' + esc(a.quien) : ''}</small></div>${der}</div>`;
}
// Revisa si llegó algo nuevo para este sistema o si cambió algo que yo envié
function alCambiarAvisos() {
  const l = leerAvisos(), f = firmaDe(l); if (f === firmaAvisos) return;
  const antes = new Map(JSON.parse(firmaAvisos)); firmaAvisos = f; const u = estado.usuario;
  if (u) for (const a of l) {
    const prev = antes.get(a.id);
    if (!prev && a.para === SISTEMA) toast(`Nuevo aviso de ${NOMBRE_SIS[a.de] || a.de}: ${a.tipo}${a.salon ? ' · Salón ' + a.salon : ''}`);
    if (!prev && (a.para === SISTEMA || SISTEMA === 'coordinacion' || SISTEMA === 'todo') && esUrgente(a) && a.por !== u.nombre) alarmaSOS(a);
    else if (prev && prev !== a.estado && a.por === u.nombre) toast(`${NOMBRE_SIS[a.para]}: ${EST_AVISO[a.estado][0]}${a.quien ? ' · ' + a.quien : ''}`);
  }
  pintarTablero(); pintarCasos();
}
addEventListener('storage', e => { if (e.key === CLAVE_AVISOS) alCambiarAvisos(); });
setInterval(alCambiarAvisos, 2000);
