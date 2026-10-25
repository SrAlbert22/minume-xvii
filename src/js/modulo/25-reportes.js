// MINUME XVII · Reportes en PDF y Excel (plantilla de MINUME XVII) · Albert Silvestre
// ---------- Reportes en PDF y Excel (plantilla de MINUME XVII) ----------
window.toastMinume = toast;
const colorEquipo = () => SIS.color || (getComputedStyle(document.documentElement).getPropertyValue('--equipo') || '').trim() || '#0090fb';
const baseReporte = (titulo, archivo, extra) => ({ titulo, archivo: `${archivo}-${hoyDR()}`, equipo: SIS.nombre, color: colorEquipo(), letra: SIS.letra || 'M', autor: estado.usuario ? estado.usuario.nombre : '', nota: 'Datos de ejemplo · MINUME XVII', ...extra });
const tonoEstado = v => { v = String(v); return /Resuelto|Cubierto|En orden|Completa|Entregado|Apareció|Llegó|En su lugar|Terminó|En sesión|Sí, hay|Todos lo/.test(v) ? 'verde' : /Pendiente|Falta|Montando|Por empezar|Atrasada|Novedad|Incidencia|La buscan|Guardado|En el punto|Por llegar|receso/i.test(v) ? 'amarillo' : /Escalado|Sin nadie|Detenida|No pasó|problema|911|No vendrá/i.test(v) ? 'rojo' : null; };
const REPORTES = {
  rendimiento() { const r = window.reporteRendimiento(); return baseReporte(r.titulo, 'rendimiento', { subtitulo: r.subtitulo, resumen: r.resumen, columnas: r.columnas, filas: r.filas }); },
  bitacora() {
    const b = bitDelDia().map(x => x.b);
    return baseReporte(SISTEMA === 'asistencia' && estado.comision ? `Bitácora de comisión · ${estado.comision}` : 'Bitácora del equipo', 'bitacora', {
      resumen: [[b.length, 'registros'], [b.filter(x => x.estatus === 'pendiente').length, 'pendientes'], [b.filter(x => x.estatus === 'escalado').length, 'escalados'], [b.filter(x => (x.estatus || 'resuelto') === 'resuelto').length, 'resueltos']],
      columnas: [{ t: 'Hora', w: 11, pdf: 18 }, { t: 'Comisión', w: 11, pdf: 18 }, { t: 'Tipo', w: 22 }, { t: 'Situación', w: 46 }, { t: 'Impacto', w: 11, pdf: 18 }, { t: 'Acción', w: 30 }, { t: 'Área contactada', w: 24 }, { t: 'Estatus', w: 13, pdf: 22 }],
      filas: b.map(x => [x.hora, x.comision || '', x.tipo, x.texto, x.impacto || '', x.accion || '', x.area || '', ETIQ[x.estatus || 'resuelto']]), estadoCol: 7, estado: tonoEstado,
    });
  },
  cobertura() {
    cobEstado(); const { min } = cobAhora(), f = cobFilas(min).filter(x => x.est !== 'libre'), filas = [];
    for (const p of COB_PUNTOS) for (const t of p.turnos) for (const [cod, tarea] of t[3]) { const cf = estado.cob.conf[claveSlot(p, t) + '#' + cod]; filas.push([p.id, p.n, SEDES[p.sede].nombre, `${cobHora(t[0])} a ${cobHora(t[1])}`, t[2], `${cod} · ${cobNombre(cod)}`, tarea, cf != null ? `Llegó ${cobHora(cf)}` : (min >= t[0] && min < t[1] ? 'Falta' : '')]); }
    for (const r of estado.cob.refs) filas.push([r.punto, punto_nombre(r.punto), '', `Desde ${cobHora(r.desde)}`, 'Refuerzo', `${r.cod} · ${cobNombre(r.cod)}`, 'Refuerzo asignado', 'Refuerzo']);
    return baseReporte('Plan de cobertura de áreas', 'cobertura', {
      subtitulo: 'Cada punto del evento, sus turnos, quién debe estar y si confirmó que llegó.',
      resumen: [[`${f.filter(x => x.est === 'cubierta').length}/${f.length}`, 'puntos cubiertos ahora'], [f.filter(x => x.est === 'descubierta').length, 'puntos sin nadie'], [cobLibres(min).length, 'libres para reforzar'], [estado.cob.refs.length, 'refuerzos activos']],
      columnas: [{ t: 'Punto', w: 9, pdf: 16 }, { t: 'Lugar', w: 26 }, { t: 'Sede', w: 20, pdf: 30 }, { t: 'Horario', w: 14, pdf: 22 }, { t: 'Turno', w: 30 }, { t: 'Persona', w: 22 }, { t: 'Tarea', w: 34 }, { t: 'Llegó', w: 12, pdf: 20 }],
      filas, estadoCol: 7, estado: tonoEstado,
    });
  },
  rondas() {
    const l = leerRondas(), hoy = l.filter(x => diaDR(x.ini) === hoyDR()), filas = [];
    for (const x of l.slice().sort((a, b) => a.ini - b.ini)) { const r = RUTAS.find(y => y.id === x.ruta); r.puntos.forEach((p, i) => { const m = x.marcas[i]; filas.push([r.n, x.por, `${horaDR(x.ini)}${x.fin ? ' a ' + horaDR(x.fin) : ' (en curso)'}`, p, m ? horaDR(m.t) : '', m ? (m.ok ? 'En orden' : 'Incidencia') : 'No pasó', m ? m.nota : '', m && m.gps ? textoGps(m.gps).replace('', '') : '']); }); }
    const est = RUTAS.map(r => estadoRuta(r, l));
    return baseReporte('Rondas de seguridad', 'rondas', {
      resumen: [[hoy.length, 'rondas hoy'], [est.filter(e => e.k === 'atrasada').length, 'rutas atrasadas'], [hoy.reduce((s, x) => s + Object.values(x.marcas).filter(m => !m.ok).length, 0), 'incidencias'], [hoy.filter(x => x.fin && Object.keys(x.marcas).length < RUTAS.find(r => r.id === x.ruta).puntos.length).length, 'rondas con puntos saltados']],
      columnas: [{ t: 'Ruta', w: 28 }, { t: 'Hizo la ronda', w: 18 }, { t: 'Horario', w: 20, pdf: 30 }, { t: 'Punto', w: 22 }, { t: 'Hora', w: 10, pdf: 16 }, { t: 'Resultado', w: 12, pdf: 20 }, { t: 'Incidencia', w: 36 }, { t: 'Comprobación GPS', w: 30 }],
      filas, estadoCol: 5, estado: tonoEstado,
    });
  },
  objetos() {
    const l = leerObjetos().slice().sort((a, b) => b.t - a.t), EST = { guardado: 'Guardado', entregado: 'Entregado', buscando: 'La buscan', encontrado: 'Apareció' };
    return baseReporte('Objetos perdidos', 'objetos-perdidos', {
      resumen: [[l.filter(x => x.est === 'guardado').length, 'guardados'], [l.filter(x => x.est === 'buscando').length, 'personas buscando algo'], [l.filter(x => x.est === 'entregado').length, 'entregados'], [l.length, 'registros en total']],
      columnas: [{ t: 'Hora', w: 10, pdf: 16 }, { t: 'Objeto', w: 30 }, { t: 'Tipo', w: 20 }, { t: 'Dónde', w: 22 }, { t: 'Comisión', w: 10, pdf: 18 }, { t: 'Registró / lo busca', w: 20 }, { t: 'Guardado en', w: 26 }, { t: 'Estado', w: 12, pdf: 20 }, { t: 'Entregado a', w: 22 }],
      filas: l.map(x => [horaDR(x.t), x.que, x.cat, x.donde, x.com, x.tipo === 'buscado' ? `Lo busca ${x.quien}` : x.por, x.guarda || '', EST[x.est] || x.est, x.entregadoA ? `${x.entregadoA} · ${horaDR(x.tEnt)}` : '']), estadoCol: 7, estado: tonoEstado,
    });
  },
  atenciones() {
    const l = leerAtenciones().slice().sort((a, b) => a.llega - b.llega), hoy = l.filter(x => diaDR(x.llega) === hoyDR());
    return baseReporte('Registro de atenciones de Bienestar', 'atenciones-bienestar', {
      subtitulo: 'Documento confidencial: contiene datos de salud. Compártelo solo con el equipo de Bienestar y la coordinación general.',
      resumen: [[l.filter(x => !x.sale).length, 'en el punto ahora'], [hoy.length, 'atendidos hoy'], [hoy.filter(x => x.area === 'fisico').length, 'bienestar físico'], [hoy.filter(x => x.area === 'emocional').length, 'bienestar emocional'], [l.filter(x => x.seguir).length, 'requieren seguimiento']],
      columnas: [{ t: 'Llegó', w: 10, pdf: 15 }, { t: 'Área', w: 11, pdf: 18 }, { t: 'Nombre', w: 20 }, { t: 'Es', w: 11, pdf: 18 }, { t: 'Comisión', w: 10, pdf: 17 }, { t: 'Gravedad', w: 12, pdf: 18 }, { t: 'Motivo', w: 20 }, { t: 'Qué le pasa', w: 28 }, { t: 'Qué se hizo', w: 28 }, { t: 'Salió', w: 10, pdf: 15 }, { t: 'Cómo salió', w: 20 }, { t: 'Seguimiento', w: 11, pdf: 17 }],
      filas: l.map(x => [horaDR(x.llega), AT_AREA[x.area][0], x.nombre, x.persona, x.com, x.prio && PRIO[x.prio] ? PRIO[x.prio].n : '', x.motivo, x.que, x.hizo, x.sale ? horaDR(x.sale) : '', x.salida || 'En el punto', x.seguir ? 'Sí' : 'No']), estadoCol: 10, estado: tonoEstado,
    });
  },
  comunicados() {
    const l = leerComs().slice().sort((a, b) => b.t - a.t);
    return baseReporte('Comunicados de dirección', 'comunicados', {
      resumen: [[l.length, 'comunicados enviados'], [l.filter(m => m.tipo === 'urgente').length, 'urgentes'], [l.filter(m => { const r = rosterCom(m.para); return r.length && r.every(p => (m.leidos || {})[p.c]); }).length, 'leídos por todos']],
      columnas: [{ t: 'Hora', w: 10, pdf: 16 }, { t: 'Tipo', w: 12, pdf: 20 }, { t: 'Para', w: 20, pdf: 30 }, { t: 'Mensaje', w: 50 }, { t: 'Enviado por', w: 20 }, { t: 'Leído', w: 12, pdf: 18 }, { t: 'Falta por leer', w: 30 }],
      filas: l.map(m => { const r = rosterCom(m.para), le = m.leidos || {}, f = r.filter(p => !le[p.c]); return [horaDR(m.t), (COM_TIPO[m.tipo] || COM_TIPO.info)[0], COM_PARA[m.para] || m.para, m.texto, m.de, `${r.length - f.length} de ${r.length}`, f.length ? f.map(p => p.n).join(', ') : 'Todos lo leyeron']; }), estadoCol: 6, estado: tonoEstado,
    });
  },
  comisiones() {
    const o = leerComis();
    return baseReporte('Estado de las comisiones', 'comisiones', {
      resumen: Object.entries(EST_COM).slice(0, 4).map(([k, [t]]) => [COMISIONES.filter(([c]) => o[c] && o[c].est === k).length, t.toLowerCase()]).concat([[COMISIONES.filter(([c]) => !o[c]).length, 'sin reporte']]),
      columnas: [{ t: 'Comisión', w: 11, pdf: 20 }, { t: 'Nombre', w: 40 }, { t: 'Sede y salón', w: 28 }, { t: 'Estado', w: 20 }, { t: 'Delegados', w: 11, pdf: 20 }, { t: 'Quórum', w: 16 }, { t: 'Nota', w: 32 }, { t: 'Reportó', w: 24 }],
      filas: COMISIONES.map(([c, nom]) => { const d = o[c], a = ASIGNA[c], q = d ? quorum(d.total) : 0; return [c, nom, a ? `${SEDES[a[0]].corto} · ${a[1]}` : '', d ? EST_COM[d.est][0] : 'Sin reporte', d ? `${d.pres} de ${d.total}` : '', d ? (d.pres >= q ? 'Sí, hay quórum' : `Faltan ${q - d.pres}`) : '', d ? d.nota || '' : '', d ? `${d.por} · ${horaDR(d.t)}` : '']; }), estadoCol: 3, estado: tonoEstado,
    });
  },
  eventos() {
    const l = EV_LISTA.slice().sort((a, b) => (a.dia + a.i.padStart(5, '0')).localeCompare(b.dia + b.i.padStart(5, '0')));
    return baseReporte('Eventos del programa', 'eventos', {
      resumen: Object.entries(EST_EV).map(([k, [t]]) => [l.filter(e => estEv(e).est === k).length, t.toLowerCase()]).slice(1).concat([[l.filter(e => estEv(e).problema).length, 'con problema']]),
      columnas: [{ t: 'Día', w: 12, pdf: 20 }, { t: 'Horario', w: 14, pdf: 22 }, { t: 'Evento', w: 30 }, { t: 'Lugar', w: 24 }, { t: 'Responsable', w: 24 }, { t: 'Montaje desde', w: 12, pdf: 20 }, { t: 'Estado', w: 13, pdf: 20 }, { t: 'Problema', w: 34 }],
      filas: l.map(e => { const s = estEv(e); return [DIAS_PROG.find(([d]) => d === e.dia)[1], `${e.i} a ${e.f}`, e.n, e.lugar, e.resp, e.m, EST_EV[s.est][0], s.problema ? `${s.problema.tipo}${s.problema.nota ? ': ' + s.problema.nota : ''}` : '']; }), estadoCol: 6, estado: tonoEstado,
    });
  },
  asientos() {
    const e = EV_LISTA.find(x => x.id === asEvento) || evConPlano()[0], plano = planoDe(e), todo = leerAs(), sem = semillaAsientos(e);
    const l = plano.asientos.map(a => ({ a, s: estadoAs(e, a.id, todo, sem) })), cuenta = k => l.filter(x => x.s.est === k).length;
    return baseReporte(`Plano de asientos · ${e.n}`, `asientos-${e.n.toLowerCase().replace(/\s+/g, '-')}`, {
      subtitulo: `${DIAS_PROG.find(([d]) => d === e.dia)[1]} · ${e.i} a ${e.f} · ${plano.nombre} · capacidad ${plano.capacidad}`,
      resumen: Object.entries(EST_AS).map(([k, [t]]) => [cuenta(k), t.toLowerCase()]),
      columnas: [{ t: 'Asiento', w: 10, pdf: 18 }, { t: 'Zona', w: 18 }, { t: 'Estado', w: 14, pdf: 22 }, { t: 'Persona', w: 28 }, { t: 'Nota', w: 30 }, { t: 'Lo marcó', w: 16 }, { t: 'Hora', w: 9, pdf: 15 }],
      filas: l.filter(x => x.s.est !== 'libre').map(({ a, s }) => [a.id, a.zona, EST_AS[s.est][0], s.n || '', s.nota || '', s.por || '', s.t ? horaDR(s.t) : '']), estadoCol: 2, estado: v => /Ya se sentó|Asignado/.test(v) ? 'verde' : /Reservado/.test(v) ? 'amarillo' : '',
    });
  },
  invitados() {
    const ev = EV_LISTA.find(e => e.id === invEvento) || evConInvitados()[0], st = leerInv(), l = INV_LISTA.filter(g => g.ev === ev.id).sort((a, b) => aMinutos(a.ll) - aMinutos(b.ll));
    const EST = { llego: 'Llegó', sentado: 'En su lugar', no: 'No vendrá' }, vienen = l.filter(g => (st[g.id] || {}).est !== 'no');
    return baseReporte(`Invitados especiales · ${ev.n}`, `invitados-${ev.n.toLowerCase().replace(/\s+/g, '-')}`, {
      subtitulo: `${DIAS_PROG.find(([d]) => d === ev.dia)[1]} · ${ev.i} a ${ev.f} · ${ev.lugar}`,
      resumen: [[l.length, 'invitados'], [vienen.filter(g => ['llego', 'sentado'].includes((st[g.id] || {}).est)).length, 'ya llegaron'], [vienen.filter(g => (st[g.id] || {}).est === 'sentado').length, 'en su lugar'], [l.length - vienen.length, 'no vendrán']],
      columnas: [{ t: 'Llega', w: 9, pdf: 15 }, { t: 'Invitado', w: 24 }, { t: 'Cargo', w: 30 }, { t: 'Saludar como', w: 22 }, { t: 'Su lugar', w: 18 }, { t: 'Entra por', w: 22 }, { t: 'Le recibe', w: 13, pdf: 22 }, { t: 'Estado', w: 13, pdf: 22 }, { t: 'Nota', w: 34 }],
      filas: l.map(g => { const s = st[g.id] || {}; return [g.ll, g.n, g.cargo, g.trato, g.lugar, g.puerta, g.recibe, s.est ? `${EST[s.est]}${s.est !== 'no' ? ' ' + horaDR(s.t) : ''}` : 'Por llegar', g.nota]; }), estadoCol: 7, estado: tonoEstado,
    });
  },
};
document.addEventListener('click', e => {
  const b = e.target.closest('.exp-btns [data-fmt]'); if (!b) return;
  const id = b.closest('.exp-btns').dataset.exportar, hacer = REPORTES[id];
  if (hacer) window.exportarReporte(b.dataset.fmt, hacer());
});
