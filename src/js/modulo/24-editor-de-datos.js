// MINUME XVII · Albert Silvestre
// =================== Datos editables: cronogramas, asignaciones y listas del evento ===================
// Los datos de ejemplo se pueden cambiar desde la página. Lo editado se guarda en claves compartidas
// ("config.*"); en la versión real son tablas de Supabase y todos lo ven al instante.
const ASISTENTES = {}; // comisión → asistente asignado
const CFG = k => 'config.' + k;
const aHora = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})/); return m ? `${+m[1]}:${m[2]}` : ''; };
const aInputHora = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
const SEDE_OPC = () => Object.entries(SEDES).map(([k, s]) => [k, s.nombre]);
// Listas de textos: una fila por texto. Las agrupadas llevan además a qué lista pertenece cada texto.
const listaSimple = (arr, titulo, quien, ayuda, campo = 'Texto') => ({ titulo, icono: 'lista', quien, ayuda,
  campos: [{ k: 't', t: campo, req: 1, ancho: 4 }],
  leer: () => arr.map(t => ({ t })), aplicar: recs => arr.splice(0, arr.length, ...recs.map(r => String(r.t || '').trim()).filter(Boolean)) });
const listaGrupos = (obj, grupos, titulo, quien, ayuda, campo = 'Texto') => ({ titulo, icono: 'lista', quien, ayuda,
  campos: [{ k: 'g', t: 'Lista', tipo: 'opc', opc: () => grupos, req: 1 }, { k: 't', t: campo, req: 1, ancho: 3 }],
  leer: () => grupos.flatMap(([g]) => (obj[g] || []).map(t => ({ g, t }))),
  aplicar: recs => { for (const [g] of grupos) { const l = obj[g] || (obj[g] = []); l.splice(0, l.length, ...recs.filter(r => r.g === g).map(r => String(r.t || '').trim()).filter(Boolean)); } } });
const TIPOS_EV = [['ceremonia', 'Ceremonia'], ['comida', 'Comida'], ['cultura', 'Cultural'], ['registro', 'Registro'], ['foto', 'Foto oficial'], ['reunion', 'Reunión']];
const DATOS = {
  programa: {
    titulo: 'Programa del evento', icono: 'reloj', quien: ['coordinacion'],
    ayuda: 'La agenda que ve todo el staff en «Programa». Cada fila es una actividad.',
    campos: [{ k: 'dia', t: 'Día', tipo: 'opc', opc: () => DIAS_PROG, req: 1 }, { k: 'i', t: 'Empieza', tipo: 'hora', req: 1 }, { k: 'f', t: 'Termina', tipo: 'hora', req: 1 }, { k: 'titulo', t: 'Actividad', req: 1, ancho: 2 }, { k: 'lugar', t: 'Lugar' }, { k: 'para', t: 'Para', tipo: 'opc', opc: () => ['Todos', 'Staff', 'Delegados', 'Seguridad', 'Mesa directiva'].map(x => [x, x]) }],
    leer: () => Object.entries(PROGRAMA).flatMap(([dia, l]) => l.map(([i, f, titulo, lugar, para]) => ({ dia, i, f, titulo, lugar, para }))),
    aplicar: recs => { Object.keys(PROGRAMA).forEach(d => { PROGRAMA[d] = []; }); recs.forEach(r => (PROGRAMA[r.dia] = PROGRAMA[r.dia] || []).push([r.i, r.f, r.titulo, r.lugar || '', r.para || 'Todos'])); Object.values(PROGRAMA).forEach(l => l.sort((a, b) => aMinutos(a[0]) - aMinutos(b[0]))); },
  },
  eventos: {
    titulo: 'Eventos y su horario', icono: 'bandera', quien: ['eventos', 'coordinacion'],
    ayuda: 'Cada ceremonia o actividad con su montaje, horario, lugar y responsable.',
    campos: [{ k: 'dia', t: 'Día', tipo: 'opc', opc: () => DIAS_PROG, req: 1 }, { k: 'n', t: 'Evento', req: 1, ancho: 2 }, { k: 'tipo', t: 'Tipo', tipo: 'opc', opc: () => [['ceremonia', 'Ceremonia'], ['comida', 'Comida'], ['cultura', 'Cultural'], ['registro', 'Registro'], ['foto', 'Foto'], ['reunion', 'Reunión']] }, { k: 'lugar', t: 'Lugar', req: 1 }, { k: 'm', t: 'Montaje desde', tipo: 'hora' }, { k: 'i', t: 'Empieza', tipo: 'hora', req: 1 }, { k: 'f', t: 'Termina', tipo: 'hora', req: 1 }, { k: 'resp', t: 'Responsable' }, { k: 'vip', t: 'Con invitados especiales', tipo: 'si' }],
    leer: () => EV_LISTA.map(e => ({ ...e })),
    aplicar: recs => EV_LISTA.splice(0, EV_LISTA.length, ...recs.map(r => ({ ...r, id: r.id || nuevoId('v'), tipo: r.tipo || 'reunion', m: r.m || r.i }))),
  },
  invitados: {
    titulo: 'Invitados especiales', icono: 'gente', quien: ['eventos', 'coordinacion'],
    ayuda: 'Quién viene a cada evento, cómo saludarle, dónde se sienta y quién le recibe.',
    campos: [{ k: 'ev', t: 'Evento', tipo: 'opc', opc: () => EV_LISTA.map(e => [e.id, `${e.n} · ${(DIAS_PROG.find(([d]) => d === e.dia) || ['', e.dia])[1]}`]), req: 1, ancho: 2 }, { k: 'n', t: 'Nombre', req: 1 }, { k: 'cargo', t: 'Cargo' }, { k: 'trato', t: 'Saludar como' }, { k: 'lugar', t: 'Su lugar' }, { k: 'll', t: 'Llega', tipo: 'hora' }, { k: 'puerta', t: 'Entra por' }, { k: 'recibe', t: 'Le recibe' }, { k: 'nota', t: 'Nota', ancho: 2 }],
    leer: () => INV_LISTA.map(g => ({ ...g })),
    aplicar: recs => INV_LISTA.splice(0, INV_LISTA.length, ...recs.map(r => ({ ...r, id: r.id || nuevoId('g') }))),
  },
  comisiones: {
    titulo: 'Comisiones, salones y asistentes', icono: 'bandera', quien: ['coordinacion'],
    ayuda: 'Cada comisión con su nombre, dónde sesiona y qué asistente la acompaña. Puedes agregar comisiones nuevas.',
    campos: [{ k: 'com', t: 'Siglas', req: 1, mayus: 1, soloViejo: 1 }, { k: 'nombre', t: 'Nombre completo', req: 1, ancho: 2 }, { k: 'sede', t: 'Sede', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'salon', t: 'Salón', req: 1 }, { k: 'asistente', t: 'Asistente asignado', ancho: 2 }],
    leer: () => COMISIONES.map(([c, n]) => ({ com: c, nombre: n, sede: (ASIGNA[c] || ['jaragua'])[0], salon: (ASIGNA[c] || ['', ''])[1], asistente: ASISTENTES[c] || '' })),
    aplicar: recs => {
      const nombres = Object.fromEntries(COMISIONES);
      COMISIONES.splice(0, COMISIONES.length, ...recs.map(r => [String(r.com).toUpperCase(), r.nombre || nombres[r.com] || r.com]));
      recs.forEach(r => { const c = String(r.com).toUpperCase(); ASIGNA[c] = [r.sede, r.salon]; ASISTENTES[c] = r.asistente || ''; });
    },
  },
  staff: {
    titulo: 'Staff y sus áreas', icono: 'gente', quien: ['seguridad', 'traslado', 'coordinacion', 'bienestar', 'eventos'],
    ayuda: 'Todo el staff que cubre áreas, de todos los equipos. El código es corto: S08 Seguridad, T05 Traslado, B01 Bienestar, E01 Eventos.',
    campos: [{ k: 'cod', t: 'Código', req: 1, mayus: 1 }, { k: 'nombre', t: 'Nombre', req: 1, ancho: 2 }, { k: 'area', t: 'Equipo', tipo: 'opc', opc: () => ['Seguridad', 'Traslado', 'Bienestar', 'Eventos y Protocolo', 'Dirección'].map(x => [x, x]) }],
    leer: () => Object.entries(COB_STAFF).map(([cod, [nombre, area]]) => ({ cod, nombre, area })),
    aplicar: recs => { Object.keys(COB_STAFF).forEach(k => delete COB_STAFF[k]); recs.forEach(r => { COB_STAFF[String(r.cod).toUpperCase()] = [r.nombre, r.area || 'Seguridad']; }); },
  },
  puntos: {
    titulo: 'Puntos que se deben cubrir', icono: 'mapa', quien: ['seguridad', 'coordinacion'],
    ayuda: 'Los lugares que siempre deben tener a alguien: puertas, pasillos y el camino entre las sedes.',
    campos: [{ k: 'id', t: 'Código', req: 1, mayus: 1, soloViejo: 1 }, { k: 'n', t: 'Nombre del punto', req: 1, ancho: 2 }, { k: 'sede', t: 'Sede', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'tipo', t: 'Tipo', tipo: 'opc', opc: () => ['Puerta', 'Interior', 'Pasillo', 'Movilización', 'Nocturno', 'Perímetro'].map(x => [x, x]) }],
    // lugar: el sitio del mapa 3D al que lleva «Cómo llegar» desde Cobertura
    leer: () => COB_PUNTOS.map(p => ({ id: p.id, n: p.n, sede: p.sede, tipo: p.tipo, ...(p.lugar ? { lugar: p.lugar } : {}), ...(p.x != null ? { x: p.x, y: p.y } : {}) })),
    aplicar: recs => { const viejos = Object.fromEntries(COB_PUNTOS.map(p => [p.id, p])); COB_PUNTOS.splice(0, COB_PUNTOS.length, ...recs.map(r => { const v = viejos[r.id] || {}; const o = { ...v, id: String(r.id).toUpperCase(), n: r.n, sede: r.sede, tipo: r.tipo || 'Puerta', turnos: v.turnos || [] }; if (r.lugar) o.lugar = r.lugar; if (r.x != null && r.x !== '') { o.x = +r.x; o.y = +r.y; } return o; })); },
  },
  turnos: {
    titulo: 'Turnos y personas asignadas', icono: 'reloj', quien: ['seguridad', 'coordinacion', 'bienestar', 'eventos'],
    ayuda: 'Quién va en cada punto y a qué hora. Para poner a dos personas en el mismo turno, agrega dos filas con el mismo punto y horario.',
    campos: [{ k: 'punto', t: 'Punto', tipo: 'opc', opc: () => COB_PUNTOS.map(p => [p.id, `${p.id} · ${p.n}`]), req: 1, ancho: 2 }, { k: 'i', t: 'Desde', tipo: 'hora', req: 1 }, { k: 'f', t: 'Hasta', tipo: 'hora', req: 1 }, { k: 'turno', t: 'Turno', req: 1 }, { k: 'persona', t: 'Persona', tipo: 'opc', opc: () => Object.entries(COB_STAFF).map(([c, [n]]) => [c, `${n} · ${c}`]) }, { k: 'tarea', t: 'Qué hace', ancho: 2 }],
    leer: () => COB_PUNTOS.flatMap(p => p.turnos.flatMap(t => (t[3].length ? t[3] : [['', '']]).map(([persona, tarea]) => ({ punto: p.id, i: cobHora(t[0]), f: cobHora(t[1]), turno: t[2], persona, tarea })))),
    aplicar: recs => {
      COB_PUNTOS.forEach(p => { p.turnos = []; });
      for (const r of recs) {
        const p = COB_PUNTOS.find(x => x.id === r.punto); if (!p) continue;
        const ini = aMinutos(r.i), fin = r.f === '0:00' ? 24 * 60 : aMinutos(r.f);
        let t = p.turnos.find(x => x[0] === ini && x[1] === fin && x[2] === r.turno);
        if (!t) { t = [ini, fin, r.turno, []]; p.turnos.push(t); }
        if (r.persona) t[3].push([r.persona, r.tarea || '']);
      }
      COB_PUNTOS.forEach(p => p.turnos.sort((a, b) => a[0] - b[0]));
    },
  },
  rutas: {
    titulo: 'Rutas de ronda', icono: 'lista', quien: ['seguridad', 'coordinacion'],
    ayuda: 'Cada ruta con cada cuánto se hace y sus puntos en orden, separados por comas.',
    campos: [{ k: 'n', t: 'Ruta', req: 1, ancho: 2 }, { k: 'cada', t: 'Cada (min)', tipo: 'num', req: 1 }, { k: 'puntos', t: 'Puntos en orden (separados por comas)', req: 1, ancho: 3 }],
    leer: () => RUTAS.map(r => ({ id: r.id, n: r.n, cada: r.cada, puntos: r.puntos.join(', '), horario: r.horario })),
    aplicar: recs => RUTAS.splice(0, RUTAS.length, ...recs.map(r => ({ id: r.id || nuevoId('R'), n: r.n, cada: +r.cada || 60, horario: r.horario, puntos: String(r.puntos).split(',').map(x => x.trim()).filter(Boolean) }))),
  },
  autobuses: {
    titulo: 'Movilizaciones a pie', icono: 'bus', quien: ['traslado', 'seguridad', 'coordinacion'],
    ayuda: 'Cada salida de un grupo entre sedes. Si se retrasa, cámbiale el estado y todos lo ven.',
    campos: [{ k: 'h', t: 'Sale', tipo: 'hora', req: 1 }, { k: 'de', t: 'Desde', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'a', t: 'Hacia', tipo: 'opc', opc: SEDE_OPC, req: 1 }, { k: 'nota', t: 'Para qué', ancho: 2 }, { k: 'estado', t: 'Estado', tipo: 'opc', opc: () => ['A tiempo', 'Retrasado 10 min', 'Retrasado 20 min', 'Retrasado 30 min', 'Cancelado'].map(x => [x, x]) }],
    leer: () => VIAJES.map(v => ({ ...v })),
    aplicar: recs => VIAJES.splice(0, VIAJES.length, ...recs.map(r => ({ ...r, estado: r.estado || 'A tiempo' })).sort((a, b) => aMinutos(a.h) - aMinutos(b.h))),
  },
  sedes: {
    titulo: 'Sedes del evento', icono: 'casa', quien: ['coordinacion'], fijo: true,
    ayuda: 'El nombre, el nombre corto y la dirección de cada sede. (Para agregar una sede nueva hay que dibujarla en el mapa 3D.)',
    campos: [{ k: 'id', t: 'Sede', solo: 1 }, { k: 'nombre', t: 'Nombre', req: 1, ancho: 2 }, { k: 'corto', t: 'Nombre corto', req: 1 }, { k: 'zona', t: 'Dirección o zona', ancho: 2 }],
    leer: () => Object.entries(SEDES).map(([id, x]) => ({ id, nombre: x.nombre, corto: x.corto, zona: x.zona })),
    aplicar: recs => recs.forEach(r => { if (SEDES[r.id]) Object.assign(SEDES[r.id], { nombre: r.nombre, corto: r.corto, zona: r.zona || '' }); }),
  },
  checklists: listaGrupos(LISTAS, [['pre', 'Antes · Pre-MINUME'], ['montaje', 'Abre · Montaje'], ['sesiones', 'Sesión'], ['transiciones', 'Mueve · Transiciones'], ['cierre', 'Cierra · Cierre']],
    'Checklists de los asistentes', ['coordinacion'], 'Lo que cada asistente marca en cada momento del día (según el Manual del Asistente).', 'Paso del checklist'),
  confirma: listaSimple(CONFIRMA, 'Lista «Tu rol»', ['coordinacion'], 'Lo que el asistente confirma antes de su primera sesión.'),
  turnosAsis: {
    titulo: 'Turnos de los asistentes', icono: 'reloj', quien: ['coordinacion'],
    ayuda: 'El horario de cada asistente: lo ve en su inicio. Escribe el nombre igual que en su código de acceso.',
    campos: [{ k: 'nombre', t: 'Asistente', req: 1, ancho: 2 }, { k: 'de', t: 'Desde', tipo: 'hora', req: 1 }, { k: 'a', t: 'Hasta', tipo: 'hora', req: 1 }, { k: 'salon', t: 'Salón' }, { k: 'tarea', t: 'Tarea', ancho: 2 }],
    leer: () => Object.entries(TURNOS_ASIS).flatMap(([nombre, l]) => l.map(x => ({ nombre, ...x }))),
    aplicar: recs => { Object.keys(TURNOS_ASIS).forEach(k => delete TURNOS_ASIS[k]); recs.forEach(r => { (TURNOS_ASIS[r.nombre] = TURNOS_ASIS[r.nombre] || []).push({ de: r.de, a: r.a, salon: r.salon || '', tarea: r.tarea || '' }); }); Object.values(TURNOS_ASIS).forEach(l => l.sort((x, y) => aMinutos(x.de) - aMinutos(y.de))); },
  },
  necesito: {
    titulo: 'Material que se puede pedir', icono: 'lista', quien: ['coordinacion'],
    ayuda: 'Los botones de «Necesito…» de los asistentes (agua, micrófono, sillas…). El ícono es un emoji.',
    campos: [{ k: 'ic', t: 'Ícono', req: 1 }, { k: 'n', t: 'Material', req: 1, ancho: 3 }],
    leer: () => NECESITO.map(([ic, n]) => ({ ic, n })), aplicar: recs => NECESITO.splice(0, NECESITO.length, ...recs.map(r => [r.ic || '•', r.n])),
  },
  kit: listaSimple(KIT, 'Kit del punto de bienestar', ['bienestar', 'coordinacion'], 'Lo que debe tener el punto de bienestar; el equipo lo marca cada día.'),
  listasBienestar: listaGrupos({ medico: AT_MOTIVOS.medico, fisico: AT_MOTIVOS.fisico, emocional: AT_MOTIVOS.emocional, salida: AT_SALIDA, persona: AT_PERSONA },
    [['medico', 'Motivo médico'], ['fisico', 'Motivo físico'], ['emocional', 'Motivo emocional'], ['salida', 'Cómo terminó la atención'], ['persona', 'Tipo de persona']],
    'Listas de Bienestar', ['bienestar', 'coordinacion'], 'Las opciones del registro de atenciones.', 'Opción'),
  listasObjetos: listaGrupos({ cat: OB_CAT, guarda: OB_GUARDA }, [['cat', 'Tipo de objeto'], ['guarda', 'Dónde se guarda']],
    'Listas de objetos perdidos', ['seguridad', 'coordinacion'], 'Los tipos de objeto y los lugares donde se guardan.', 'Opción'),
  plantillas: {
    titulo: 'Plantillas de comunicados', icono: 'lista', quien: ['coordinacion'],
    ayuda: 'Mensajes listos para mandar en «Comunicados». Usa ___ donde se completa algo.',
    campos: [{ k: 'n', t: 'Nombre', req: 1 }, { k: 'tipo', t: 'Tipo', tipo: 'opc', opc: () => Object.entries(COM_TIPO).map(([k, [t]]) => [k, t]), req: 1 }, { k: 'x', t: 'Mensaje', req: 1, ancho: 2 }],
    leer: () => COM_PLANTILLAS.map(([n, tipo, x]) => ({ n, tipo, x })), aplicar: recs => COM_PLANTILLAS.splice(0, COM_PLANTILLAS.length, ...recs.map(r => [r.n, r.tipo || 'info', r.x])),
  },
  montaje: listaGrupos(EV_LISTA_MONTAJE, TIPOS_EV, 'Montaje de cada tipo de evento', ['eventos', 'coordinacion'], 'La lista que se marca al montar cada evento, según su tipo.', 'Paso del montaje'),
  problemasEv: listaSimple(PROBLEMAS_EV, 'Problemas de los eventos', ['eventos', 'coordinacion'], 'Las opciones de «Tengo un problema» en los eventos.', 'Problema'),
  planos: {
    titulo: 'Capacidad de los salones de eventos', icono: 'gente', quien: ['eventos', 'coordinacion'], fijo: true,
    ayuda: 'Las medidas del plano de asientos. Teatro: filas y asientos por bloque separados por comas (12, 24, 12) y presídium. Banquete: filas de mesas, mesas por fila y sillas por mesa.',
    campos: [{ k: 'k', t: 'Plano', solo: 1 }, { k: 'nombre', t: 'Salón', req: 1, ancho: 2 }, { k: 'filas', t: 'Filas (o filas de mesas)', tipo: 'num', req: 1 }, { k: 'ancho', t: 'Asientos por bloque (o mesas por fila)', req: 1 }, { k: 'extra', t: 'Presídium (o sillas por mesa)', tipo: 'num' }],
    leer: () => Object.entries(MEDIDAS_PLANOS).map(([k, m]) => ({ k, nombre: m.nombre, filas: m.filas, ancho: m.ancho, extra: m.extra })),
    aplicar: recs => recs.forEach(r => { const m = MEDIDAS_PLANOS[r.k]; if (!m) return; Object.assign(m, { nombre: r.nombre, filas: +r.filas || m.filas, ancho: String(r.ancho || m.ancho), extra: +r.extra || 0 }); PLANOS[r.k] = armarPlano(m); }),
  },
  rapidos: listaSimple(RAPIDOS, 'Mensajes rápidos del chat', ['coordinacion'], 'Los botones de un toque del chat. Si terminan en «…», la persona completa el mensaje antes de enviarlo.', 'Mensaje'),
  regionales: {
    titulo: 'Regionales y encargados', icono: 'gente', quien: ['traslado', 'seguridad', 'coordinacion'],
    ayuda: 'Las regionales con su encargado fijo del staff. Escribe el nombre del encargado igual que en su código de acceso: así le aparece su regional.',
    campos: [{ k: 'id', t: 'Código', req: 1, mayus: 1, soloViejo: 1 }, { k: 'n', t: 'Regional', req: 1, ancho: 2 }, { k: 'zona', t: 'Ciudad o zona', ancho: 2 }, { k: 'enc', t: 'Encargado', ancho: 2 }],
    leer: () => REGIONALES.map(r => ({ ...r })),
    aplicar: recs => REGIONALES.splice(0, REGIONALES.length, ...recs.map(r => ({ id: String(r.id || nuevoId('R')).toUpperCase(), n: r.n, zona: r.zona || '', enc: String(r.enc || '').trim() })).sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }))),
  },
  delegadosReg: {
    titulo: 'Delegados por regional', icono: 'gente', quien: ['traslado', 'seguridad', 'coordinacion'],
    ayuda: 'La lista oficial de delegados de cada regional, para el pase de lista de la mañana y de la noche. Puedes pegarla completa desde el Excel.',
    pegar: { titulo: 'Pegar la lista de delegados', ayuda: 'Una persona por línea, copiada del Excel: la regional (06, R06 o «Regional 06»), el nombre y, si la tienes, la comisión. Los que ya están no se repiten.', ejemplo: '06, Valeria Núñez, CSNU\n06, Josué Tavárez, AMS\nRegional 08; Sofía Almánzar' },
    campos: [{ k: 'reg', t: 'Regional', tipo: 'opc', opc: () => REGIONALES.map(r => [r.id, `${r.n}${r.zona ? ' · ' + r.zona : ''}`]), req: 1 }, { k: 'n', t: 'Delegado', req: 1, ancho: 2 }, { k: 'com', t: 'Comisión', tipo: 'opc', opc: () => [['', '—']].concat(COMISIONES.map(([c]) => [c, c])) }],
    leer: () => REG_DELEGADOS.map(d => ({ ...d })),
    aplicar: recs => REG_DELEGADOS.splice(0, REG_DELEGADOS.length, ...recs.map(r => ({ id: r.id || nuevoId('D'), reg: r.reg, n: String(r.n || '').trim(), com: r.com || '' }))),
  },
  responsables: {
    titulo: 'Responsables por área', icono: 'gente', quien: ['coordinacion'],
    ayuda: 'A quién acudir en cada área. Sin números de teléfono: cada uno se contacta por el canal oficial.',
    campos: [{ k: 'area', t: 'Área', req: 1, ancho: 2 }, { k: 'persona', t: 'Responsable', req: 1, ancho: 2 }],
    leer: () => AREAS.map(([k, area, persona]) => ({ k, area, persona })),
    aplicar: recs => AREAS.splice(0, AREAS.length, ...recs.map(r => [r.k || nuevoId('ar'), r.area, r.persona])),
  },
};
const ORDEN_DATOS = ['programa', 'sedes', 'eventos', 'invitados', 'planos', 'montaje', 'problemasEv', 'comisiones', 'turnosAsis', 'checklists', 'confirma', 'necesito', 'staff', 'puntos', 'turnos', 'rutas', 'regionales', 'delegadosReg', 'kit', 'listasBienestar', 'listasObjetos', 'plantillas', 'rapidos', 'responsables'];
const EJEMPLO_DATOS = Object.fromEntries(ORDEN_DATOS.map(k => [k, JSON.parse(JSON.stringify(DATOS[k].leer()))]));
// Solo la dirección edita datos (subsecretarios, quien dirige cada equipo y Coordinación general)
// Seguridad y Traslado son una sola subdirección: quien la dirige edita lo de los dos
const rolesDeEquipo = r => SISTEMA === 'seguridad' && (r === 'seguridad' || r === 'traslado') ? ['seguridad', 'traslado'] : [r];
const puedeEditar = k => esDir() && rolesDeEquipo(estado.usuario.rol).some(r => DATOS[k].quien.includes(r));
// Lo guardado antes del cambio de sedes (Dominican Fiesta, Sede 2 y 3) ya no sirve: se usa el ejemplo nuevo
const deSedesViejas = r => Array.isArray(r) && r.some(x => x && ['sede', 'de', 'a'].some(k => x[k] && !SEDES[x[k]]));
function aplicarDatosGuardados() {
  for (const k of ORDEN_DATOS) { let r = leerComp(CFG(k), null); if (deSedesViejas(r)) r = null; DATOS[k].aplicar(r || JSON.parse(JSON.stringify(EJEMPLO_DATOS[k]))); }
}
aplicarDatosGuardados(); repintarListasFijas();
// Lo que se armó al abrir la página con las listas de ejemplo se vuelve a dibujar con lo guardado
function repintarListasFijas() {
  const en = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
  const op = l => l.map(x => `<option>${esc(x)}</option>`).join('');
  const pasos = [
    () => { en('#comis', COMISIONES.map(([c, n]) => `<button class="comi" data-c="${esc(c)}"><b>${esc(c)}</b><small>${esc(n)}</small></button>`).join('')); $$('.comi').forEach(x => x.classList.toggle('on', x.dataset.c === estado.comision)); },
    () => { en('#obCat', op(OB_CAT)); en('#obGuarda', op(OB_GUARDA)); en('#atPersona', op(AT_PERSONA)); },
    () => en('#comPlant', COM_PLANTILLAS.map(([n], i) => `<button class="mini" data-pl="${i}">${esc(n)}</button>`).join('')),
    pintarFormAt, pintarListas, pintarConfirma, pintarKit, pintarAsientos,
    () => window.pintarRapidos && window.pintarRapidos(),
  ];
  for (const p of pasos) try { p(); } catch (e) { console.warn(e); }   // si una parte no está en este sistema, las demás igual se dibujan
}
function refrescarTodo() {
  repintarListasFijas();
  try { pintarNuevas(); pintarCobertura(); pintarTraslado(); pintarDatos(); if (window.SUBDIR_LISTO) pintarSubdireccion(); if (estado.usuario) pintarTablero(); $('#contactos').innerHTML = AREAS.map(([, a, p]) => `<div class="dato"><span>${esc(a)}</span><b>${esc(p)}</b></div>`).join(''); if (estado.comision) pintarPanel(); } catch (e) { console.warn(e); }
}

// ---------- Ventana de edición ----------
let edK = null, edRecs = [], edQuitados = [], edRestaurar = false;
function abrirEditorDatos(k) {
  if (!puedeEditar(k)) return toast('Esta parte la edita la dirección de cada equipo o Coordinación general');
  edK = k; edRecs = JSON.parse(JSON.stringify(DATOS[k].leer())).map(r => ({ ...r, _viejo: 1 })); edQuitados = []; edRestaurar = false;
  $('#edTitulo').textContent = DATOS[k].titulo; $('#edAyuda').textContent = DATOS[k].ayuda;
  $('#edAgregar').hidden = !!DATOS[k].fijo; $('#edBuscar').value = ''; $('#edEstado').textContent = '';
  $('#edRestaurar').textContent = 'Volver a los datos de ejemplo';
  const pg = DATOS[k].pegar || (k === 'staff' ? { titulo: 'Pegar una lista de personas', ayuda: 'Una persona por línea, copiada del Excel o de WhatsApp. Si pones el equipo después de una coma, se usa: Ana Rosario, Traslado. Las que ya están no se repiten.', ejemplo: 'Ana Rosario, Traslado\nLuis Gómez, Seguridad\nMaría Pérez' } : null);
  $('#edPegar').hidden = !pg; $('#edPegar').open = false; $('#edPegarTxt').value = '';
  if (pg) { $('#edPegar summary').textContent = pg.titulo; $('#edPegar p').textContent = pg.ayuda; $('#edPegarTxt').placeholder = pg.ejemplo; }
  pintarEditorDatos(); $('#editor').hidden = false; document.body.style.overflow = 'hidden';
  setTimeout(() => $('#edBuscar').focus(), 50);
}
function cerrarEditorDatos() { $('#editor').hidden = true; document.body.style.overflow = ''; edK = null; }
function campoHtml(c, r, i) {
  const v = r[c.k] ?? '', id = `ed-${i}-${c.k}`, ro = c.solo || (c.soloViejo && r._viejo);
  let h;
  if (c.tipo === 'opc') h = `<select id="${id}" data-i="${i}" data-k="${c.k}"${ro ? ' disabled' : ''}><option value="">Elige…</option>${c.opc().map(([val, t]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  else if (c.tipo === 'hora') h = `<input id="${id}" type="time" data-i="${i}" data-k="${c.k}" value="${aInputHora(v)}">`;
  else if (c.tipo === 'num') h = `<input id="${id}" type="number" min="1" data-i="${i}" data-k="${c.k}" value="${esc(v)}">`;
  else if (c.tipo === 'si') return `<label class="ed-si" for="${id}"><input id="${id}" type="checkbox" data-i="${i}" data-k="${c.k}"${v ? ' checked' : ''}>${c.t}</label>`;
  else h = `<input id="${id}" data-i="${i}" data-k="${c.k}" value="${esc(v)}"${ro ? ' readonly' : ''}${c.mayus ? ' style="text-transform:uppercase"' : ''}>`;
  return `<div class="ed-campo ancho-${c.ancho || 1}"><label for="${id}">${c.t}${c.req ? ' <i>*</i>' : ''}</label>${h}</div>`;
}
function pintarEditorDatos() {
  const d = DATOS[edK], q = $('#edBuscar').value.toLowerCase().trim();
  const vis = edRecs.map((r, i) => [r, i]).filter(([r]) => !q || Object.values(r).join(' ').toLowerCase().includes(q));
  $('#edCuenta').textContent = `${edRecs.length} ${edRecs.length === 1 ? 'fila' : 'filas'}${q ? ` · ${vis.length} coinciden` : ''}`;
  $('#edLista').innerHTML = vis.length ? vis.map(([r, i]) => `<div class="ed-fila${r._error ? ' con-error' : ''}${r._nuevo ? ' nueva' : ''}" data-fila="${i}"><div class="ed-campos">${d.campos.map(c => campoHtml(c, r, i)).join('')}</div>${d.fijo ? '' : `<button class="ed-quitar" type="button" data-quitar="${i}" aria-label="Quitar esta fila" title="Quitar esta fila"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`}${r._error ? `<p class="ed-error">${esc(r._error)}</p>` : ''}</div>`).join('') : '<p class="cob-sub">Nada coincide con la búsqueda.</p>';
}
const alEditarCampo = e => {
  const x = e.target, i = +x.dataset.i, k = x.dataset.k; if (!k) return;
  const c = DATOS[edK].campos.find(y => y.k === k);
  edRecs[i][k] = x.type === 'checkbox' ? x.checked : c.tipo === 'hora' ? aHora(x.value) : c.mayus ? x.value.toUpperCase() : x.value;
  if (edRecs[i]._error) { delete edRecs[i]._error; x.closest('.ed-fila').classList.remove('con-error'); const p = x.closest('.ed-fila').querySelector('.ed-error'); if (p) p.remove(); }
  $('#edEstado').textContent = 'Cambios sin guardar';
};
$('#edLista').addEventListener('input', alEditarCampo);
$('#edLista').addEventListener('change', alEditarCampo);
$('#edLista').addEventListener('click', e => {
  const b = e.target.closest('[data-quitar]'); if (!b) return;
  const i = +b.dataset.quitar; edQuitados.push(edRecs[i]); edRecs.splice(i, 1); pintarEditorDatos();
  $('#edEstado').innerHTML = `Fila quitada · <button class="mini" type="button" id="edDeshacer">Deshacer</button>`;
});
$('#edEstado').addEventListener('click', e => { if (e.target.id === 'edDeshacer' && edQuitados.length) { edRecs.push(edQuitados.pop()); pintarEditorDatos(); $('#edEstado').textContent = 'Cambios sin guardar'; } });
$('#edBuscar').addEventListener('input', pintarEditorDatos);
$('#edPegarOk').addEventListener('click', () => {
  if (edK === 'delegadosReg') {
    const regDe = t => { const m = String(t).match(/^(?:r|regional)?\s*0*(\d{1,2})$/i); if (!m) return null; const id = 'R' + m[1].padStart(2, '0'); return REGIONALES.some(r => r.id === id) ? id : null; };
    const coms = new Set(COMISIONES.map(([c]) => c.toUpperCase())), ya = new Set(edRecs.map(r => `${r.reg}|${sinAcentos(r.n)}`));
    let agregados = 0, sinReg = 0;
    for (const linea of $('#edPegarTxt').value.split(/\r?\n/)) {
      const partes = linea.split(/\t|;|,/).map(x => x.trim()).filter(Boolean); if (!partes.length) continue;
      const reg = partes.map(regDe).find(Boolean), com = partes.find(x => coms.has(x.toUpperCase())) || '', n = partes.find(x => !regDe(x) && !coms.has(x.toUpperCase())) || '';
      if (!reg) { sinReg++; continue; } if (!n || ya.has(`${reg}|${sinAcentos(n)}`)) continue;
      ya.add(`${reg}|${sinAcentos(n)}`); edRecs.push({ id: nuevoId('D'), reg, n, com: com.toUpperCase(), _nuevo: 1 }); agregados++;
    }
    $('#edPegarTxt').value = ''; pintarEditorDatos();
    $('#edEstado').textContent = (agregados ? `${agregados} ${agregados === 1 ? 'delegado agregado' : 'delegados agregados'} · falta tocar «Guardar cambios»` : 'No había delegados nuevos en la lista') + (sinReg ? ` · ${sinReg} sin regional reconocible` : '');
    return;
  }
  const equipo = t => /trasl|movil/i.test(t) ? 'Traslado' : /direc|coord/i.test(t) ? 'Dirección' : /segur/i.test(t) ? 'Seguridad' : '';
  const usados = new Set(edRecs.map(r => String(r.cod || '').toUpperCase())), nombres = new Set(edRecs.map(r => String(r.nombre || '').toLowerCase().trim()));
  const codigo = area => { const l = { Traslado: 'T', 'Dirección': 'D' }[area] || 'S'; let n = 1; while (usados.has(l + String(n).padStart(2, '0'))) n++; const c = l + String(n).padStart(2, '0'); usados.add(c); return c; };
  let agregadas = 0;
  for (const linea of $('#edPegarTxt').value.split(/\r?\n/)) {
    const partes = linea.split(/\t|;|,/).map(x => x.trim()).filter(Boolean); if (!partes.length) continue;
    const area = partes.slice(1).map(equipo).find(Boolean) || 'Seguridad', nombre = partes.find(x => !equipo(x) && !/^[A-Z]{1,3}-?\d+$/i.test(x)) || '';
    if (!nombre || nombres.has(nombre.toLowerCase())) continue;
    nombres.add(nombre.toLowerCase()); edRecs.push({ cod: codigo(area), nombre, area, _nuevo: 1 }); agregadas++;
  }
  $('#edPegarTxt').value = ''; pintarEditorDatos();
  $('#edEstado').textContent = agregadas ? `${agregadas} ${agregadas === 1 ? 'persona agregada' : 'personas agregadas'} · falta tocar «Guardar cambios»` : 'No había personas nuevas en la lista';
});
$('#edAgregar').addEventListener('click', () => {
  const d = DATOS[edK], ult = edRecs[edRecs.length - 1] || {}, r = { _nuevo: 1 };
  d.campos.forEach(c => { if (['dia', 'punto', 'sede', 'ev', 'de', 'a', 'tipo', 'area', 'para', 'g'].includes(c.k) && ult[c.k] != null) r[c.k] = ult[c.k]; }); // copia lo más común de la fila anterior
  edRecs.push(r); $('#edBuscar').value = ''; pintarEditorDatos(); $('#edEstado').textContent = 'Fila nueva al final';
  const filas = $$('#edLista .ed-fila'); const f = filas[filas.length - 1]; if (f) { f.scrollIntoView({ block: 'center' }); const inp = f.querySelector('input:not([readonly]), select'); if (inp) inp.focus(); }
});
function validar() {
  const d = DATOS[edK]; let malas = 0;
  edRecs.forEach(r => {
    delete r._error;
    const falta = d.campos.filter(c => c.req && (r[c.k] == null || String(r[c.k]).trim() === '')).map(c => c.t);
    if (falta.length) r._error = 'Falta: ' + falta.join(', ');
    else if (r.i && r.f && d.campos.some(c => c.k === 'f') && aMinutos(r.f) <= aMinutos(r.i) && r.f !== '0:00') r._error = 'La hora de terminar debe ser después de la de empezar';
    if (r._error) malas++;
  });
  if (d.campos.some(c => c.k === 'cod')) { const vistos = {}; edRecs.forEach(r => { const c = String(r.cod || '').toUpperCase(); if (c && vistos[c]) { r._error = `El código ${c} está repetido`; malas++; } vistos[c] = 1; }); }
  const llave = (d.campos.find(c => (c.k === 'id' || c.k === 'com') && c.soloViejo) || {}).k;
  if (llave) { const vistos = {}; edRecs.forEach(r => { const c = String(r[llave] || '').toUpperCase(); if (c && vistos[c]) { r._error = `El código ${c} está repetido`; malas++; } vistos[c] = 1; }); }
  return malas;
}
$('#edGuardar').addEventListener('click', () => {
  if (!edRestaurar) {
    const malas = validar();
    if (malas) { pintarEditorDatos(); $('#edEstado').textContent = `Revisa ${malas} ${malas === 1 ? 'fila marcada' : 'filas marcadas'} en rojo`; const f = $('#edLista .con-error'); if (f) f.scrollIntoView({ block: 'center' }); return; }
  }
  const k = edK, limpio = edRecs.map(r => Object.fromEntries(Object.entries(r).filter(([x]) => !x.startsWith('_'))));
  if (edRestaurar) { const ej = JSON.parse(JSON.stringify(EJEMPLO_DATOS[k])); guardarComp(CFG(k), ej); DATOS[k].aplicar(ej); }
  else { guardarComp(CFG(k), limpio); DATOS[k].aplicar(limpio); }
  guardarComp(CFG(k) + '.quien', { por: yoNombre(), t: ahoraMs(), ejemplo: !!edRestaurar });
  registrar('✏️ Datos editados', `${DATOS[k].titulo}${edRestaurar ? ' · volvió a los datos de ejemplo' : ''}`);
  cerrarEditorDatos(); refrescarTodo(); toast(`Guardado: ${DATOS[k].titulo}. Todos lo ven al instante.`);
});
$('#edRestaurar').addEventListener('click', () => {
  if (!edRestaurar) { edRestaurar = true; $('#edRestaurar').textContent = '¿Seguro? Toca «Guardar cambios» para confirmar'; $('#edEstado').textContent = 'Se borrarán tus cambios en esta lista'; return; }
});
$('#edCerrar').addEventListener('click', cerrarEditorDatos);
$('#edCancelar').addEventListener('click', cerrarEditorDatos);
$('#editor').addEventListener('click', e => { if (e.target.id === 'editor') cerrarEditorDatos(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#editor').hidden) cerrarEditorDatos(); });
// Botones «Editar» repartidos en cada sección: solo se ven si a tu equipo le toca editar eso
document.addEventListener('click', e => { const b = e.target.closest('[data-editar]'); if (b) abrirEditorDatos(b.dataset.editar); });
function pintarBotonesEditar() { $$('[data-editar]').forEach(b => { b.hidden = !puedeEditar(b.dataset.editar); }); }

// ---------- «Datos del evento»: todo lo editable en un solo lugar (coordinación) ----------
function pintarDatos() {
  pintarBotonesEditar();
  if (typeof pintarCodigos === 'function') pintarCodigos();
  const sec = $('#datos'); if (!sec || !estado.usuario) return;
  $('#datosGrid').innerHTML = ORDEN_DATOS.filter(puedeEditar).map(k => {
    const d = DATOS[k], n = d.leer().length, q = leerComp(CFG(k) + '.quien', null), cambiado = !!leerComp(CFG(k), null);
    return `<div class="tarjeta datos-card"><div class="datos-cab"><span class="datos-ic">${n}</span><div><b>${d.titulo}</b><small>${d.ayuda}</small></div></div>
      <small class="datos-meta">${cambiado && q && !q.ejemplo ? `Editado por ${esc(q.por)} · ${haceMin(q.t)}` : 'Con los datos de ejemplo'}</small>
      <button class="boton" type="button" data-editar="${k}">Editar</button></div>`;
  }).join('');
}
addEventListener('storage', e => { if (e.key && e.key.startsWith(CLAVE_COMP('config.'))) { aplicarDatosGuardados(); refrescarTodo(); } });
