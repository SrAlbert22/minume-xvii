// ---------- Entrada con código y roles ----------
const CODIGOS = {
  'AS-4821': { nombre: 'María Pérez', rol: 'asistencia', comision: 'AMS', acr: 'ACR-7F3K2' },
  'AC-3307': { nombre: 'Carla Núñez', rol: 'acreditacion', acr: 'ACR-5K8CN' },
  'SE-1093': { nombre: 'Luis Gómez', rol: 'seguridad', acr: 'ACR-2H9QD' },
  'TR-5570': { nombre: 'Ana Rosario', rol: 'traslado', acr: 'ACR-5T7WX' },
  'CO-0001': { nombre: 'Beatriz Pérez', rol: 'coordinacion', acr: 'ACR-1C0RD' },
  'CG-0001': { nombre: 'Coordinación general', rol: 'coordinacion', acr: 'ACR-1C0RD' },
  'EP-2603': { nombre: 'Paola Ventura', rol: 'eventos', acr: 'ACR-1C0RD' },
  'BI-2207': { nombre: 'Sofía Matos', rol: 'bienestar', area: 'fisico', acr: 'ACR-8B1EN' },
  'BI-3318': { nombre: 'Marcos Peña', rol: 'bienestar', area: 'emocional', acr: 'ACR-8B1EN' },
  // Subdirección de prueba de cada equipo: entran directo a «Mi subdirección»
  'SE-4400': { nombre: 'Subdirección de Seguridad y Traslado', rol: 'seguridad', nivel: 'subdirector', acr: 'ACR-1C0RD' },
  'TR-4400': { nombre: 'Subdirección de Traslado', rol: 'traslado', nivel: 'subdirector', acr: 'ACR-1C0RD' },
  'BI-4400': { nombre: 'Subdirección de Bienestar', rol: 'bienestar', area: 'fisico', nivel: 'subdirector', acr: 'ACR-1C0RD' },
  'EP-4400': { nombre: 'Subdirección de Eventos y Protocolo', rol: 'eventos', nivel: 'subdirector', acr: 'ACR-1C0RD' },
  'AC-4400': { nombre: 'Subdirección de Acreditación', rol: 'acreditacion', nivel: 'subdirector', acr: 'ACR-1C0RD' },
};
const ROLES = { asistencia: ['Asistencia', '#45c8ff'], acreditacion: ['Acreditación', '#a974ff'], seguridad: ['Seguridad y Traslado', '#ff4d5e'], traslado: ['Seguridad y Traslado', '#ff4d5e'], coordinacion: ['Coordinación', '#ffd23f'], bienestar: ['Bienestar', '#2fd38c'], eventos: ['Eventos y Protocolo', '#f472b6'] };
// Niveles (como en la organización): Secretaría General (Coordinación general) → Subdirección (subsecretarios) → Coordinación → voluntarios.
// Subdirección y coordinación tienen la vista de administración de SU equipo: ven todo su sistema, asignan personas, turnos
// y refuerzos y editan los datos. El voluntario ve solo lo suyo. El nivel lo pone Coordinación general en cada código.
const NIVELES = { voluntario: 'Voluntario', coordinacion: 'Coordinación', subdirector: 'Subdirección' };
const esDir = () => !!estado.usuario && (estado.usuario.rol === 'coordinacion' || ['coordinacion', 'subdirector', 'direccion'].includes(estado.usuario.nivel));
const cargoDe = u => SISTEMA === 'coordinacion' ? 'Dirección' : u.nivel === 'subdirector' || u.nivel === 'direccion' ? 'Subdirección' : u.nivel === 'coordinacion' || u.rol === 'coordinacion' ? 'Coordinación' : '';
// Cada sistema solo deja entrar a sus equipos y solo muestra sus códigos de prueba
$$('#entrada .prueba button').forEach(b => { if (!SIS.roles.includes(CODIGOS[b.dataset.c].rol) || (SIS.prefijos && !SIS.prefijos.includes(b.dataset.c.slice(0, 2)))) b.remove(); });
if (SISTEMA !== 'todo') {
  document.title = `${SIS.nombre} · MINUME XVII`; $$('.cab .logo, #entrada .logo').forEach(l => l.textContent = SIS.letra);
  $('.cab small').textContent = SIS.nombre; document.documentElement.style.setProperty('--equipo', SIS.color);
  $('#entTxt').textContent = `Esta es la página de ${SIS.nombre}. Entra con tu código personal: la página sabe quién eres y qué te toca.`;
  $('#entSis').textContent = SIS.nombre; $('#entTitulo').textContent = SIS.nombre;
  $('.aviso-demo').textContent = `DEMO · ${SIS.nombre} · MINUME XVII · Sistema independiente: comparte solo la base de datos con los otros equipos · Datos de ejemplo`;
}
estado.usuario = leer('usuario', null);
// El código se verifica en el servidor (Supabase). Solo los códigos de prueba de la demo sin base de datos se revisan aquí.
async function entrar(cod) {
  const c = (cod || '').trim().toUpperCase(), pre = c.slice(0, 2);
  if (SIS.prefijos && !SIS.prefijos.includes(pre)) { $('#codError').textContent = `Este es el sistema de ${SIS.nombre}: tu código es de otro equipo. Entra desde el Inicio de MINUME.`; return; }
  let u = null;
  if (window.MINUME_ENTRAR && pre !== 'AC') {
    const b = $('#bEntrar'), txt = b.textContent; b.disabled = true; b.textContent = 'Verificando…';
    const r = await window.MINUME_ENTRAR(c);
    b.textContent = txt; b.disabled = false;
    if (r.sinRed) { $('#codError').textContent = 'Sin internet. Para entrar la primera vez en este teléfono hace falta conexión.'; return; }
    if (r.error) { $('#codError').textContent = r.error; return; }
    u = { nombre: r.nombre, rol: r.rol, comision: r.comision || undefined, area: r.area || undefined, acr: r.acr || undefined, ref: r.ref, nivel: r.nivel || 'voluntario' };
  } else u = CODIGOS[c] || null;
  if (!u) { $('#codError').textContent = 'Ese código no existe o ya caducó. Pídele uno a coordinación.'; return; }
  if (!SIS.roles.includes(u.rol)) { if (window.MINUME_SALIR) window.MINUME_SALIR(); $('#codError').textContent = `Ese código es del equipo de ${ROLES[u.rol][0]}: entra en su propia página.`; return; }
  estado.usuario = { ...u, codigo: c }; guardar('usuario', estado.usuario); aplicarRol(); scrollTo(0, 0);
}
// Si la sesión vence o coordinación anula el código, se vuelve a pedir
addEventListener('minume-yo', e => { const u = estado.usuario, y = e.detail || {}; if (!u || !y.nivel || u.nivel === y.nivel) return; const antes = u.nivel; u.nivel = y.nivel; guardar('usuario', u); aplicarRol(); if (antes) toast(y.nivel === 'voluntario' ? 'Tu acceso cambió a voluntario' : `Ahora tienes el panel de ${NIVELES[y.nivel] || 'administración'}`); });
addEventListener('minume-sesion-vencida', () => { if (!estado.usuario) return; estado.usuario = null; guardar('usuario', null); aplicarRol(); toast('Tu sesión venció o tu código fue anulado. Vuelve a entrar con tu código.'); });
function aplicarRol() {
  const u = estado.usuario;
  $('#entrada').classList.toggle('oculta', !!u);
  if (!u) return;
  if (!u.acr && CODIGOS[u.codigo]) u.acr = CODIGOS[u.codigo].acr; // sesiones guardadas antes de que existiera el gafete
  const [txt, color] = ROLES[u.rol];
  document.body.classList.toggle('es-dir', esDir());
  $('#rolChip').textContent = SISTEMA === 'coordinacion' ? 'Dirección · Coordinación general' : u.rol === 'coordinacion' || esDir() ? cargoDe(u) : u.nombre.split(' ')[0];   // el nombre del equipo ya sale al lado del logo $('#rolChip').style.color = color; $('#rolChip').style.borderColor = color + '88';
  $$('[data-roles]').forEach(el => el.classList.toggle('sin-permiso', !el.dataset.roles.split(' ').includes(u.rol)));
  enlaces.forEach((a, i) => a.classList.toggle('sin-permiso', secciones[i].classList.contains('sin-permiso')));
  if (u.rol === 'asistencia') {
    estado.nombre = u.nombre; guardar('nombre', u.nombre); $('#nombre').value = u.nombre;
    if (!estado.comision) { estado.comision = u.comision; guardar('comision', u.comision); }
    elegida = estado.comision; paso(2); $$('.comi').forEach(x => x.classList.toggle('on', x.dataset.c === estado.comision)); paso(3); aplicarComision();
  }
  document.documentElement.style.setProperty('--equipo', color);
  const H = (HERO_SIS[SISTEMA] || {})[u.rol] || HERO[u.rol];
  if (SISTEMA !== 'todo' && SISTEMA !== 'asistencia') { $('#bitacora h2').textContent = 'Bitácora del equipo'; $('#bitacora .lead').textContent = 'Lo importante del día: qué pasó, qué se hizo, con quién y cómo quedó. Toca el estatus para cambiarlo.'; }
  $('.hero .chip').textContent = `${txt} · MINUME XVII`; $('.hero h1').textContent = H[0]; $('.hero .sub').textContent = H[1]; $('.hero .lead').textContent = H[2];
  $('#miPanel').hidden = true; $('#flujo').style.display = '';
  reordenar(u.rol);
  if ($('#cAdmin')) $('#cAdmin').hidden = !esDir();
  if (window.NAV_LISTA) modoApp();
  if (!capasListas) { capasListas = true; ({ seguridad: ['vivo'], traslado: ['vivo'], coordinacion: ['vivo'] }[u.rol] || []).forEach(c => { if (!capas[c]) activarCapa(c); }); if (u.rol === 'acreditacion') mostrarLugar('j-lobby', 'Acreditación · Lobby del Jaragua'); }
  pintarCompartir(); setTimeout(iniciarMapaVivo, 150); setTimeout(pedirPermisosAlEntrar, 900); espia(); pintarGafete(); pintarLlegadas(); pintarBienvenida(); pintarTablero(); pintarDelegados(); pintarCasos(); pintarCobertura(); pintarNuevas();
}
let capasListas = false;
const HERO = {
  asistencia: ['Asistencia', 'EQUIPO DE ASISTENCIA DE COMISIÓN', 'Que tu comisión esté lista, acompañada y funcionando. Aquí ves tu turno, cómo llegar a tu salón y pides lo que falte con un toque.'],
  acreditacion: ['Acreditación', 'EQUIPO DE ACREDITACIÓN', 'Recibe a cada delegado: escanea su QR, revisa sus datos y confirma. Funciona aunque se vaya el internet.'],
  seguridad: ['Seguridad y Traslado', 'SUBDIRECCIÓN DE SEGURIDAD Y TRASLADO', 'Todo el evento en vivo: el staff en el mapa, los puntos y sus turnos, las rondas, las 18 regionales y las alertas.'],
  traslado: ['Seguridad y Traslado', 'SUBDIRECCIÓN DE SEGURIDAD Y TRASLADO', 'Todo el evento en vivo: el staff en el mapa, los puntos y sus turnos, las rondas, las 18 regionales y las alertas.'],
  coordinacion: ['Coordinación', 'DIRECCIÓN · COORDINACIÓN GENERAL', 'Lo ves todo: cada equipo, cada sede, las movilizaciones, las alertas y lo que piden los salones.'],
  eventos: ['Eventos y Protocolo', 'EVENTOS Y PROTOCOLO', 'Cada ceremonia y actividad del día, paso a paso, los invitados especiales y el plano de asientos de cada evento.'],
  bienestar: ['Bienestar', 'EQUIPO DE BIENESTAR', 'Los casos en vivo con su triaje: quién necesita ayuda, qué tan grave es, dónde está y quién lo atiende. Con alergias, expedientes y protocolos.'],
};
const HERO_SIS = { coordinacion: { coordinacion: ['Coordinación general', 'DIRECCIÓN · COORDINACIÓN GENERAL', 'Todo el evento en un solo lugar: comunicados, comisiones, cobertura de seguridad, rondas, bienestar, objetos perdidos y avisos.'] }, asistencia: { coordinacion: ['Coordinación', 'COORDINACIÓN DE ASISTENCIA A COMISIONES', 'Las incidencias que reportan los asistentes, los pedidos de los salones y el avance de cada comisión.'] } };
// Cada equipo ve sus secciones en su propio orden; las demás no existen para él
const ORDEN = {
  asistencia: ['inicio', 'chat', 'comunicados', 'comisiones-vivo', 'empieza', 'mi-comision', 'listas', 'sesion', 'incidencias', 'bitacora', 'programa', 'objetos', 'bolsillo', 'mapa', 'ubicacion', 'cumplimiento', 'mejoras'],
  acreditacion: ['inicio', 'chat', 'comunicados', 'delegados', 'mapa', 'ubicacion', 'programa', 'bitacora', 'mejoras'],
  seguridad: ['inicio', 'chat', 'comunicados', 'cobertura', 'rondas', 'mapa', 'ubicacion', 'seguridad', 'incidencias', 'traslado', 'objetos', 'programa', 'bitacora', 'mejoras'],
  traslado: ['inicio', 'chat', 'comunicados', 'traslado', 'cobertura', 'mapa', 'ubicacion', 'programa', 'objetos', 'bitacora', 'mejoras'],
  coordinacion: ['inicio', 'chat', 'datos', 'rendimiento', 'comunicados', 'comisiones-vivo', 'eventos', 'invitados', 'asientos', 'cobertura', 'rondas', 'atenciones', 'objetos', 'programa', 'delegados', 'mapa', 'ubicacion', 'seguridad', 'traslado', 'incidencias', 'bitacora', 'listas', 'sesion', 'mi-comision', 'empieza', 'bolsillo', 'cumplimiento', 'mejoras'],
  eventos: ['inicio', 'chat', 'comunicados', 'cobertura', 'eventos', 'invitados', 'asientos', 'programa', 'objetos', 'mapa', 'bitacora'],
  bienestar: ['inicio', 'chat', 'comunicados', 'cobertura', 'casos', 'atenciones', 'protocolos', 'punto', 'programa', 'objetos', 'mapa', 'ubicacion', 'bitacora'],
};
// En los sistemas separados, cada equipo ve solo lo suyo (nada de delegados ni checklists de otros)
const ORDEN_SIS = {
  asistencia: { coordinacion: ['inicio', 'chat', 'comunicados', 'comisiones-vivo', 'incidencias', 'bitacora', 'listas', 'sesion', 'mi-comision', 'empieza', 'bolsillo', 'cumplimiento', 'programa', 'objetos', 'mapa', 'ubicacion', 'mejoras'] },
  seguridad: { seguridad: ['inicio', 'chat', 'comunicados', 'cobertura', 'rondas', 'mapa', 'ubicacion', 'seguridad', 'traslado', 'objetos', 'programa', 'bitacora'], traslado: ['inicio', 'chat', 'comunicados', 'cobertura', 'rondas', 'mapa', 'ubicacion', 'seguridad', 'traslado', 'objetos', 'programa', 'bitacora'] },
  coordinacion: { coordinacion: ['inicio', 'chat', 'datos', 'rendimiento', 'comunicados', 'comisiones-vivo', 'eventos', 'invitados', 'asientos', 'cobertura', 'rondas', 'atenciones', 'objetos', 'programa', 'mapa', 'ubicacion', 'seguridad', 'traslado', 'incidencias', 'bitacora'] },
};
function reordenar(rol) {
  const main = $('main'), rail = $('#rail'), base = (ORDEN_SIS[SISTEMA] || {})[rol] || ORDEN[rol];
  // La dirección de cada equipo suma «Reportes» (solo de su equipo); el voluntario no lo ve
  let orden = esDir() && $('#reportes') && !base.includes('reportes') ? [...base.slice(0, 3), 'reportes', ...base.slice(3)] : base;
  // La subdirección y la coordinación de cada equipo tienen su panel, justo después del inicio
  if (veSubdireccion() && $('#subdireccion')) orden = ['inicio', 'subdireccion', ...orden.filter(id => id !== 'inicio' && id !== 'subdireccion')];
  orden.forEach(id => { main.appendChild($('#' + id)); const a = rail.querySelector(`a[href="#${id}"]`); if (a) rail.appendChild(a); });
  $$('main > section').forEach(sec => { if (!orden.includes(sec.id)) sec.classList.add('sin-permiso'); });
  let n = 0;
  orden.forEach(id => { if (id === 'inicio' || id === 'mejoras' || $('#' + id).classList.contains('sin-permiso')) return; const t = String(++n).padStart(2, '0'); const sp = $(`#${id} .titulo-sec .n`); if (sp) sp.textContent = t; const a = rail.querySelector(`a[href="#${id}"] span`); if (a) a.textContent = t; });
  enlaces = $$('#rail a'); secciones = enlaces.map(a => $(a.getAttribute('href')));
  enlaces.forEach((a, i) => a.classList.toggle('sin-permiso', secciones[i].classList.contains('sin-permiso')));
}
$('#bEntrar').onclick = () => entrar($('#codigo').value);
$('#codigo').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#bEntrar').disabled) entrar($('#codigo').value); });
// Entrada: escribe el guion solo, reconoce el equipo por las dos letras y avisa si el código es de otro sistema
const EQUIPO_PREF = { AS: 'Asistente de comisión', CO: 'Coordinación de Asistencia', SE: 'Seguridad y Traslado', TR: 'Seguridad y Traslado', BI: 'Bienestar', EP: 'Eventos y Protocolo', CG: 'Coordinación general', AC: 'Acreditación' };
const SIS_PREF = { AS: 'asistencia', CO: 'asistencia', AC: 'acreditacion', SE: 'seguridad', TR: 'seguridad', BI: 'bienestar', EP: 'eventos', CG: 'coordinacion' };
const INICIO_MINUME = window.MINUME_INICIO || '';
if (INICIO_MINUME) { $('#entVolver').href = INICIO_MINUME; $('#entVolver').hidden = false; }
function revisarCodigo() {
  const i = $('#codigo'); let v = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  v = v.slice(0, 2).replace(/[^A-Z]/g, '') + (v.length > 2 ? '-' + v.slice(2).slice(0, 8) : '');
  if (i.value !== v) i.value = v;
  $('#codError').textContent = '';
  const pre = v.slice(0, 2), completo = /^[A-Z]{2}-[A-Z0-9]{4,8}$/.test(v), eq = EQUIPO_PREF[pre];
  const deAqui = !SIS.prefijos || SIS.prefijos.includes(pre);
  let h = 'Son dos letras de tu equipo, un guion y el resto de tu código. Ejemplo: ' + (SIS.prefijos ? SIS.prefijos[0] : 'AS') + '-7KQ2MX.';
  if (pre.length === 2 && !eq) h = '<i style="background:var(--rojo)"></i>Esas dos letras no son de ningún equipo.';
  else if (eq && deAqui) h = `<i style="background:var(--verde)"></i>${eq}${completo ? '' : ' · falta el resto del código'}`;
  else if (eq) h = `<i style="background:var(--amarillo)"></i>Ese código es de ${eq}, no de este sistema.${INICIO_MINUME ? ` <a href="${INICIO_MINUME}">Ir al Inicio</a>` : ''}`;
  $('#entDetecta').innerHTML = h;
  $('#bEntrar').disabled = !(completo && eq && deAqui);
  $('#entOk').hidden = $('#bEntrar').disabled;
}
$('#codigo').addEventListener('input', revisarCodigo);
new MutationObserver(() => { if ($('#codError').textContent) { const f = $('#entForm'); f.classList.remove('sacude'); void f.offsetWidth; f.classList.add('sacude'); } }).observe($('#codError'), { childList: true, characterData: true, subtree: true });
const redEntrada = () => { $('#entRed').hidden = navigator.onLine !== false; };
addEventListener('online', redEntrada); addEventListener('offline', redEntrada); redEntrada();
// Botón para volver arriba
addEventListener('scroll', () => $('#subir').classList.toggle('on', scrollY > 600), { passive: true });
$('#subir').onclick = () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
$$('#entrada .prueba button').forEach(b => b.onclick = () => { $('#codigo').value = b.dataset.c; revisarCodigo(); entrar(b.dataset.c); });
$('#bSalir').onclick = () => { dejarCompartir(); if (window.MINUME_SALIR) window.MINUME_SALIR(); try { Object.keys(localStorage).filter(k => k.startsWith(PREF)).forEach(k => localStorage.removeItem(k)); } catch {} location.reload(); };
