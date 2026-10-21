// =================== Comunicados, alarma de SOS, programa, comisiones en vivo, rondas, objetos perdidos y atenciones ===================
// Todo lo que deben ver otros equipos o coordinación va en claves "compartidas". En la versión real son tablas de Supabase en tiempo real.
const CLAVE_COMP = k => 'minume.compartido.' + k;
const leerComp = (k, d) => { try { const v = localStorage.getItem(CLAVE_COMP(k)); return v ? JSON.parse(v) : d; } catch { return d; } };
const guardarComp = (k, v) => { try { localStorage.setItem(CLAVE_COMP(k), JSON.stringify(v)); } catch {} };
const nuevoId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
// Hora del evento: siempre la de República Dominicana. Si en el Inicio está encendido "Simular día del evento", usa ese reloj.
function ahoraEvento() {
  try { const s = JSON.parse(localStorage.getItem('minume.portal.sim') || 'null'); if (s && s.desde) return new Date(new Date('2026-11-15T10:20:00-04:00').getTime() + (Date.now() - s.desde)); } catch {}
  return new Date();
}
const ahoraMs = () => ahoraEvento().getTime();
const FMT_DR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function partesDR(d) { const p = Object.fromEntries(FMT_DR.formatToParts(d).map(x => [x.type, x.value])); return { dia: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute }; }
const diaDR = ms => partesDR(new Date(ms)).dia;
const hoyDR = () => partesDR(ahoraEvento()).dia;
const horaDR = ms => new Date(ms).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Santo_Domingo' });
const haceMin = ms => { const m = Math.max(0, Math.round((ahoraMs() - ms) / 60000)); return m < 1 ? 'ahora mismo' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h ${m % 60} min`; };
const aMinutos = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
// Identificador de la persona en los datos compartidos: el interno (ref), nunca su código de acceso
const yoCod = () => estado.usuario ? (estado.usuario.ref ? 'r:' + estado.usuario.ref : estado.usuario.codigo) : null;
const yoNombre = () => estado.usuario ? estado.usuario.nombre : (estado.nombre || 'Sin nombre');
const esCoord = () => !!estado.usuario && estado.usuario.rol === 'coordinacion';
const SIS_DE_CODIGO = c => ({ AS: 'asistencia', CO: 'asistencia', SE: 'seguridad', TR: 'seguridad', BI: 'bienestar', EP: 'eventos', CG: 'coordinacion' })[String(c).slice(0, 2)];
const escribiendo = sec => { const a = document.activeElement; return !!a && sec.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };
function bajarCsv(nombre, filas) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + filas.map(f => f.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Descargado para abrir en Excel');
}

// Vibrar solo si la persona ya tocó la pantalla (el navegador lo exige)
const vibrar = p => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch {} };

// ---------- Sin internet ----------
function pintarRed() { const off = navigator.onLine === false; $('#redPill').hidden = !off; }
addEventListener('online', () => { pintarRed(); toast('Volvió el internet: lo pendiente se envía solo'); });
addEventListener('offline', () => { pintarRed(); toast('Sin internet: puedes seguir usando la página, todo se guarda en el teléfono'); });
