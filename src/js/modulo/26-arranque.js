// MINUME XVII · Pintar todo lo nuevo y mantenerlo al día · Albert Silvestre
// ---------- Pintar todo lo nuevo y mantenerlo al día ----------
function pintarNuevas() { pintarRed(); pintarBotonAlertas(); pintarBanner(); pintarComunicados(); pintarPrograma(); pintarComisVivo(); pintarRondas(); pintarObjetos(); pintarAtenciones(); pintarEventos(); pintarInvitados(); pintarAsientos(); pintarDatos(); }
addEventListener('storage', e => { if (e.key && e.key.startsWith('minume.compartido.') && e.key !== CLAVE_AVISOS) { pintarNuevas(); pintarCobertura(); if (estado.usuario) pintarTablero(); } });
setInterval(() => { if (!estado.usuario) return; demoLeer(); pintarBanner(); }, 4000);
setInterval(() => { if (!estado.usuario || document.hidden) return; pintarPrograma(); pintarComisVivo(); pintarRondas(); pintarAtenciones(); pintarEventos(); }, 30000);

// ---------- Arranque ----------
pintarListas(); pintarBitacora(); pintarRanking(); pintarTraslado(); elegirSede('todas');
if (estado.nombre) $('#nombre').value = estado.nombre;
if (estado.comision && (!estado.usuario || estado.usuario.rol === 'asistencia')) { elegida = estado.comision; paso(3); aplicarComision(); $$('.comi').forEach(x => x.classList.toggle('on', x.dataset.c === estado.comision)); $$('.etapa').forEach(x => x.classList.toggle('on', x.dataset.e === estado.etapa)); }
// Persona guardada pero sin sesión en el servidor (por ejemplo, de la versión con una sola sesión para todos): vuelve a entrar
if (estado.usuario && window.MINUME_TIENE_SESION && !window.MINUME_TIENE_SESION()) { estado.usuario = null; guardar('usuario', null); }
aplicarRol(); pintarCompartir(); pintarCasos();
// Entrada desde el Inicio de MINUME: #entrar=CODIGO/seccion entra con ese código; #seccion lleva directo a esa parte
const irDesdeHash = () => {
  const m = location.hash.match(/^#entrar=([A-Za-z0-9-]+)(?:\/([a-z-]+))?$/);
  let ir = location.hash.slice(1);
  if (m) {
    ir = m[2] || '';
    try { history.replaceState(null, '', urlSeccion(ir)); } catch {}
    const c = m[1].toUpperCase();
    // Viene de la bienvenida del Inicio: entra directo, sin mostrar el formulario (solo sale si el código falla).
    // Siempre se verifica otra vez: así la sesión es fresca y es la de ese código.
    $('#codigo').value = c; $('#entrada').classList.add('entrando');
    return Promise.resolve(entrar(c)).then(() => {
      if (!estado.usuario && INICIO_MINUME) return irAlInicio($('#codError').textContent || 'No se pudo entrar. Revisa tu código.');
      if (!INICIO_MINUME) $('#entrada').classList.remove('entrando');
      abrirDesdeEnlace(ir);
    });
  }
  abrirDesdeEnlace(ir);
};
// cada sección es su propia pantalla: el atajo abre solo esa (Mapa abre solo el mapa)
const abrirDesdeEnlace = ir => {
  const el = /^[a-z-]+$/.test(ir) && document.getElementById(ir);
  if (!el || !estado.usuario || el.classList.contains('sin-permiso')) return;
  if (window.NAV_LISTA) abrirSeccion(ir, { historia: false });
  else setTimeout(() => window.NAV_LISTA ? abrirSeccion(ir, { historia: false }) : el.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);
};
irDesdeHash();
addEventListener('hashchange', () => { if (location.hash.startsWith('#entrar=')) irDesdeHash(); });