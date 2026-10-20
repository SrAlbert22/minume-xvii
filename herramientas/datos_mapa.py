# Genera src/js/modulo/07-datos-mapa.js: edificios, lugares y caminos de las sedes.
# Autor: Albert Silvestre
#
# Fuentes: OpenStreetMap (contornos) y la foto satelital Esri zoom 19 sobre la que se trazaron
# los caminos (mismas coordenadas que el modelo de Blender, carpeta blender/).
import json, math, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
OSM = RAIZ / 'blender' / 'datos_osm_zona.json'
SALIDA = RAIZ / 'src' / 'js' / 'modulo' / '07-datos-mapa.js'

ZOOM, TILE_X, TILE_Y = 19, 160342, 234775


def foto(px, py):
    """Punto de la foto satelital (a mitad de tamaño) a [lat, lon]."""
    x = TILE_X + px * 2 / 256
    y = TILE_Y + py * 2 / 256
    n = 2 ** ZOOM
    return [round(math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n)))), 7), round(x / n * 360 - 180, 7)]


# Nodos del camino (para calcular rutas) ---------------------------------------
NODOS = {
    'j-lobby': (455, 478), 'j-pasillo': (425, 430), 'j-salones': (430, 515), 'j-oeste': (335, 498), 'j-norte': (418, 380),
    'j-este': (432, 338), 'c-sendero': (470, 300), 'c-parqueo': (490, 242), 'c-canchas': (612, 238), 'c-calle': (636, 262),
    'c-sur': (642, 330), 'c-mar': (652, 385), 's-oeste': (684, 388), 's-salones': (765, 318), 'c-norte': (630, 215),
    'c-lobby-s': (690, 226), 's-lobby': (735, 236), 'm-terraza': (628, 172),
}
# (desde, hasta, instrucción para la persona que camina)
TRAMOS = [
    ('j-lobby', 'j-pasillo', 'Desde el lobby del Jaragua, camina hacia el ala de salones'),
    ('j-pasillo', 'j-norte', 'Sigue por el pasillo interno del Jaragua'),
    ('j-norte', 'j-este', 'Sal por la puerta este del Jaragua, junto a la piscina'),
    ('j-lobby', 'j-salones', 'Entra al área de salones del Jaragua (Anacaona y salones pequeños)'),
    ('j-lobby', 'j-oeste', 'Ve hacia el ala oeste del Jaragua (casino y Teatro La Fiesta)'),
    ('j-este', 'c-sendero', 'Toma el sendero hacia el parqueo'),
    ('c-sendero', 'c-parqueo', 'Sube por el borde del parqueo'),
    ('c-parqueo', 'c-canchas', 'Camina por el lado norte de las canchas de tenis'),
    ('c-canchas', 'c-calle', 'Llega a la calle interna que pasa junto al Sheraton'),
    ('c-calle', 'c-sur', 'Baja por la calle interna hacia el mar, con el Sheraton a tu izquierda'),
    ('c-sur', 'c-mar', 'Sigue bajando hasta la altura de la piscina del Sheraton'),
    ('c-mar', 's-oeste', 'Entra por la puerta oeste del Sheraton'),
    ('s-oeste', 's-salones', 'Dentro del Sheraton, sigue hacia el área de salones'),
    ('c-calle', 'c-norte', 'Sube por la calle interna, alejándote del mar'),
    ('c-norte', 'm-terraza', 'La carpa blanca del Malecón Terrace queda a tu derecha: entra por su lado oeste'),
    ('c-norte', 'c-lobby-s', 'Gira a la derecha hacia la entrada principal del Sheraton'),
    ('c-lobby-s', 's-lobby', 'Llegas al lobby del Sheraton'),
    ('s-lobby', 's-salones', 'Desde el lobby, sigue hacia los salones del Sheraton'),
]

# Lugares que se pueden buscar en el mapa --------------------------------------
#   (id, nombre, sede, tipo, posición en la foto, nodo del camino más cercano)
LUGARES = [
    ('j-lobby', 'Lobby del Jaragua', 'jaragua', 'lobby', (455, 478), 'j-lobby'),
    ('j-este', 'Puerta este del Jaragua', 'jaragua', 'entrada', (432, 338), 'j-este'),
    ('teatro-la-fiesta', 'Teatro La Fiesta', 'jaragua', 'salon', (265, 520), 'j-oeste'),
    ('casino-jaragua', 'Casino Jaragua', 'jaragua', 'casino', (300, 470), 'j-oeste'),
    ('anacaona', 'Anacaona (secciones 1, 2 y 3)', 'jaragua', 'salon', (390, 545), 'j-salones'),
    ('marien', 'Marién', 'jaragua', 'salon', (420, 512), 'j-salones'),
    ('magua', 'Maguá', 'jaragua', 'salon', (430, 520), 'j-salones'),
    ('higuey', 'Higüey', 'jaragua', 'salon', (440, 528), 'j-salones'),
    ('maguana', 'Maguana', 'jaragua', 'salon', (452, 536), 'j-salones'),
    ('las-olas', 'Las Olas', 'jaragua', 'salon', (470, 505), 'j-salones'),
    ('sol-de-oro', 'Sol de Oro', 'jaragua', 'salon', (470, 420), 'j-pasillo'),
    ('atabey', 'Atabey y salas ejecutivas', 'jaragua', 'salon', (445, 462), 'j-lobby'),
    ('s-oeste', 'Entrada oeste del Sheraton', 'sheraton', 'entrada', (684, 388), 's-oeste'),
    ('s-lobby', 'Lobby del Sheraton', 'sheraton', 'lobby', (735, 236), 's-lobby'),
    ('gran-salon', 'Gran Salón', 'sheraton', 'salon', (775, 255), 's-salones'),
    ('samana', 'Samaná', 'sheraton', 'salon', (783, 284), 's-salones'),
    ('bonanza', 'Bonanza', 'sheraton', 'salon', (794, 292), 's-salones'),
    ('constanza', 'Constanza', 'sheraton', 'salon', (805, 300), 's-salones'),
    ('yarey', 'Yarey', 'sheraton', 'salon', (818, 332), 's-salones'),
    ('da-vinci', 'Da Vinci', 'sheraton', 'salon', (796, 368), 's-salones'),
    ('este', 'Salones Este I a VI', 'sheraton', 'salon', (828, 380), 's-salones'),
    ('board-room', 'Board Room', 'sheraton', 'salon', (760, 300), 's-salones'),
    ('malecon-terrace', 'Malecón Terrace (carpa)', 'malecon', 'terraza', (665, 167), 'm-terraza'),
    ('canchas', 'Canchas de tenis', 'jaragua', 'referencia', (548, 285), 'c-canchas'),
    ('encuentro-jaragua', 'Punto de encuentro · frente al Jaragua', 'jaragua', 'encuentro', (470, 600), 'j-lobby'),
    ('encuentro-sheraton', 'Punto de encuentro · frente al Sheraton', 'sheraton', 'encuentro', (700, 455), 's-oeste'),
]

TORRES = {
    'torre-jaragua': ('Torre del Jaragua', 'jaragua', [(318, 352), (395, 333), (440, 465), (360, 490)], 14, 35),
    'torre-sheraton': ('Torre del Sheraton', 'sheraton', [(678, 232), (732, 222), (745, 392), (694, 402)], 12, 38),
}
CARPA = [(630, 128), (700, 132), (700, 206), (628, 204)]
JARAGUA, SHERATON = 177332379, 272974124


def altura(t):
    if 'building:levels' in t:
        try:
            return round(float(t['building:levels']) * 3.2, 1)
        except ValueError:
            pass
    return {'apartments': 12, 'commercial': 10, 'hotel': 30, 'hospital': 12}.get(t.get('building'), 8)


def poligono(pts):
    anillo = [[p[1], p[0]] for p in pts]
    return {'type': 'Polygon', 'coordinates': [anillo + [anillo[0]]]}


def main():
    elementos = json.loads(OSM.read_text(encoding='utf-8'))['elements']
    edificios = []
    for e in elementos:
        t = e.get('tags', {})
        if e['type'] != 'way' or 'building' not in t or not e.get('geometry'):
            continue
        pts = [[round(p['lat'], 7), round(p['lon'], 7)] for p in e['geometry']]
        if not all(18.4600 < la < 18.4665 and -69.9040 < lo < -69.8950 for la, lo in pts):
            continue
        if e['id'] == JARAGUA:
            props = {'n': 'Renaissance Jaragua', 'sede': 'jaragua', 'h': 14, 'b': 0}
        elif e['id'] == SHERATON:
            props = {'n': 'Sheraton Santo Domingo', 'sede': 'sheraton', 'h': 12, 'b': 0}
        else:
            props = {'n': t.get('name', ''), 'sede': '', 'h': altura(t), 'b': 0}
        edificios.append({'type': 'Feature', 'properties': props, 'geometry': poligono(pts[:-1] if pts[0] == pts[-1] else pts)})
    for clave, (n, sede, pts, base, alto) in TORRES.items():
        edificios.append({'type': 'Feature', 'properties': {'n': n, 'sede': sede, 'h': alto, 'b': base}, 'geometry': poligono([foto(*p) for p in pts])})
    edificios.append({'type': 'Feature', 'properties': {'n': 'Malecón Terrace', 'sede': 'malecon', 'h': 5, 'b': 0}, 'geometry': poligono([foto(*p) for p in CARPA])})

    datos = {
        'edificios': {'type': 'FeatureCollection', 'features': edificios},
        'nodos': {k: foto(*p) for k, p in NODOS.items()},
        'tramos': [[a, b, nota] for a, b, nota in TRAMOS],
        'lugares': [{'id': i, 'n': n, 'sede': s, 'tipo': tipo, 'll': foto(*p), 'nodo': nodo} for i, n, s, tipo, p, nodo in LUGARES],
    }
    texto = ('// Datos del mapa de las sedes. Lo genera herramientas/datos_mapa.py: no se edita a mano.\n'
             '// Contornos: © OpenStreetMap. Caminos trazados sobre la foto satelital (Esri World Imagery).\n'
             'const MAPA = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n')
    SALIDA.write_text(texto, encoding='utf-8')
    print(SALIDA.name, len(edificios), 'edificios ·', len(LUGARES), 'lugares ·', round(len(texto) / 1024), 'KB')


if __name__ == '__main__':
    main()
