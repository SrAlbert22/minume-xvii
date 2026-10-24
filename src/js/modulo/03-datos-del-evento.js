// ---------- Datos ----------
const COMISIONES = [
  ['PNUD', 'Programa de las Naciones Unidas para el Desarrollo'], ['CDT', 'Comisión de Ciencia y Tecnología para el Desarrollo'],
  ['COP31', 'Conferencia de las Partes'], ['AMS', 'Asamblea Mundial de la Salud'], ['CSNU', 'Consejo de Seguridad de las Naciones Unidas'],
  ['ONUDC', 'Oficina de las Naciones Unidas contra la Droga y el Delito'], ['CIJ', 'Corte Internacional de Justicia'],
  ['FS-CDH', 'Foro Social del Consejo de Derechos Humanos'], ['ONUDI', 'Organización de las Naciones Unidas para el Desarrollo Industrial'],
  ['UNCTAD', 'Conferencia de las Naciones Unidas sobre Comercio y Desarrollo'], ['OMA', 'Organización Mundial de Aduanas'],
  ['OMT', 'Organización Mundial del Turismo'], ['CIME', 'Conferencia Iberoamericana de Ministros de Educación'],
  ['CRPD', 'Comité sobre los Derechos de las Personas con Discapacidad'], ['UNESCO-JD', 'UNESCO — Comité de Juventud y Deporte'],
];
const SEDES = {
  jaragua: { nombre: 'Renaissance Jaragua', corto: 'Jaragua', zona: 'Av. George Washington 367 · Malecón' },
  sheraton: { nombre: 'Sheraton Santo Domingo', corto: 'Sheraton', zona: 'Av. George Washington 365 · Malecón' },
  malecon: { nombre: 'Malecón Terrace', corto: 'Malecón Terrace', zona: 'Carpa del Sheraton · junto a Pasteur 8' },
};
// Asignación de EJEMPLO: comisión → [sede, salón]. Los salones son los reales de cada hotel;
// la comisión que va en cada uno la decide coordinación (se cambia en «Datos del evento»).
const ASIGNA = {
  CSNU: ['jaragua', 'Anacaona 1'], AMS: ['jaragua', 'Anacaona 2'], CIJ: ['jaragua', 'Anacaona 3'], PNUD: ['jaragua', 'Marién'],
  COP31: ['jaragua', 'Maguá'], ONUDC: ['jaragua', 'Higüey'], CDT: ['jaragua', 'Maguana'], 'FS-CDH': ['jaragua', 'Las Olas'],
  ONUDI: ['sheraton', 'Samaná'], UNCTAD: ['sheraton', 'Bonanza'], OMA: ['sheraton', 'Constanza'], OMT: ['sheraton', 'Yarey'],
  CIME: ['sheraton', 'Da Vinci'], CRPD: ['sheraton', 'Este I'], 'UNESCO-JD': ['sheraton', 'Board Room'],
};
// Movilizaciones a pie entre las sedes (unos 3 minutos del Jaragua al Sheraton y 2 del Sheraton a la carpa)
const VIAJES = [
  { h: '7:30', de: 'jaragua', a: 'sheraton', nota: 'Comisiones del Sheraton después de la acreditación', estado: 'A tiempo' },
  { h: '12:15', de: 'sheraton', a: 'malecon', nota: 'Almuerzo en el Malecón Terrace', estado: 'A tiempo' },
  { h: '12:30', de: 'jaragua', a: 'malecon', nota: 'Almuerzo en el Malecón Terrace', estado: 'A tiempo' },
  { h: '13:45', de: 'malecon', a: 'jaragua', nota: 'Regreso a sesiones', estado: 'A tiempo' },
  { h: '13:45', de: 'malecon', a: 'sheraton', nota: 'Regreso a sesiones', estado: 'A tiempo' },
  { h: '18:30', de: 'sheraton', a: 'jaragua', nota: 'Cierre de jornada en el Jaragua', estado: 'A tiempo' },
];
// Regionales: no hay autobuses. El staff llega el 14 y las regionales el 15 con su encargado; después todo es a pie.
// Cada regional tiene un encargado fijo del staff (su nombre igual que en su código de acceso: así le aparece su regional).
// EJEMPLO hasta tener la lista oficial: se cambia en «Datos del evento → Regionales y encargados».
const REGIONALES = [
  ['R01', 'Barahona'], ['R02', 'San Juan de la Maguana'], ['R03', 'Azua'], ['R04', 'San Cristóbal'], ['R05', 'San Pedro de Macorís'], ['R06', 'La Vega'],
  ['R07', 'San Francisco de Macorís'], ['R08', 'Santiago'], ['R09', 'Mao'], ['R10', 'Santo Domingo'], ['R11', 'Puerto Plata'], ['R12', 'Higüey'],
  ['R13', 'Montecristi'], ['R14', 'Nagua'], ['R15', 'Santo Domingo'], ['R16', 'Cotuí'], ['R17', 'Monte Plata'], ['R18', 'Neyba'],
].map(([id, zona]) => ({ id, n: 'Regional ' + id.slice(1), zona, enc: { R06: 'Ana Rosario', R08: 'Luis Gómez', R10: 'Rosa Almonte', R15: 'Carlos Méndez' }[id] || '' }));
// Delegados de cada regional (EJEMPLO). La lista oficial se pega en «Datos del evento → Delegados por regional».
const REG_DELEGADOS = [
  ['R06', 'Valeria Núñez', 'CSNU'], ['R06', 'Josué Tavárez', 'AMS'], ['R06', 'Camila Abreu', 'PNUD'], ['R06', 'Elián Guzmán', 'CIJ'], ['R06', 'Daniela Polanco', 'OMT'],
  ['R06', 'Samuel Ventura', 'COP31'], ['R06', 'Ariana Fermín', 'UNESCO-JD'], ['R06', 'Gabriel Lantigua', 'ONUDC'], ['R06', 'Isabella Paulino', 'CDT'], ['R06', 'Mateo Rosario', 'OMA'],
  ['R08', 'Sofía Almánzar', 'CSNU'], ['R08', 'Diego Espinal', 'AMS'], ['R08', 'Paula Cabrera', 'CIME'], ['R08', 'Andrés Tejada', 'UNCTAD'], ['R08', 'Lucía Batista', 'CRPD'],
  ['R08', 'Emmanuel Reyes', 'ONUDI'], ['R08', 'Nicole Durán', 'FS-CDH'], ['R08', 'Adrián Peralta', 'CIJ'],
  ['R10', 'Alanna Mejía', 'PNUD'], ['R10', 'Bryan Castillo', 'OMT'], ['R10', 'Génesis Ortiz', 'AMS'], ['R10', 'Joel Marte', 'CSNU'], ['R10', 'Melany Sosa', 'COP31'], ['R10', 'Ángel Santana', 'UNESCO-JD'],
].map(([reg, n, com], i) => ({ id: 'D' + String(i + 1).padStart(3, '0'), reg, n, com }));
// Chat: mensajes de un toque; los que terminan en «…» se completan antes de enviar
const RAPIDOS = ['Recibido 👍', 'Voy en camino', 'Listo ✅', 'Necesito apoyo en…', '¿Dónde estás?', 'Llegó la regional 🧑‍🤝‍🧑'];
const LISTAS = {
  pre: ['Conozco el nombre, la modalidad y la estructura básica de mi comisión', 'Sé quiénes integran la mesa directiva y cuál es el canal de comunicación acordado', 'Tengo el listado oficial de participantes y la representación de cada delegado', 'Conozco los canales oficiales de la comisión y si los delegados están integrados', 'Conozco el horario de sesiones, talleres, comidas, eventos generales y transiciones', 'Conozco las necesidades de mi comisión: materiales, audiovisuales, invitados o circulación', 'Di seguimiento a las reuniones o talleres con la mesa directiva que se me pidieron', 'Di seguimiento a la asistencia de delegados en actividades preparatorias', 'Envié la información para los placards antes de impresión', 'Reporté las novedades en listados: nombres, comisión, representación u otras diferencias'],
  montaje: ['Identifiqué el salón correcto y confirmé que puedo acceder a tiempo', 'Verifiqué placards de delegados (por letra de apertura) y de mesa directiva', 'Confirmé malletes y demás materiales definidos para la comisión', 'Revisé micrófonos, proyector, banners y otros recursos audiovisuales', 'Observé mesas, sillas, entradas, salidas y zonas de circulación', 'Reporté cualquier faltante y di seguimiento hasta conocer su estatus', 'Tengo a mano el contacto de Beatriz y sé cómo reportar una incidencia', 'La comisión está lista antes de que entren los delegados'],
  sesiones: ['Revisé el salón antes de que iniciara la sesión', 'Estoy visible y cerca de la comisión (Observa)', 'Atiendo las necesidades logísticas de la mesa directiva (Apoya)', 'Oriento a los delegados solo con información confirmada', 'Distribuyo notas diplomáticas cuando corresponde (Conecta)', 'Anoto en la bitácora lo que afecta la operación (Registra)'],
  transiciones: ['Confirmé el destino y el momento de salida antes de comunicarlo', 'Di instrucciones cortas y visibles, iguales a las de los demás asistentes', 'Coordiné con seguridad o protocolo cuando el movimiento lo requería', 'Evité que todos salieran sin orden cuando había una secuencia definida', 'Observé pasillos y accesos; si se congestionaron, informé y pedí apoyo', 'La mesa y los delegados saben dónde y cuándo continúa la sesión'],
  cierre: ['Revisé mesas, sillas y piso por documentos o pertenencias personales', 'Confirmé que no quedan materiales de delegados ni de la mesa directiva', 'Organicé y recuperé los materiales institucionales que deben devolverse', 'El espacio quedó ordenado y libre de desperdicios', 'Anoté incidencias pendientes o temas para retomar mañana', 'Cerré la Bitácora de Comisión y reporté las novedades a Beatriz', 'Si se me indicó, apoyé la entrega de certificados u otros materiales finales'],
};
const NOMBRE_ETAPA = { pre: 'Antes · Pre-MINUME', montaje: 'Abre · Montaje y apertura', sesiones: 'Sesión', transiciones: 'Mueve · Entre actividades', cierre: 'Cierra · Cierre de comisión' };
const CORTO = { pre: 'Antes', montaje: 'Abre', sesiones: 'Sesión', transiciones: 'Mueve', cierre: 'Cierra' };
const AHORA = {
  pre: 'Llena la ficha rápida de tu comisión y completa lo que debes conocer y dar seguimiento. Nunca llegues conociendo solo el nombre de tu comisión.',
  montaje: 'Verifica salón, placards, materiales, audiovisuales y circulación. Reporta cualquier faltante y deja la comisión lista antes de que entren los delegados.',
  sesiones: 'Observa, apoya, conecta y registra. Revisa el salón antes de que inicie la sesión y orienta solo con información confirmada.',
  transiciones: 'Confirma el destino y la hora de salida antes de comunicarlo. Instrucciones cortas, iguales para todos, y vigila pasillos y accesos.',
  cierre: 'Checklist de cierre en 5 minutos, bitácora cerrada y novedades reportadas a Beatriz antes de retirarte.',
};
// Notas del manual que acompañan cada checklist
const NOTA_LISTA = {
  pre: '<b class="t">Tu regla Pre-MINUME</b>Nunca llegues al evento conociendo solo el nombre de tu comisión. Llena tu <a href="#mi-comision">ficha rápida</a>.',
  montaje: '<b class="t">Importante</b>Tu función es verificar y activar la solución. No manipules equipos técnicos ni cambies el montaje por cuenta propia si requiere autorización o apoyo especializado.',
  sesiones: '<b class="t">Tu ciclo de respuesta</b>Recibe → Confirma → Resuelve → Escala → Registra.',
  transiciones: '<b class="t">Antes de reiniciar</b>Confirma que la mesa directiva y los delegados sepan dónde y cuándo continúa la sesión.',
};

const estado = { nombre: leer('nombre', ''), comision: leer('comision', null), etapa: leer('etapa', 'sesiones'), marcas: leer('marcas', {}), bitacora: leer('bitacora', []), mios: leer('puntos', []), sede: 'todas', abordo: 0 };
