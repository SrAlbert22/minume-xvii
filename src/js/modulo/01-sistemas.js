// MINUME XVII · sistemas del staff
// Autor: Albert Silvestre

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
// ---------- Sistemas independientes: una sola base de código, una página por equipo ----------
// Cada página fija window.MINUME_SISTEMA antes de cargar. Sin eso, esta es la demo con todos los equipos juntos.
const SISTEMA = window.MINUME_SISTEMA || 'todo';
const SISTEMAS = {
  todo: { nombre: 'Subsecretaría de Asistencia', roles: ['asistencia', 'acreditacion', 'seguridad', 'traslado', 'coordinacion'], letra: 'M' },
  asistencia: { nombre: 'Subsecretaría de Asistencia', roles: ['asistencia', 'coordinacion'], letra: 'A', color: '#00b5ff', prefijos: ['AS', 'CO'] },
  seguridad: { nombre: 'Seguridad y Traslado', roles: ['seguridad', 'traslado'], letra: 'S', color: '#e53535', prefijos: ['SE', 'TR'] },
  bienestar: { nombre: 'Bienestar', roles: ['bienestar'], letra: 'B', color: '#00fdef', prefijos: ['BI'] },
  eventos: { nombre: 'Eventos y Protocolo', roles: ['eventos'], letra: 'E', color: '#ffbeff', prefijos: ['EP'] },
  coordinacion: { nombre: 'Coordinación general', roles: ['coordinacion'], letra: 'C', color: '#0090fb', prefijos: ['CG'] },
};
const SIS = SISTEMAS[SISTEMA] || SISTEMAS.todo;
const PREF = SISTEMA === 'todo' ? 'minumeDemo.' : `minume.${SISTEMA}.`; // cada sistema guarda su sesión aparte
// ¿Se está viendo este pedazo? (pestaña al frente y su sección abierta). Los relojes de cada segundo lo revisan antes de trabajar.
const seVe = el => !document.hidden && !!el && el.offsetParent !== null;
const guardar = (k, v) => { try { localStorage.setItem(PREF + k, JSON.stringify(v)); } catch {} };
const leer = (k, d) => { try { const v = localStorage.getItem(PREF + k); return v ? JSON.parse(v) : d; } catch { return d; } };
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
