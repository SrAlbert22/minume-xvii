// MINUME XVII · Comisiones en vivo (Asistencia reporta, coordinación ve todas) · Albert Silvestre
// ---------- Comisiones en vivo (Asistencia reporta, coordinación ve todas) ----------
const EST_COM = { 'por-empezar': ['Por empezar', '#45c8ff'], faltan: ['Faltan delegados', '#ffd23f'], sesion: ['En sesión', '#2fd38c'], receso: ['En receso', '#a974ff'], detenida: ['Detenida por un problema', '#ff4d5e'], terminada: ['Terminó', '#8a96b8'] };
const totalDel = c => DELEGADOS.filter(d => d.com === c).length || 20;
const quorum = t => Math.floor(t / 2) + 1;
function leerComis() {
  let o = leerComp('comisiones', null); if (o) return o;
  // Ejemplo para que el tablero de coordinación no salga vacío (la comisión de María, AMS, la reporta ella)
  const t = ahoraMs(), ej = ['sesion', 'sesion', 'faltan', null, 'por-empezar', 'sesion', 'receso', 'sesion', 'sesion', 'detenida', 'sesion', 'sesion', 'por-empezar', 'sesion', 'terminada'];
  o = {}; COMISIONES.forEach(([c], i) => { const e = ej[i]; if (!e) return; const tot = totalDel(c); o[c] = { est: e, total: tot, pres: e === 'faltan' ? quorum(tot) - 2 : e === 'por-empezar' ? quorum(tot) - 1 : tot - (i % 2), t: t - (4 + i * 3) * 60000, por: 'Asistente de ejemplo', nota: e === 'detenida' ? 'El proyector no enciende; ya vienen de soporte' : '' }; });
  guardarComp('comisiones', o); return o;
}
function guardarComi(c, cambios, motivo) {
  const o = leerComis(), prev = o[c] || { est: 'por-empezar', total: totalDel(c), pres: 0 };
  o[c] = { ...prev, ...cambios, t: ahoraMs(), por: yoNombre() }; guardarComp('comisiones', o);
  if (motivo) registrar('Comisión', `${c}: ${motivo}`);
  pintarComisVivo(true);
}
function pintarComisVivo(forzar) {
  const sec = $('#comisiones-vivo'); if (!sec || !estado.usuario) return;
  if (!forzar && escribiendo(sec)) return;
  const o = leerComis(), u = estado.usuario;
  if (u.rol === 'coordinacion') {
    $('#cvTitulo').textContent = 'Comisiones en vivo';
    $('#cvLead').textContent = 'Cómo va cada comisión según su asistente: si ya empezó, si faltan delegados o si se detuvo. Se actualiza solo.';
    const filas = COMISIONES.map(([c, n]) => ({ c, n, d: o[c], asg: ASIGNA[c] }));
    const viejo = d => !d || ahoraMs() - d.t > 45 * 60000;
    const cuenta = k => filas.filter(f => f.d && f.d.est === k).length;
    const ordenEst = f => !f.d ? 1 : f.d.est === 'detenida' ? 0 : f.d.est === 'faltan' ? 1 : f.d.est === 'por-empezar' ? 2 : 3;
    $('#cvCuerpo').innerHTML = `<div style="margin-bottom:12px" class="ed-botones"><button class="boton sec ed-abrir" type="button" data-editar="comisiones"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>Editar salones y asistentes</button><div class="exp-btns" data-exportar="comisiones"><button class="boton sec exp" type="button" data-fmt="pdf"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7zM14 3v5h5M9.5 13h5M9.5 16.5h3.5"/></svg>PDF</button><button class="boton sec exp" type="button" data-fmt="xlsx"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16"/></svg>Excel</button></div></div><div class="cv-resumen">${Object.entries(EST_COM).map(([k, [t, col]]) => `<span class="chip" style="color:${col};border-color:${col}66">${cuenta(k)} · ${t}</span>`).join('')}<span class="chip">${filas.filter(f => !f.d).length} · Sin reporte</span></div>
      <div class="cv-grid">${filas.sort((a, b) => ordenEst(a) - ordenEst(b)).map(f => {
        const d = f.d, [t, col] = d ? EST_COM[d.est] : ['Sin reporte', '#6c7aa3'], q = d ? quorum(d.total) : 0;
        return `<div class="cv-card" style="--c:${col}"><div class="cv-card-cab"><b>${f.c}</b><span class="chip" style="color:${col};border-color:${col}66">${t}</span></div>
          <small>${f.asg ? `${SEDES[f.asg[0]].corto} · ${f.asg[1]}` : ''}${ASISTENTES[f.c] ? ` · Asistente: ${esc(ASISTENTES[f.c])}` : ''}</small>
          ${d ? `<div class="cv-num"><b>${d.pres}</b>/${d.total} delegados <span style="color:${d.pres >= q ? 'var(--verde)' : 'var(--amarillo)'}">${d.pres >= q ? '· hay quórum' : `· faltan ${q - d.pres} para quórum`}</span></div>
          ${d.nota ? `<p class="cv-nota">${esc(d.nota)}</p>` : ''}<small style="color:${viejo(d) ? 'var(--amarillo)' : 'var(--suave)'}">${esc(d.por)} · ${haceMin(d.t)}${viejo(d) ? ' · pide una actualización' : ''}</small>` : '<small style="color:var(--amarillo)">Su asistente todavía no ha reportado</small>'}
        </div>`;
      }).join('')}</div>`;
    return;
  }
  $('#cvTitulo').textContent = 'Mi comisión ahora';
  $('#cvLead').textContent = 'Dile a coordinación cómo va tu comisión y cuántos delegados hay en el salón. Coordinación ve todas las comisiones en vivo.';
  const c = estado.comision;
  if (!c) { $('#cvCuerpo').innerHTML = '<div class="tarjeta"><b>Primero escoge tu comisión</b><p class="cob-sub">Hazlo en Inicio y aquí podrás reportar cómo va.</p></div>'; return; }
  const d = o[c] || { est: null, total: totalDel(c), pres: 0, nota: '' }, q = quorum(d.total), asg = ASIGNA[c];
  const [tEst, col] = d.est ? EST_COM[d.est] : ['Sin reportar todavía', '#6c7aa3'];
  $('#cvCuerpo').innerHTML = `<div class="rejilla r2">
    <div class="tarjeta"><span class="chip">${c} · ${asg ? `${asg[1]} · ${SEDES[asg[0]].corto}` : ''}</span>
      <h3 class="cv-est" style="color:${col}">${tEst}</h3><small class="cob-sub" style="margin:0">${d.t ? 'Actualizaste ' + haceMin(d.t) : 'Toca cómo está tu comisión ahora'}</small>
      <div class="cv-estados">${Object.entries(EST_COM).map(([k, [t, cc]]) => `<button data-cv="est" data-e="${k}" class="${d.est === k ? 'on' : ''}" style="--c:${cc}">${t}</button>`).join('')}</div>
      <label for="cvNota">Nota para coordinación (opcional)</label><input id="cvNota" value="${esc(d.nota || '')}" placeholder="Qué pasó o qué falta">
    </div>
    <div class="tarjeta"><b class="cond" style="font-size:24px">Delegados en el salón</b>
      <div class="cv-contador"><button data-cv="menos" aria-label="Uno menos">−</button><div><b>${d.pres}</b><span>de <input id="cvTotal" type="number" min="1" max="200" value="${d.total}" aria-label="Total de delegados"></span></div><button data-cv="mas" aria-label="Uno más">+</button></div>
      <div class="cv-barra"><i style="width:${Math.min(100, d.pres / d.total * 100)}%;background:${d.pres >= q ? 'var(--verde)' : 'var(--amarillo)'}"></i><span class="cv-q" style="left:${q / d.total * 100}%"></span></div>
      <p style="font-weight:700;margin:10px 0 0;color:${d.pres >= q ? 'var(--verde)' : 'var(--amarillo)'}">${d.pres >= q ? `Hay quórum (mitad más uno: ${q})` : `Faltan ${q - d.pres} para el quórum (mitad más uno: ${q})`}</p>
      <p class="cob-sub">Cuenta a los delegados al empezar cada sesión y al volver del receso. Ajusta el quórum si el reglamento de tu comisión dice otra cosa.</p>
    </div></div>`;
}
$('#comisiones-vivo').addEventListener('click', e => {
  const b = e.target.closest('[data-cv]'); if (!b || !estado.comision) return;
  const c = estado.comision, d = leerComis()[c] || { total: totalDel(c), pres: 0 };
  if (b.dataset.cv === 'est') { guardarComi(c, { est: b.dataset.e, nota: $('#cvNota').value.trim() }, EST_COM[b.dataset.e][0]); toast(`Coordinación ya sabe: ${EST_COM[b.dataset.e][0].toLowerCase()}`); }
  if (b.dataset.cv === 'mas') guardarComi(c, { pres: Math.min(d.total, (d.pres || 0) + 1), est: d.est || 'por-empezar' });
  if (b.dataset.cv === 'menos') guardarComi(c, { pres: Math.max(0, (d.pres || 0) - 1), est: d.est || 'por-empezar' });
});
$('#comisiones-vivo').addEventListener('change', e => {
  if (!estado.comision) return;
  if (e.target.id === 'cvTotal') { const t = Math.max(1, Math.min(200, +e.target.value || 1)), d = leerComis()[estado.comision] || {}; guardarComi(estado.comision, { total: t, pres: Math.min(t, d.pres || 0), est: d.est || 'por-empezar' }); }
  if (e.target.id === 'cvNota') { const d = leerComis()[estado.comision] || {}; guardarComi(estado.comision, { nota: e.target.value.trim(), est: d.est || 'por-empezar' }); toast('Nota enviada a coordinación'); }
});
