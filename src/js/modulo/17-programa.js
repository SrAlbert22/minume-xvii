// MINUME XVII · Programa del evento (de ejemplo) · Albert Silvestre
// ---------- Programa del evento (de ejemplo) ----------
const PROGRAMA = {
  '2026-11-14': [['15:00', '19:00', 'Montaje de salones', 'Jaragua y Sheraton', 'Staff'], ['17:00', '21:00', 'Acreditación de delegados', 'Lobby · Renaissance Jaragua', 'Delegados'], ['19:00', '20:00', 'Reunión general del staff', 'Anacaona · Jaragua', 'Staff'], ['20:00', '21:00', 'Recorrido de seguridad por la ruta Jaragua – Sheraton', 'Las dos sedes', 'Seguridad']],
  '2026-11-15': [['6:30', '7:00', 'Llegada del staff', 'Lobby · Renaissance Jaragua', 'Staff'], ['7:00', '7:30', 'Acreditación de delegados', 'Lobby · Renaissance Jaragua', 'Delegados'], ['7:30', '8:00', 'Movilización a pie al Sheraton', 'Puerta este del Jaragua', 'Comisiones del Sheraton'], ['8:00', '9:30', 'Ceremonia de apertura', 'Teatro La Fiesta · Jaragua', 'Todos'], ['9:30', '12:15', 'Primera sesión de comisiones', 'Cada comisión en su salón', 'Delegados'], ['12:30', '13:45', 'Almuerzo general', 'Malecón Terrace', 'Todos'], ['14:00', '18:15', 'Segunda sesión de comisiones', 'Cada comisión en su salón', 'Delegados'], ['18:30', '19:00', 'Regreso al Jaragua y cierre de jornada', 'Entrada oeste del Sheraton', 'Todos']],
  '2026-11-16': [['7:00', '7:30', 'Llegada del staff', 'Lobby · Renaissance Jaragua', 'Staff'], ['7:30', '8:00', 'Movilización a pie al Sheraton', 'Puerta este del Jaragua', 'Comisiones del Sheraton'], ['8:00', '12:15', 'Tercera sesión de comisiones', 'Cada comisión en su salón', 'Delegados'], ['12:30', '13:45', 'Almuerzo general', 'Malecón Terrace', 'Todos'], ['14:00', '16:30', 'Cuarta sesión y votaciones finales', 'Cada comisión en su salón', 'Delegados'], ['17:00', '19:00', 'Ceremonia de clausura y premiación', 'Teatro La Fiesta · Jaragua', 'Todos'], ['19:00', '20:00', 'Salida de delegados', 'Lobby · Renaissance Jaragua', 'Todos']],
};
const DIAS_PROG = [['2026-11-14', 'Sáb 14 nov'], ['2026-11-15', 'Dom 15 nov'], ['2026-11-16', 'Lun 16 nov']];
let progDia = null;
function pintarPrograma() {
  if (!$('#programa')) return;
  const { dia, min } = partesDR(ahoraEvento()), hoyHay = !!PROGRAMA[dia];
  if (!progDia) progDia = hoyHay ? dia : DIAS_PROG[0][0];
  $('#progDias').innerHTML = DIAS_PROG.map(([d, t]) => `<button data-d="${d}" class="${d === progDia ? 'on' : ''}">${t}${d === dia ? ' · hoy' : ''}</button>`).join('');
  const it = PROGRAMA[progDia], esHoy = progDia === dia;
  $('#progLista').innerHTML = it.map(([i, f, t, l, q]) => {
    const cl = esHoy ? (min >= aMinutos(i) && min < aMinutos(f) ? 'ahora' : min >= aMinutos(f) ? 'paso' : '') : dia > progDia ? 'paso' : '';
    return `<div class="prog-item ${cl}"><b>${i} – ${f}</b><div><strong>${t}</strong><small>${l} · ${q}</small></div>${cl === 'ahora' ? '<span class="chip verde">Ahora</span>' : ''}</div>`;
  }).join('');
  let ahoraTxt, luegoTxt;
  if (hoyHay) {
    const act = PROGRAMA[dia].filter(([i, f]) => min >= aMinutos(i) && min < aMinutos(f)), sig = PROGRAMA[dia].find(([i]) => aMinutos(i) > min);
    ahoraTxt = act.length ? act.map(([i, f, t, l]) => `<strong>${t}</strong><small>${i} a ${f} · ${l}</small>`).join('') : '<strong>Nada programado en este momento</strong>';
    luegoTxt = sig ? `<strong>${sig[2]}</strong><small>A las ${sig[0]} · ${sig[3]} · en ${aMinutos(sig[0]) - min} min</small>` : '<strong>Terminó el programa de hoy</strong>';
  } else if (dia < DIAS_PROG[0][0]) {
    const d = Math.ceil((new Date('2026-11-14T15:00:00-04:00') - ahoraEvento()) / 86400000);
    ahoraTxt = `<strong>Faltan ${d} días para MINUME XVII</strong><small>Empieza el sábado 14 de noviembre con el montaje</small>`;
    luegoTxt = `<strong>${PROGRAMA['2026-11-14'][0][2]}</strong><small>Sáb 14 · ${PROGRAMA['2026-11-14'][0][0]} · ${PROGRAMA['2026-11-14'][0][3]}</small>`;
  } else { ahoraTxt = '<strong>MINUME XVII terminó</strong>'; luegoTxt = '<strong>Gracias por tu trabajo</strong>'; }
  $('#progAhora').innerHTML = `<div class="tarjeta prog-ahora"><span class="chip verde">Ahora</span>${ahoraTxt}</div><div class="tarjeta prog-ahora"><span class="chip">Después</span>${luegoTxt}</div>`;
}
$('#progDias').onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; progDia = b.dataset.d; pintarPrograma(); };
