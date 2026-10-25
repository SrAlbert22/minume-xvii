# MINUME XVII · sistemas del staff

Hecho por **Albert Silvestre**.

Páginas para el staff de MINUME XVII (14 al 16 de noviembre, Renaissance Jaragua y Sheraton Santo Domingo). Hay un sistema por equipo y un Inicio que los reúne:

| Sistema | Para quién | Lo principal |
|---|---|---|
| Asistencia | Asistentes de comisión y coordinación de Asistencia | Su comisión, checklists, pedidos al salón, conteo de delegados |
| Seguridad y Traslado | Seguridad y movilización | Cobertura de puntos y turnos, rondas con GPS, regionales con pase de lista, SOS, equipo en vivo, movilizaciones a pie |
| Bienestar | Bienestar físico y emocional | Casos y atenciones, protocolos, punto de bienestar |
| Eventos y Protocolo | Eventos | Avance de cada evento e invitados especiales |
| Coordinación general | Coordinación | Todo lo anterior y los reportes en PDF y Excel |

Todos se instalan en el teléfono como app y abren sin internet si ya se entró una vez.

## Bienvenida del Inicio

Lo primero que se ve al abrir el Inicio son cuatro pasos con la identidad MXVII: **bienvenida → subsecretaría → rol → código**.

- **Subsecretaría**: Asistencia, Acreditación, Seguridad y Traslado, Bienestar, Eventos y Protocolo, o **Secretaría General**.
- **Rol** (solo en las subsecretarías): Voluntario (ve solo lo que le toca) o Coordinación (supervisa su subsecretaría).
- **Secretaría General** no elige rol: su único rol es SGL, entra con código CG y supervisa todas las subsecretarías y todo el movimiento.
- Responsive escrito primero para el teléfono, con saltos en 600, 900 y 1200 px y ajustes para pantallas bajas (teléfono acostado).
- **Código**: solo acepta códigos de la subsecretaría elegida. Lo que se ve dentro lo decide el nivel real del código; si no coincide con el rol elegido, el sistema lo avisa al entrar (`minume.eleccion`).
- **Voluntario** (`esVol()`, clase `es-vol`): menú corto con solo sus tareas (`ORDEN_VOL`) y un Inicio «lo que te toca»: su puesto y tarea de ahora, sus turnos de hoy y, según el equipo, sus regionales, su ronda, los casos que atiende o los eventos a su cargo (su nombre en «Responsable»). Lo de todo el equipo (cifras, listas de todos los puntos, libres para reforzar, historial de rondas, lista de alergias, expedientes, invitados, bitácora, ubicación en vivo) lleva `solo-dir` y no le sale. Las alertas (SOS, comunicados, órdenes) le siguen llegando.
- **Administrador** (código `AD-`): como Secretaría General, no elige rol. Entra a Coordinación general con permisos de todo y tiene «Paneles de la plataforma» para abrir el panel de dirección de cada subsecretaría con su mismo código. **Antes de usarlo**, ejecuta en el SQL Editor la sección «Administración de la plataforma (códigos AD-)» del final de `supabase/esquema.sql` (agrega el prefijo y el código de prueba AD-0001).
- **Entrada directa**: los sistemas ya no tienen pantalla de código propia. Al poner el código en la bienvenida, el sistema muestra «Entrando a tu panel…» y abre el panel. Si se abre un sistema sin sesión, si el código falla, si la sesión vence o al tocar «Salir», vuelve a la bienvenida del Inicio en el paso del código de ese sistema (`#volver=<sistema>&error=…`). Cada sistema guarda su propia sesión (`minume.sesion.token.<sistema>`), así que entrar o salir de uno no cierra los otros en el mismo teléfono.
- **Una sola tipografía**: todo usa Barlow (páginas, mapa, PDF y Excel). Sin emojis: los marcadores del mapa llevan la inicial de su categoría.
- **Inicio de cada panel** (después de entrar): una sola tarjeta de saludo (`pintarSaludo`, `28-saludo.css`) con el rol, cuántos días faltan o qué día del evento es, una línea de lo que ve, el botón principal de su equipo y Chat. Los permisos de alertas y ubicación son una franja dentro del saludo que se puede cerrar (ya no hay ventana al entrar). Debajo, 4 atajos y «Ver todas las secciones».
- «Ver el centro de operaciones» cierra la bienvenida en esa pestaña y el botón «Entrar» de arriba la vuelve a abrir.

## Mapa de las sedes

- Foto satelital real (Esri World Imagery) con los edificios en 3D a partir de los contornos de OpenStreetMap.
- «Cómo llegar» con la ruta morada paso a paso. Las rutas se calculan sobre caminos trazados a mano encima del satélite (`herramientas/datos_mapa.py`).
- GPS del teléfono con filtro de lecturas malas. Si la persona está lejos del hotel, se abre Google Maps.
- Recorridos de referencia: Jaragua → Sheraton, unos 240 m desde la puerta este (3 min a pie). Sheraton → Malecón Terrace, unos 140 m (2 min).

## Cómo está organizado

```
src/
  pagina.html          esqueleto de los sistemas (marca dónde va cada pedazo con @@css, @@html y @@js)
  inicio.html          el Inicio que reúne los sistemas
  estilos/             CSS por sección
  secciones/           HTML por sección
  js/modulo/           la lógica, en el orden en que se carga
  js/sincronizacion.js sincronización con Supabase
  js/reportes.js       PDF y Excel
  sw.js                service worker (uso sin internet)
herramientas/
  armar.py             arma dist/ (lo que se publica) y enviar/ (un archivo por sistema)
  datos_mapa.py        genera los datos del mapa: edificios, caminos y lugares
  ensamblar.py         junta los pedazos de src/
blender/               modelos 3D de las sedes (ver blender/LEEME.txt y blender/sheraton/LEEME.txt)
supabase/esquema.sql   la base de datos: tablas, funciones y permisos (sin códigos ni datos)
supabase/functions/    Edge Function «minume-push» que envía los avisos al teléfono
docs/                  guía del staff (guia.html → PDF)
```

Para armar:

```bash
python herramientas/datos_mapa.py
python herramientas/plano_2d.py
python herramientas/armar.py
```

`dist/` se publica en Vercel. `enviar/` sirve para mandar un sistema por WhatsApp.

## Seguridad

- Cabeceras en `dist/vercel.json`: Content-Security-Policy (solo se cargan los dominios que la página usa), HSTS, `X-Frame-Options: DENY`, `nosniff` y `Permissions-Policy` (ubicación y cámara solo para la misma página).
- La llave de Supabase que va en `armar.py` es la pública (anon). Lo que protege los datos son las reglas de la base (`supabase/esquema.sql`): las tablas no se leen directo (RLS sin políticas) y todo pasa por funciones que piden la sesión.
- Acceso con código personal: se verifica en el servidor (`minume_entrar`, con límite de intentos) y da un token de 30 días. Los códigos se guardan cifrados con bcrypt; Coordinación general los crea y anula desde «Datos del evento».
- Niveles por código, como en la organización: voluntario (ve solo lo suyo), coordinación y subdirección (administran su equipo: ven todo su sistema, asignan turnos y refuerzos, editan datos y ven los Reportes por día). Coordinación general (Secretaría General) ve todo y pone el nivel de cada código. La base lo hace cumplir: los datos del evento solo los escribe la administración, la bitácora de cada equipo solo ese equipo y los códigos de prueba no administran códigos.
- Las atenciones de Bienestar solo las leen Bienestar y Coordinación general. El chat solo deja leer y escribir en los canales de cada persona.
- Antes del evento: anular los códigos de prueba y no guardar datos de salud reales mientras sigan activos.

## Avisos al teléfono (Web Push)

Los SOS, el nivel 3, los comunicados urgentes y los mensajes urgentes del chat suenan aunque la página esté cerrada o el teléfono bloqueado (probado en Android con Chrome el 25 de octubre de 2026).

- Cada persona lo activa con el botón del telefonito junto a «Activar alertas» (o con «Activar las alertas» al entrar). Tocándolo otra vez sale «Mandar una prueba».
- La base decide a quién le llega: SOS y nivel 3 al equipo al que van y a Coordinación general; comunicados urgentes al equipo (o a todos) y a Coordinación general; urgentes del chat a quien tiene ese canal. Nunca a quien lo mandó.
- Recorrido: disparador en `minume_compartido` o `minume_chat` → cola `minume_push_cola` → `pg_net` llama a la Edge Function `minume-push` → la función cifra y envía 64 a la vez → los teléfonos que ya no existen se borran solos.
- iPhone: solo funciona si MINUME está agregada a la pantalla de inicio (iOS 16.4 o más nuevo) y se activa desde ahí. Suena con el sonido normal de notificaciones, no con la sirena.
- Si un teléfono no suena: que no esté en silencio ni en «No molestar», y en Ajustes → Apps → Chrome → Notificaciones, el sitio con sonido.

## Dirección, subdirección y «Mandar»

- **Dirección**: los códigos CG entran a Coordinación general y ven todo el evento.
- **Subdirección / coordinación de cada equipo**: al entrar, su botón principal es «Mi subdirección» (`#subdireccion`): su staff (Seguridad y Traslado es un solo equipo: los códigos SE y TR ven y hacen lo mismo), quién está activo, quién nunca ha entrado, quién tiene los avisos al teléfono y las listas que puede editar. La lista sale de `minume_mi_equipo`, que solo devuelve el equipo de quien la pide.
- **Lo que le toca a cada uno**: en «Mi subdirección» sale todo el staff del equipo (con código o solo en «Staff y sus áreas») con su punto y tarea de ahora, si ya confirmó, su siguiente turno, todos sus turnos del día, sus regionales y botones para editar sus turnos y sus datos (abren el editor ya filtrado).
- **Cobertura en todos los equipos menos Asistencia** (Albert pidió no agregarle nada a Asistencia): a todo el staff le tocan áreas; la dirección de cada equipo asigna a su gente. Asistencia tampoco tiene «Mi equipo». Los puntos los define Seguridad y Traslado o Coordinación general.
- **Mandar**: en cada persona, «📣 Mandar» le manda una orden (clave `ordenes`). A esa persona le aparece arriba con «Voy en camino», «Ya llegué» o «No puedo», y le suena en el teléfono bloqueado si quien manda es jefe de su equipo o Coordinación general.
- **Regionales**: lo principal es marcar cada regional con un toque: Llegó, En camino o En espera. El pase de lista por delegado queda como opción. Ya no hay movilizaciones a pie entre sedes ni conteo del grupo.
- **Chat**: cualquiera puede marcar «🚨 Mandar como aviso»; le suena a todo el canal aunque tenga el teléfono bloqueado.
  Mientras haya avisos sin marcar sale un aviso rojo arriba de la página. La notificación del teléfono trae «✓ Recibido» (funciona con la página cerrada: la página deja su sesión en la caché `minume-sesion` para el service worker) y se borra sola cuando se lee el chat, el comunicado, la orden o el SOS.

## Mudanza a otro proyecto (Supabase o Vercel nuevos)

Todo lo que hace falta está en este repositorio, menos los secretos, que están en `Documents\MINUME-XVII-Acceso` (fuera del repo).

1. **Supabase nuevo**: en `supabase/esquema.sql`, cambia la dirección `https://fakkqpwgidjvodippxup.supabase.co/functions/v1/minume-push` (función `minume_push_encolar`) por la del proyecto nuevo. Pega el archivo completo en el SQL Editor y ejecútalo.
2. **Llaves de los avisos**: usa las de `MINUME-XVII-Acceso\vapid-llaves.json` (o crea otras con `node herramientas/llaves_vapid.mjs`) y guárdalas en el Vault:
   `select vault.create_secret('<publica>', 'minume_vapid_publica'); select vault.create_secret('<privada>', 'minume_vapid_privada');`
   La privada nunca va en el código.
3. **Edge Function**: desde la carpeta del repo, `npx supabase functions deploy minume-push --no-verify-jwt --project-ref <ref-del-proyecto>` (pide `npx supabase login` la primera vez).
4. **armar.py**: cambia `SUPABASE` (dirección y llave pública), `VAPID` (si cambiaste las llaves), el dominio de Supabase en la `CSP` y `VERCEL` (ids del proyecto de Vercel).
5. **Dominio nuevo**: si la página cambia de dirección, cambia `'sub'` en `minume_push_llaves` y cada persona tiene que volver a activar los avisos (el permiso es por sitio).
6. **Primer código**: crea el de Coordinación general (instrucciones al principio de `esquema.sql`).
7. **Datos del evento** (opcional): en el SQL Editor del proyecto viejo, `select clave, valor from minume_compartido where clave like 'minume.compartido.config.%'`, descarga el resultado e insértalo en el nuevo. Los códigos no se pasan: se crean otra vez.
8. Arma y publica como siempre: `python herramientas/armar.py`, copia `dist/` fuera del repo y `npx vercel deploy --prod --yes --scope <equipo>`.

## Datos de ejemplo

Los nombres del staff, la asignación de comisiones a salones, los turnos, las regionales con sus delegados y los horarios son de ejemplo. **Todo lo que es dato se cambia desde «Datos del evento»** (25 listas: programa, sedes, eventos, invitados, capacidad de los salones, montaje, comisiones, turnos, checklists, material, staff, puntos, rondas, regionales y encargados, delegados por regional, listas de Bienestar y de objetos, plantillas de comunicados, mensajes rápidos del chat y responsables). Cada equipo edita lo suyo y Coordinación general, todo. Lo editado se guarda en `minume_compartido` con claves `minume.compartido.config.*`. La lista real del staff se puede pegar en Staff → «Pegar una lista de personas».

Mapa: maqueta 3D propia hecha en Blender · calles y contornos © colaboradores de OpenStreetMap (ODbL).

## Acreditación (sistema propio)

- Página: `/acreditacion`, códigos que empiezan con `AC-` (los crea Coordinación general en «Códigos de acceso»).
- Es parte de «Asistencia, Bienvenida y Acreditación»: usa el canal de chat de Asistencia.
- Las acreditaciones de todas las mesas van en `minume.compartido.acreditados` (una entrada por delegado): si dos mesas escanean a la vez, la base junta las dos y nadie se acredita dos veces.
- La lista oficial de delegados (Excel o CSV con columnas nombre, comision, delegacion, colegio) la sube la subdirección de Acreditación o Coordinación general y llega a todas las mesas (`minume.compartido.config.delegados`). Súbela antes de imprimir los gafetes: los QR usan el número de fila (D-001, D-002…).
- Cambios en la base: sección «Acreditación con sistema propio» de `supabase/esquema.sql`.

## Antes del evento: modo evento

1. En Coordinación general → «Códigos de acceso», entra con **tu código personal** (no con CG-0001) y toca **«Anular los N códigos de prueba»**.
2. Arma sin nada de demostración y publica:
   - `python herramientas/armar.py --evento` (quita la franja DEMO, los códigos de prueba escritos en la página, «Simular día del evento», los botones de simular y el reloj simulado).
   - Copia `dist/` a una carpeta fuera del repositorio y ejecuta `npx vercel deploy --prod --yes --scope itsalberthjesus-7130s-projects`.
3. Para volver a la demostración: `python herramientas/armar.py` (sin `--evento`) y publica otra vez.

## Después del evento: datos de salud

En Bienestar → «Expedientes», la subdirección de Bienestar o Coordinación general tocan **«Borrar los datos de salud»** (piden escribir BORRAR). Se borran todos los casos, las alergias y las fotos de los expedientes, en todos los teléfonos. Descarga antes el PDF o el Excel si la subsecretaría lo necesita.
