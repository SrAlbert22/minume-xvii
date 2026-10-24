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
docs/                  guía del staff (guia.html → PDF)
```

Para armar:

```bash
python herramientas/datos_mapa.py
python herramientas/armar.py
```

`dist/` se publica en Vercel. `enviar/` sirve para mandar un sistema por WhatsApp.

## Seguridad

- Cabeceras en `dist/vercel.json`: Content-Security-Policy (solo se cargan los dominios que la página usa), HSTS, `X-Frame-Options: DENY`, `nosniff` y `Permissions-Policy` (ubicación y cámara solo para la misma página).
- La llave de Supabase que va en `armar.py` es la pública (anon). Lo que protege los datos son las reglas de la base (`supabase/esquema.sql`): las tablas no se leen directo (RLS sin políticas) y todo pasa por funciones que piden la sesión.
- Acceso con código personal: se verifica en el servidor (`minume_entrar`, con límite de intentos) y da un token de 30 días. Los códigos se guardan cifrados con bcrypt; Coordinación general los crea y anula desde «Datos del evento».
- Dos niveles por código: voluntario (ve solo lo suyo) y dirección (ve todo su sistema, asigna turnos y refuerzos, edita datos y ve los Reportes por día de su equipo). Coordinación general ve todo y pone el nivel de cada código.
- Las atenciones de Bienestar solo las leen Bienestar y Coordinación general. El chat solo deja leer y escribir en los canales de cada persona.
- Antes del evento: anular los códigos de prueba y no guardar datos de salud reales mientras sigan activos.

## Datos de ejemplo

Los nombres del staff, la asignación de comisiones a salones, los turnos, las regionales con sus delegados y los horarios son de ejemplo. **Todo lo que es dato se cambia desde «Datos del evento»** (25 listas: programa, sedes, eventos, invitados, capacidad de los salones, montaje, comisiones, turnos, checklists, material, staff, puntos, rondas, regionales y encargados, delegados por regional, listas de Bienestar y de objetos, plantillas de comunicados, mensajes rápidos del chat y responsables). Cada equipo edita lo suyo y Coordinación general, todo. Lo editado se guarda en `minume_compartido` con claves `minume.compartido.config.*`. La lista real del staff se puede pegar en Staff → «Pegar una lista de personas».

Mapa: maqueta 3D propia hecha en Blender · calles y contornos © colaboradores de OpenStreetMap (ODbL).
