# Caminos y lugares de las sedes: los usan la página (src/js/modulo/07-datos-mapa.js)
# y la maqueta de Blender (blender/plantel/caminos.json).
# Autor: Albert Silvestre
#
# Todo está en metros sobre el mismo plano que la maqueta: x hacia el este, y hacia el norte,
# con el origen entre los dos hoteles. Los caminos de afuera siguen las calles y aceras de
# OpenStreetMap; los de adentro de cada hotel son aproximados.
import json, math, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA_JS = RAIZ / 'src' / 'js' / 'modulo' / '07-datos-mapa.js'
SALIDA_JSON = RAIZ / 'blender' / 'plantel' / 'caminos.json'

LAT0, LON0 = 18.4628, -69.8988
M_LAT, M_LON = 110540.0, 111320.0 * math.cos(math.radians(LAT0))
ZOOM, TILE_X, TILE_Y = 19, 160342, 234775


def latlon(x, y):
    return [round(LAT0 + y / M_LAT, 7), round(LON0 + x / M_LON, 7)]


def foto(px, py):
    """Punto medido sobre la foto satelital (a mitad de tamaño) a metros."""
    n = 2 ** ZOOM
    xt, yt = TILE_X + px * 2 / 256, TILE_Y + py * 2 / 256
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yt / n))))
    lon = xt / n * 360 - 180
    return (round((lon - LON0) * M_LON, 1), round((lat - LAT0) * M_LAT, 1))


# Plano propio del Sheraton (el hotel está girado): igual que en blender/sheraton/construir_sheraton.py
_ox, _oy = 79.2, 4.0
_l = math.hypot(-20.4, 46.6)
_uy = (-20.4 / _l, 46.6 / _l)
_ux = (_uy[1], -_uy[0])


def sh(x, y):
    return (round(_ox + _ux[0] * x + _uy[0] * y, 1), round(_oy + _ux[1] * x + _uy[1] * y, 1))


NODOS = {
    # Renaissance Jaragua (por dentro, aproximado)
    'j-lobby': foto(455, 478), 'j-pasillo': foto(425, 430), 'j-salones': foto(430, 515), 'j-oeste': foto(335, 498),
    'j-norte': (-89.0, -11.5), 'j-este': (-97.0, 9.0),
    # Camino directo al Sheraton por el borde sur de las canchas de tenis (el que el staff usa; dibujado sobre Google Maps)
    'c-sur-o': (-72.0, -0.5), 'c-sur-e': (-21.0, 12.5), 'c-sheraton-o': (52.5, 43.0),
    # Afuera: al norte por el borde de las canchas y la calle de servicio (OSM 1033698834)
    'c-sendero': (-92.0, 34.0), 'c-servicio': (-85.0, 46.0), 'c-canchas-n': (-46.7, 60.5), 'c-canchas-e': (-4.6, 75.3),
    # Acceso del Sheraton (OSM 1033698833 y 325084443)
    'c-calle': (31.3, 70.0), 'c-sur': (44.8, 36.9), 'c-giro': (50.5, 34.5), 'c-norte': (45.9, 75.0), 'm-calle': (34.4, 103.0),
    # Sheraton (plano propio del hotel)
    's-acceso': sh(-6.0, 40.0), 's-oeste': sh(-6.5, -8.0), 's-entrada': sh(32.0, 73.0), 's-lobby': sh(32.0, 60.0),
    's-foyer-s': sh(24.6, -3.0), 's-foyer-m': sh(24.6, 22.0), 's-foyer-n': sh(24.6, 48.0), 's-cruce': sh(44.0, 52.0), 's-pasillo-e': sh(44.0, 20.0),
    # Malecón Terrace
    'm-entrada': sh(2.5, 107.0),
}
# (desde, hasta, instrucción, ¿afuera?)
TRAMOS = [
    ('j-lobby', 'j-pasillo', 'Desde el lobby del Jaragua, camina hacia el ala de salones', False),
    ('j-pasillo', 'j-norte', 'Sigue por el pasillo interno del Jaragua', False),
    ('j-norte', 'j-este', 'Sal por la puerta este del Jaragua, junto a la piscina', False),
    ('j-lobby', 'j-salones', 'Entra al área de salones del Jaragua (Anacaona y salones pequeños)', False),
    ('j-lobby', 'j-oeste', 'Ve hacia el ala oeste del Jaragua (casino y Teatro La Fiesta)', False),
    ('j-este', 'c-sur-o', 'Al salir, camina hacia el este pegado al jardín de la piscina', True),
    ('c-sur-o', 'c-sur-e', 'Sigue derecho por el borde sur de las canchas de tenis', True),
    ('c-sur-e', 'c-sheraton-o', 'Continúa hacia el este hasta el lado oeste de la torre del Sheraton', True),
    ('c-sheraton-o', 's-acceso', 'Llega al acceso lateral del Sheraton', True),
    ('c-sendero', 'c-servicio', 'Llega a la calle de servicio que pasa al norte de las canchas', True),
    ('c-servicio', 'c-canchas-n', 'Gira a la derecha y sigue por la calle de servicio', True),
    ('c-canchas-n', 'c-canchas-e', 'Sigue derecho por el borde norte de las canchas', True),
    ('c-canchas-e', 'c-calle', 'Cruza hasta la calle de acceso del Sheraton', True),
    ('c-calle', 'c-sur', 'Baja por la calle de acceso hacia el mar', True),
    ('c-sur', 'c-giro', 'Sigue por la acera junto a la calle', True),
    ('c-giro', 's-acceso', 'Llegas a la esquina noroeste del Sheraton', True),
    ('s-acceso', 's-oeste', 'Baja por la acera pegada a la fachada oeste hasta la entrada oeste del Sheraton', True),
    ('c-calle', 'c-norte', 'Cruza a la otra vía del acceso (subiendo)', True),
    ('c-norte', 'm-calle', 'Sube por el acceso, alejándote del mar', True),
    ('m-calle', 'm-entrada', 'La carpa blanca del Malecón Terrace queda a tu derecha: entra por su lado oeste', True),
    ('c-norte', 's-entrada', 'Gira a la derecha hacia la entrada principal del Sheraton', True),
    ('s-entrada', 's-lobby', 'Entra al lobby del Sheraton', False),
    ('s-oeste', 's-foyer-s', 'Dentro del Sheraton, camina hacia el foyer de los salones', False),
    ('s-foyer-s', 's-foyer-m', 'Sigue por el foyer', False),
    ('s-foyer-m', 's-foyer-n', 'Sigue por el foyer hacia el lobby', False),
    ('s-foyer-n', 's-lobby', 'Llegas al lobby del Sheraton', False),
    ('s-foyer-n', 's-cruce', 'Cruza por el pasillo norte, detrás de Constanza', False),
    ('s-cruce', 's-pasillo-e', 'Baja por el pasillo este (Da Vinci, Board Room y salones Este)', False),
]
# Lugares que se pueden buscar: (id, nombre, sede, tipo, posición, nodo del camino)
LUGARES = [
    ('j-lobby', 'Lobby del Jaragua', 'jaragua', 'lobby', foto(455, 478), 'j-lobby'),
    ('j-este', 'Puerta este del Jaragua', 'jaragua', 'entrada', NODOS['j-este'], 'j-este'),
    ('teatro-la-fiesta', 'Teatro La Fiesta', 'jaragua', 'salon', foto(265, 520), 'j-oeste'),
    ('casino-jaragua', 'Casino Jaragua', 'jaragua', 'casino', foto(300, 470), 'j-oeste'),
    ('anacaona', 'Anacaona (secciones 1, 2 y 3)', 'jaragua', 'salon', foto(390, 545), 'j-salones'),
    ('marien', 'Marién', 'jaragua', 'salon', foto(420, 512), 'j-salones'),
    ('magua', 'Maguá', 'jaragua', 'salon', foto(430, 520), 'j-salones'),
    ('higuey', 'Higüey', 'jaragua', 'salon', foto(440, 528), 'j-salones'),
    ('maguana', 'Maguana', 'jaragua', 'salon', foto(452, 536), 'j-salones'),
    ('las-olas', 'Las Olas', 'jaragua', 'salon', foto(470, 505), 'j-salones'),
    ('sol-de-oro', 'Sol de Oro', 'jaragua', 'salon', foto(470, 420), 'j-pasillo'),
    ('atabey', 'Atabey y salas ejecutivas', 'jaragua', 'salon', foto(445, 462), 'j-lobby'),
    ('s-oeste', 'Entrada oeste del Sheraton', 'sheraton', 'entrada', NODOS['s-oeste'], 's-oeste'),
    ('s-lobby', 'Lobby del Sheraton', 'sheraton', 'lobby', NODOS['s-lobby'], 's-lobby'),
    ('gran-salon', 'Gran Salón', 'sheraton', 'salon', sh(35, 33.9), 's-foyer-m'),
    ('samana', 'Samaná', 'sheraton', 'salon', sh(35, 23.2), 's-foyer-m'),
    ('bonanza', 'Bonanza', 'sheraton', 'salon', sh(35, 33.9), 's-foyer-m'),
    ('constanza', 'Constanza', 'sheraton', 'salon', sh(35, 44.7), 's-foyer-n'),
    ('yarey', 'Yarey', 'sheraton', 'salon', sh(34.8, 6.2), 's-foyer-s'),
    ('da-vinci', 'Da Vinci', 'sheraton', 'salon', sh(52, 35.5), 's-cruce'),
    ('board-room', 'Board Room', 'sheraton', 'salon', sh(48.5, 45.5), 's-cruce'),
    ('este-1', 'Este I', 'sheraton', 'salon', sh(47.75, 1.5), 's-pasillo-e'),
    ('este-2', 'Este II', 'sheraton', 'salon', sh(47.75, 10.7), 's-pasillo-e'),
    ('este-3', 'Este III', 'sheraton', 'salon', sh(47.75, 18.2), 's-pasillo-e'),
    ('este-4', 'Este IV', 'sheraton', 'salon', sh(47.75, 25.7), 's-pasillo-e'),
    ('este-5', 'Este V', 'sheraton', 'salon', sh(54.75, 17.75), 's-pasillo-e'),
    ('este-6', 'Este VI', 'sheraton', 'salon', sh(54.75, 25.25), 's-pasillo-e'),
    ('malecon-terrace', 'Malecón Terrace (carpa)', 'malecon', 'terraza', sh(15.3, 107.0), 'm-entrada'),
    ('canchas', 'Canchas de tenis', 'jaragua', 'referencia', (-24.0, 38.0), 'c-canchas-n'),
    ('encuentro-jaragua', 'Punto de encuentro · frente al Jaragua', 'jaragua', 'encuentro', (-105.0, -150.0), 'j-lobby'),
    ('encuentro-sheraton', 'Punto de encuentro · jardín sur del Sheraton', 'sheraton', 'encuentro', sh(10.0, -50.0), 's-oeste'),
]
# Rutas que se pintan siempre en la maqueta
RUTAS_FIJAS = {
    'jaragua-sheraton': ['j-este', 'c-sur-o', 'c-sur-e', 'c-sheraton-o', 's-acceso', 's-oeste'],
    'sheraton-malecon': ['s-oeste', 's-acceso', 'c-giro', 'c-sur', 'c-calle', 'c-norte', 'm-calle', 'm-entrada'],
}


def largo(ids):
    return sum(math.dist(NODOS[a], NODOS[b]) for a, b in zip(ids, ids[1:]))


def main():
    for k, ids in RUTAS_FIJAS.items():
        print(f'{k}: {largo(ids):.0f} m · {largo(ids) / 70:.1f} min a pie')
    datos = {
        'origen': [LAT0, LON0],
        'nodos': {k: latlon(*p) for k, p in NODOS.items()},
        'xy': {k: list(p) for k, p in NODOS.items()},
        'tramos': [[a, b, nota, afuera] for a, b, nota, afuera in TRAMOS],
        'lugares': [{'id': i, 'n': n, 'sede': s, 'tipo': t, 'xy': list(p), 'll': latlon(*p), 'nodo': nodo} for i, n, s, t, p, nodo in LUGARES],
        'rutas': {k: {'nodos': ids, 'metros': round(largo(ids))} for k, ids in RUTAS_FIJAS.items()},
    }
    SALIDA_JS.write_text('// Caminos y lugares de las sedes. Lo genera herramientas/datos_mapa.py: no se edita a mano.\n'
                         'const MAPA = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    SALIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
    SALIDA_JSON.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')
    print(SALIDA_JS.name, len(NODOS), 'nodos ·', len(LUGARES), 'lugares')


if __name__ == '__main__':
    main()
