# Plano 2D de las sedes (estilo del mapa del V CND) · Albert Silvestre
# Saca de OpenStreetMap (blender/datos_osm_zona.json) las calles con su nombre, los edificios, jardines, parqueos,
# piscinas y canchas, y los guarda simplificados en src/js/modulo/07-plano-datos.js para que la página dibuje
# un plano limpio visto desde arriba. Mismo sistema de coordenadas (metros) que el mapa 3D y las rutas.
#   python herramientas/plano_2d.py
import json, math, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
OSM = json.loads((RAIZ / 'blender' / 'datos_osm_zona.json').read_text(encoding='utf-8'))['elements']
LAT0, LON0 = 18.4628, -69.8988
M_LAT, M_LON = 110540.0, 111320.0 * math.cos(math.radians(LAT0))
X0, X1, Y0, Y1 = -215.0, 165.0, -175.0, 150.0          # lo que entra en el plano (metros)
JARAGUA, SHERATON, COSTA = 177332379, {272974124, 1454933037}, 785198534

def xy(e):
    pts = [((p['lon'] - LON0) * M_LON, (p['lat'] - LAT0) * M_LAT) for p in e['geometry']]
    if len(pts) > 2 and math.dist(pts[0], pts[-1]) < 0.1: pts = pts[:-1]
    return pts

def toca(pts, m=0):
    return any(X0 - m <= x <= X1 + m and Y0 - m <= y <= Y1 + m for x, y in pts)

def simple(pts, tol=0.6):
    """Quita puntos casi en línea recta (Douglas-Peucker sencillo)."""
    if len(pts) < 4: return pts
    def dseg(p, a, b):
        ax, ay, bx, by = *a, *b; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L))
        return math.dist(p, (ax + t * dx, ay + t * dy))
    def dp(l):
        if len(l) < 3: return l
        i, d = max(((i, dseg(l[i], l[0], l[-1])) for i in range(1, len(l) - 1)), key=lambda x: x[1])
        return dp(l[:i + 1])[:-1] + dp(l[i:]) if d > tol else [l[0], l[-1]]
    return dp(pts)

r1 = lambda pts: [[round(x, 1), round(y, 1)] for x, y in pts]

edificios, areas, calles, costa = [], [], [], []
for e in OSM:
    t, g = e.get('tags', {}), e.get('geometry')
    if e['type'] != 'way' or not g: continue
    pts = xy(e)
    if e['id'] == COSTA: costa = sorted(pts); continue
    if not toca(pts, 20): continue
    if 'building' in t:
        tipo = 'jaragua' if e['id'] == JARAGUA else 'sheraton' if e['id'] in SHERATON else 'vecino'
        edificios.append({'t': tipo, 'p': r1(simple(pts)), 'n': t.get('name', '') if tipo == 'vecino' else ''})
        continue
    h = t.get('highway')
    if h in ('trunk', 'secondary', 'residential', 'service', 'cycleway'):
        calles.append({'t': h, 'p': r1(simple(pts, 0.8)), 'n': t.get('name', '')})
        continue
    tipo = t.get('leisure') or t.get('amenity') or t.get('landuse')
    tipo = {'garden': 'verde', 'park': 'verde', 'common': 'verde', 'parking': 'parqueo', 'swimming_pool': 'piscina', 'pitch': 'cancha', 'bleachers': 'gradas'}.get(tipo)
    if tipo and len(pts) >= 3: areas.append({'t': tipo, 'p': r1(simple(pts))})

# El mar: todo lo que queda al sur de la línea de la costa
mar = [[X0 - 40, Y0 - 40]] + [[x, y] for x, y in r1(simple(costa, 1.5))] + [[X1 + 40, Y0 - 40]] if costa else []

# La carpa del Malecón Terrace (no está en OSM): el rectángulo de la maqueta, en el plano girado del Sheraton
ox, oy = 79.2, 4.0; ey = (-20.4 / math.hypot(-20.4, 46.6), 46.6 / math.hypot(-20.4, 46.6)); ex = (ey[1], -ey[0])
P = lambda x, y: [round(ox + ex[0] * x + ey[0] * y, 1), round(oy + ex[1] * x + ey[1] * y, 1)]
carpa = [P(1, 86), P(30, 86), P(30, 128), P(1, 128)]

datos = {'caja': [X0, Y0, X1, Y1], 'mar': mar, 'edificios': edificios, 'areas': areas, 'calles': calles, 'carpa': carpa}
salida = RAIZ / 'src' / 'js' / 'modulo' / '07-plano-datos.js'
salida.write_text('// Plano 2D de las sedes: calles, edificios y áreas de OpenStreetMap. Lo genera herramientas/plano_2d.py: no se edita a mano.\n'
                  '// Calles y contornos © colaboradores de OpenStreetMap (ODbL).\nconst PLANO = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'{salida.name}: {len(edificios)} edificios, {len(areas)} áreas, {len(calles)} calles · {round(salida.stat().st_size / 1024)} KB')
