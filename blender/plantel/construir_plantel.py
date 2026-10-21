# Maqueta 3D del plantel: Renaissance Jaragua, Sheraton Santo Domingo y Malecón Terrace
# Autor: Albert Silvestre
#
# Una maqueta diseñada (sin foto satelital): base con el mar, la avenida George Washington,
# calles y aceras, parqueos, jardines, piscinas, canchas, los dos hoteles, la carpa y las palmas.
# La ruta morada va por las aceras modeladas y ningún árbol queda encima de un camino.
#
#   blender -b --factory-startup -P construir_plantel.py -- render web
#     render: imágenes en renders/
#     web:    exporta src/plantel.glb para el mapa 3D de la página
#
# Fuentes: calles, aceras, piscinas, canchas, parqueos, jardines y edificios de OpenStreetMap
# (blender/datos_osm_zona.json); caminos y lugares de herramientas/datos_mapa.py (caminos.json).
# El Sheraton lo arma blender/sheraton/construir_sheraton.py con las medidas reales de los salones.

import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
BLENDER_DIR = os.path.dirname(AQUI)
PLANTEL = True
_sheraton = os.path.join(BLENDER_DIR, 'sheraton', 'construir_sheraton.py')
exec(compile(open(_sheraton, encoding='utf-8').read(), _sheraton, 'exec'))   # arma el Sheraton detallado
CARPETA = AQUI
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
random.seed(21)

X0, X1, Y0, Y1 = -250.0, 190.0, -232.0, 190.0     # borde de la maqueta (metros)
OSM = json.load(open(os.path.join(BLENDER_DIR, 'datos_osm_zona.json'), encoding='utf-8'))['elements']
CAMINOS = json.load(open(os.path.join(AQUI, 'caminos.json'), encoding='utf-8'))

C_BASE = coleccion('Base de la maqueta')
C_CALLES = coleccion('Calles y aceras')
C_AREAS = coleccion('Jardines, parqueos, piscinas y canchas')
C_VECINOS = coleccion('Edificios vecinos')
C_JARAGUA = coleccion('Renaissance Jaragua')
C_ARBOLES = coleccion('Palmas y árboles')
C_RUTA_P = coleccion('Ruta morada')
C_NOMBRES = coleccion('Nombres grandes')

def mat(nombre, color, rugoso=0.8, **kw):
    return material(nombre, color, rugoso, **kw)
MP = {
    'suelo': mat('Suelo de la maqueta', (0.80, 0.78, 0.72), 0.95),
    'borde': mat('Borde de la maqueta', (0.06, 0.09, 0.17), 0.6),
    'mar': mat('Mar', (0.08, 0.36, 0.55), 0.12, metal=0.1),
    'asfalto': mat('Asfalto', (0.20, 0.21, 0.23), 0.9),
    'parqueo': mat('Parqueo', (0.30, 0.31, 0.33), 0.9),
    'linea': mat('Líneas de la calle', (0.95, 0.95, 0.9), 0.6),
    'acera': mat('Acera', (0.90, 0.87, 0.80), 0.85),
    'malecon': mat('Paseo del Malecón', (0.86, 0.72, 0.62), 0.85),
    'cesped': mat('Césped', (0.36, 0.58, 0.28), 0.95),
    'cancha': mat('Cancha de tenis', (0.20, 0.45, 0.55), 0.7),
    'cancha_borde': mat('Borde de la cancha', (0.28, 0.52, 0.32), 0.8),
    'gradas': mat('Gradas', (0.70, 0.70, 0.72), 0.8),
    'borde_piscina': mat('Borde de la piscina', (0.95, 0.94, 0.90), 0.6),
    'muro_vecino': mat('Edificio vecino', (0.93, 0.93, 0.92), 0.85),
    'techo_vecino': mat('Techo vecino', (0.78, 0.79, 0.80), 0.9),
    'jaragua': mat('Jaragua muros', (0.93, 0.84, 0.66), 0.7),
    'jaragua_techo': mat('Jaragua techo', (0.70, 0.52, 0.36), 0.8),
    'jaragua_vidrio': mat('Jaragua vidrio', (0.22, 0.28, 0.30), 0.1, metal=0.5),
    'copa': mat('Copa de árbol', (0.20, 0.45, 0.20), 0.8),
    'ruta': mat('Ruta GPS morada', (0.50, 0.08, 1.0), 0.3, emision=2.4),
    'texto': mat('Texto de la maqueta', (1, 1, 1), emision=1.6),
    'texto_j': mat('Texto Jaragua', (1.0, 0.82, 0.35), emision=1.8),
    'texto_s': mat('Texto Sheraton', (0.40, 0.85, 1.0), emision=1.8),
}

# ---------------- Geometría ----------------
def dentro(p, poly):
    x, y = p; r = False
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            r = not r
    return r

def dist_seg(p, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy)

def recortar(pts):
    """Corta una línea a los bordes de la maqueta; devuelve los pedazos que quedan adentro."""
    def clip(a, b):
        t0, t1 = 0.0, 1.0; dx, dy = b[0] - a[0], b[1] - a[1]
        for p, q in ((-dx, a[0] - X0), (dx, X1 - a[0]), (-dy, a[1] - Y0), (dy, Y1 - a[1])):
            if p == 0:
                if q < 0: return None
            else:
                t = q / p
                if p < 0: t0 = max(t0, t)
                else: t1 = min(t1, t)
        if t0 > t1: return None
        return (a[0] + t0 * dx, a[1] + t0 * dy), (a[0] + t1 * dx, a[1] + t1 * dy)
    piezas, actual = [], []
    for a, b in zip(pts, pts[1:]):
        c = clip(a, b)
        if not c:
            if len(actual) > 1: piezas.append(actual)
            actual = []; continue
        if not actual or math.dist(actual[-1], c[0]) > 0.01:
            if len(actual) > 1: piezas.append(actual)
            actual = [c[0]]
        actual.append(c[1])
    if len(actual) > 1: piezas.append(actual)
    return piezas

def cinta(nombre, pts, ancho, z, material_, col, alto=0.0):
    """Franja de un ancho dado a lo largo de una línea (calle, acera, ruta)."""
    if len(pts) < 2: return None
    bm = bmesh.new(); izq, der = [], []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        d = Vector((b[0] - a[0], b[1] - a[1])).normalized(); n = Vector((-d.y, d.x))
        if 0 < i < len(pts) - 1:
            d1 = Vector((p[0] - a[0], p[1] - a[1])).normalized(); d2 = Vector((b[0] - p[0], b[1] - p[1])).normalized()
            n1 = Vector((-d1.y, d1.x)); m = (n1 + Vector((-d2.y, d2.x))).normalized()
            esc = 1 / max(0.35, m.dot(n1)); n = m * esc
        izq.append(bm.verts.new((p[0] + n.x * ancho / 2, p[1] + n.y * ancho / 2, z + alto)))
        der.append(bm.verts.new((p[0] - n.x * ancho / 2, p[1] - n.y * ancho / 2, z + alto)))
    for i in range(len(pts) - 1):
        bm.faces.new((izq[i], der[i], der[i + 1], izq[i + 1]))
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me); ob.data.materials.append(material_); col.objects.link(ob)
    return ob

def losa(nombre, pts, z0, z1, material_, col, techo=None):
    ob = prisma_mundo(nombre, [Vector((p[0], p[1], 0)) for p in pts], z0, z1, material_, col)
    if ob and techo:
        ob.data.materials.append(techo)
        for f in ob.data.polygons:
            if f.normal.z > 0.9: f.material_index = 1
    return ob

def adentro_de_maqueta(pts, margen=2):
    return all(X0 + margen < x < X1 - margen and Y0 + margen < y < Y1 - margen for x, y in pts)

def xy_osm(e):
    pts = [((p['lon'] - LON0) * M_LON, (p['lat'] - LAT0) * M_LAT) for p in e['geometry']]
    if len(pts) > 2 and math.dist(pts[0], pts[-1]) < 0.1: pts = pts[:-1]
    return pts

def encoger(pts, d):
    """Contorno un poco hacia adentro (para vidrios y bordes)."""
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))
    s = 1 if area > 0 else -1; out = []
    for i, p in enumerate(pts):
        a, b = pts[i - 1], pts[(i + 1) % len(pts)]
        d1 = Vector((p[0] - a[0], p[1] - a[1])).normalized(); d2 = Vector((b[0] - p[0], b[1] - p[1])).normalized()
        n = (Vector((-d1.y, d1.x)) + Vector((-d2.y, d2.x))).normalized() * s
        k = 1 / max(0.4, n.dot(Vector((-d1.y, d1.x)) * s))
        out.append((p[0] + n.x * d * k, p[1] + n.y * d * k))
    return out

# ---------------- Base, tierra y mar ----------------
costa = []
for e in OSM:
    if e.get('id') == 785198534:
        costa = [((p['lon'] - LON0) * M_LON, (p['lat'] - LAT0) * M_LAT) for p in e['geometry']]
costa.sort()
mar_borde = []
for i, p in enumerate(costa):       # el muro del mar queda unos 7 m más allá del paseo
    a, b = costa[max(0, i - 1)], costa[min(len(costa) - 1, i + 1)]
    d = Vector((b[0] - a[0], b[1] - a[1])).normalized()
    mar_borde.append((p[0] + d.y * 7, p[1] - d.x * 7))
def y_costa(x):
    for a, b in zip(mar_borde, mar_borde[1:]):
        if a[0] <= x <= b[0]:
            return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])
linea_costa = [(X0, y_costa(X0))] + [p for p in mar_borde if X0 < p[0] < X1] + [(X1, y_costa(X1))]
TIERRA = [(X0, Y1), (X1, Y1)] + linea_costa[::-1]
MAR = linea_costa + [(X1, Y0), (X0, Y0)]
losa('Maqueta · base', [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)], -5.0, -1.2, MP['borde'], C_BASE)
losa('Maqueta · tierra', TIERRA, -1.2, 0.0, MP['suelo'], C_BASE)
losa('Maqueta · mar', MAR, -1.2, -0.55, MP['mar'], C_BASE)

# ---------------- Áreas: jardines, parqueos, piscinas, canchas, gradas ----------------
EVITAR = []        # polígonos donde no va ningún árbol
JARDINES = []
for e in OSM:
    t, g = e.get('tags', {}), e.get('geometry')
    if e['type'] != 'way' or not g or 'building' in t: continue
    pts = xy_osm(e)
    if len(pts) < 3 or not adentro_de_maqueta(pts): continue
    tipo = t.get('leisure') or t.get('amenity') or t.get('landuse')
    if tipo in ('garden', 'park', 'common'):
        losa(f'Jardín {e["id"]}', pts, 0.0, 0.04, MP['cesped'], C_AREAS); JARDINES.append(pts)
    elif tipo == 'parking':
        losa(f'Parqueo {e["id"]}', pts, 0.0, 0.05, MP['parqueo'], C_AREAS); EVITAR.append(pts)
    elif tipo == 'swimming_pool':
        losa(f'Piscina borde {e["id"]}', pts, 0.0, 0.3, MP['borde_piscina'], C_AREAS)
        losa(f'Piscina {e["id"]}', encoger(pts, 0.8), 0.3, 0.32, M['agua'], C_AREAS); EVITAR.append(pts)
    elif tipo == 'pitch':
        losa(f'Cancha {e["id"]}', pts, 0.0, 0.07, MP['cancha_borde'], C_AREAS)
        adentro = encoger(pts, 2.5)
        losa(f'Cancha juego {e["id"]}', adentro, 0.07, 0.09, MP['cancha'], C_AREAS)
        cinta(f'Cancha líneas {e["id"]}', adentro + adentro[:1], 0.12, 0.1, MP['linea'], C_AREAS)
        a, b = adentro[0], adentro[1]; c, d = adentro[2], adentro[3]
        cinta(f'Cancha red {e["id"]}', [((a[0] + d[0]) / 2, (a[1] + d[1]) / 2), ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)], 0.1, 0.1, MP['linea'], C_AREAS, alto=0.9)
        EVITAR.append(pts)
    elif tipo == 'bleachers':
        losa(f'Gradas {e["id"]}', pts, 0.0, 2.2, MP['gradas'], C_AREAS); EVITAR.append(pts)

# ---------------- Calles con sus líneas ----------------
ANCHOS = {'trunk': 9.0, 'secondary': 10.0, 'residential': 7.0, 'service': 5.5, 'footway': 2.2, 'cycleway': 5.0}
CALLES = []        # (puntos, ancho) para que los árboles no caigan encima
for e in OSM:
    t, g = e.get('tags', {}), e.get('geometry')
    h = t.get('highway')
    if e['type'] != 'way' or not g or h not in ANCHOS: continue
    pts = [((p['lon'] - LON0) * M_LON, (p['lat'] - LAT0) * M_LAT) for p in g]
    for i, pieza_ in enumerate(recortar(pts)):
        if h == 'cycleway':
            cinta(f'Paseo del Malecón {i}', pieza_, ANCHOS[h], 0.05, MP['malecon'], C_CALLES)
        elif h == 'footway':
            cinta(f'Acera {e["id"]}-{i}', pieza_, ANCHOS[h], 0.06, MP['acera'], C_CALLES)
        else:
            cinta(f'{t.get("name", "Calle")} {e["id"]}-{i}', pieza_, ANCHOS[h], 0.04, MP['asfalto'], C_CALLES)
            if h in ('trunk', 'secondary', 'residential'):     # línea discontinua al centro
                largo_t, rayas, s = 0, [], 0.0
                for a, b in zip(pieza_, pieza_[1:]):
                    L = math.dist(a, b); s0 = s
                    while s < s0 + L:
                        u0 = (s - s0) / L; u1 = min(1, (s + 3 - s0) / L)
                        rayas.append([(a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0), (a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1)])
                        s += 7
                for k, r in enumerate(rayas):
                    if math.dist(*r) > 0.5: cinta(f'Raya {e["id"]}-{i}-{k}', r, 0.18, 0.06, MP['linea'], C_CALLES)
        CALLES.append((pieza_, ANCHOS[h]))

# ---------------- Aceras de las rutas a pie (las que usa el GPS) ----------------
XY = CAMINOS['xy']
ACERAS = []
for a, b, _, afuera in CAMINOS['tramos']:
    if afuera:
        ACERAS.append([XY[a], XY[b]])
        cinta(f'Acera {a} – {b}', [XY[a], XY[b]], 2.8, 0.08, MP['acera'], C_CALLES)
for nombre, r in CAMINOS['rutas'].items():
    pts = [XY[n] for n in r['nodos']]
    cinta(f'Ruta {nombre}', pts, 1.1, 0.12, MP['ruta'], C_RUTA_P)
    s = 4.0
    for a, b in zip(pts, pts[1:]):           # flechas planas sobre la acera cada 8 m
        L = math.dist(a, b); d = Vector((b[0] - a[0], b[1] - a[1])).normalized(); n = Vector((-d.y, d.x))
        while s < L:
            c = Vector(a) + d * s
            bm = bmesh.new()
            v = [bm.verts.new((*(c + d * 0.9), 0.14)), bm.verts.new((*(c - d * 0.6 + n * 0.9), 0.14)), bm.verts.new((*(c - d * 0.2), 0.14)), bm.verts.new((*(c - d * 0.6 - n * 0.9), 0.14))]
            bm.faces.new(v); me = bpy.data.meshes.new('Flecha'); bm.to_mesh(me); bm.free()
            ob = bpy.data.objects.new(f'Ruta {nombre} · flecha', me); ob.data.materials.append(MP['ruta']); C_RUTA_P.objects.link(ob)
            s += 8.0
        s -= L

# ---------------- Edificios vecinos (estilo maqueta blanca) ----------------
SHERATON_OSM, JARAGUA_OSM = {272974124, 1454933037}, 177332379
EDIFICIOS = []
for e in OSM:
    t, g = e.get('tags', {}), e.get('geometry')
    if e['type'] != 'way' or not g or 'building' not in t or e['id'] in SHERATON_OSM: continue
    pts = xy_osm(e)
    if len(pts) < 3 or not adentro_de_maqueta(pts): continue
    EDIFICIOS.append(pts)
    if e['id'] == JARAGUA_OSM: continue
    alto = {'apartments': 18.0, 'commercial': 9.0, 'hotel': 24.0, 'house': 6.5, 'school': 8.0, 'hospital': 14.0}.get(t.get('building'), 8.0)
    if 'building:levels' in t:
        try: alto = float(t['building:levels']) * 3.2
        except ValueError: pass
    losa(t.get('name', f'Vecino {e["id"]}'), pts, 0, alto, MP['muro_vecino'], C_VECINOS, techo=MP['techo_vecino'])

# ---------------- Renaissance Jaragua ----------------
jar = next(xy_osm(e) for e in OSM if e.get('id') == JARAGUA_OSM)
losa('Jaragua · complejo', jar, 0, 12, MP['jaragua'], C_JARAGUA, techo=MP['jaragua_techo'])
for z in (2.0, 6.5):         # franjas de ventanas del complejo (salones, casino, lobby)
    losa(f'Jaragua · ventanal {z}', encoger(jar, -0.12), z, z + 2.4, MP['jaragua_vidrio'], C_JARAGUA)
def foto_xy(px, py):
    n = 2 ** ZOOM; xt, yt = TILE_X + px * 2 / 256, TILE_Y + py * 2 / 256
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yt / n)))); lon = xt / n * 360 - 180
    return ((lon - LON0) * M_LON, (lat - LAT0) * M_LAT)
torre_j = [foto_xy(*p) for p in [(318, 352), (395, 333), (440, 465), (360, 490)]]
for _ in range(40):                       # la torre (sacada de la foto) se achica hasta quedar dentro del complejo: no flota sobre la acera
    if all(dentro(p, jar) for p in torre_j): break
    torre_j = encoger(torre_j, 0.5)
z = 12.0
for piso in range(1, 9):                  # torre del Jaragua: 8 pisos sobre el complejo
    losa(f'Jaragua · torre losa {piso}', torre_j, z, z + 0.35, MP['jaragua'], C_JARAGUA)
    losa(f'Jaragua · torre vidrio {piso}', encoger(torre_j, 0.5), z + 0.35, z + 2.9, MP['jaragua_vidrio'], C_JARAGUA)
    z += 2.9
losa('Jaragua · torre azotea', torre_j, z, z + 1.2, MP['jaragua'], C_JARAGUA, techo=MP['jaragua_techo'])
EVITAR += [jar, torre_j]

# ---------------- Palmas y árboles (nunca encima de calles, aceras ni rutas) ----------------
def arbol_bm(bm):
    cilindro_bm(bm, 0, 0, 0, 3.2, 0.25, 0.2, 8, 0)
    r = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=2.6)
    for v in r['verts']: v.co.z += 4.6; v.co.x *= 1.0; v.co.z = 4.6 + (v.co.z - 4.6) * 0.8
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = 1
    return [M['tronco'], MP['copa']]
ARBOL = pieza('Árbol', arbol_bm)
SHERATON_ZONA = [P(-9, -60), P(62, -60), P(62, 72), P(-9, 72)]
CARPA_ZONA = [P(1, 86), P(30, 86), P(30, 128), P(1, 128)]
EVITAR += [[(v.x, v.y) for v in SHERATON_ZONA], [(v.x, v.y) for v in CARPA_ZONA]]
def libre(p, holgura=2.5):
    if not (X0 + 3 < p[0] < X1 - 3 and Y0 + 3 < p[1] < Y1 - 3) or not dentro(p, TIERRA): return False
    if any(dentro(p, poly) for poly in EVITAR + EDIFICIOS): return False
    for pts, ancho in CALLES:
        if any(dist_seg(p, a, b) < ancho / 2 + holgura for a, b in zip(pts, pts[1:])): return False
    if any(dist_seg(p, a, b) < 1.4 + holgura + 1 for a, b in ACERAS): return False
    return True
puestos = []
def plantar(p, tipo):
    if libre(p) and all(math.dist(p, q) > 4.5 for q in puestos):
        puestos.append(p)
        ob = bpy.data.objects.new('Palma' if tipo == 'palma' else 'Árbol', PALMA if tipo == 'palma' else ARBOL)
        ob.location = (p[0], p[1], 0); ob.rotation_euler.z = random.uniform(0, math.tau)
        ob.scale = (1, 1, random.uniform(0.85, 1.25)); C_ARBOLES.objects.link(ob)
for poly in JARDINES:                    # jardines: mezcla de palmas y árboles
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))) / 2
    for _ in range(int(area / 90)):
        p = (random.uniform(min(xs), max(xs)), random.uniform(min(ys), max(ys)))
        if dentro(p, poly): plantar(p, random.choice(('palma', 'palma', 'arbol')))
for a, b in zip(costa, costa[1:]):       # palmas a lo largo del Malecón, del lado de la ciudad
    d = Vector((b[0] - a[0], b[1] - a[1])); L = d.length; d.normalize(); n = Vector((-d.y, d.x))
    s = 0.0
    while s < L:
        plantar(tuple(Vector(a) + d * s + n * 5.0), 'palma'); s += 12
for pts, ancho in CALLES:                # árboles en las orillas de las calles internas
    if ancho != ANCHOS['service']: continue
    for a, b in zip(pts, pts[1:]):
        d = Vector((b[0] - a[0], b[1] - a[1])); L = d.length
        if L < 1: continue
        d.normalize(); n = Vector((-d.y, d.x)); s = 6.0
        while s < L:
            for lado in (1, -1): plantar(tuple(Vector(a) + d * s + n * lado * 6.5), random.choice(('palma', 'arbol')))
            s += 14
for _ in range(500):                     # algo de verde suelto en los espacios abiertos
    plantar((random.uniform(X0, X1), random.uniform(Y0, Y1)), random.choice(('palma', 'arbol', 'arbol')))
print('ÁRBOLES:', len(puestos))

# ---------------- La ruta morada no pasa por encima de árboles ni atraviesa nada ----------------
# La página dibuja la ruta sobre cualquier tramo (también desde el GPS), así que se revisan todos.
TRAMOS = [(XY[a], XY[b], a, b, afuera) for a, b, _, afuera in CAMINOS['tramos']]
def cerca_de_ruta(p, holgura):
    return min(dist_seg(p, a, b) for a, b, *_ in TRAMOS) < holgura
quitados = 0
for ob in list(escena.objects):          # palmas y árboles (también las del Sheraton) a menos de 6 m de un tramo: la copa no tapa la ruta
    if ob.name.startswith(('Palma', 'Árbol')) and cerca_de_ruta((ob.matrix_world.translation.x, ob.matrix_world.translation.y), 6.0):
        bpy.data.objects.remove(ob); quitados += 1
print('ÁRBOLES QUITADOS DE LA RUTA:', quitados)
def revisar_ruta():
    # se «mira desde arriba» cada medio metro de la ruta (y 1 m a cada lado): nada más alto que el suelo puede taparla
    deps = bpy.context.evaluated_depsgraph_get(); choques = {}
    for a, b, na, nb, afuera in TRAMOS:
        if not afuera: continue                  # los tramos de adentro van por los pasillos de los hoteles
        d = Vector((b[0] - a[0], b[1] - a[1])); L = d.length
        if L < 0.1: continue
        d.normalize(); n = Vector((-d.y, d.x)); pasos = max(2, int(L / 0.5))
        for i in range(pasos + 1):
            c = Vector(a) + d * (L * i / pasos)
            for lado in (0, 1.0, -1.0):          # la ruta de la página mide 2 m de ancho
                q = c + n * lado
                ok, loc, _, _, ob, _ = escena.ray_cast(deps, Vector((q.x, q.y, 300)), Vector((0, 0, -1)))
                if ok and loc.z > 0.6 and not ob.name.startswith(('Ruta', 'Flecha', 'Raya')):
                    choques.setdefault(f'{na} → {nb}', set()).add(ob.name.split('.')[0])
    return choques
CHOQUES = revisar_ruta()
print('CHOQUES DE LA RUTA:', json.dumps({k: sorted(v) for k, v in CHOQUES.items()}, ensure_ascii=False))

# ---------------- Nombres grandes (solo para las imágenes) ----------------
NOMBRES = [
    texto('RENAISSANCE JARAGUA', 0, 0, 0, 8, MP['texto_j'], C_NOMBRES, mundo=Vector((-130, -40, 52))),
    texto('SHERATON', 0, 0, 0, 8, MP['texto_s'], C_NOMBRES, mundo=P(10, 25, 58)),
    texto('MALECÓN TERRACE', 0, 0, 0, 5, MP['texto'], C_NOMBRES, mundo=P(15, 107, 16)),
    texto(f"{CAMINOS['rutas']['jaragua-sheraton']['metros']} m · {CAMINOS['rutas']['jaragua-sheraton']['metros'] / 70:.0f} min a pie", 0, 0, 0, 4.5, MP['texto'], C_NOMBRES, mundo=Vector((-30, 78, 9))),
]
texto('Avenida George Washington', 0, 0, 0, 4, MP['texto'], C_NOMBRES, mundo=Vector((-60, -150, 0.3))).rotation_euler = (0, 0, math.radians(20))
texto('MAR CARIBE', 0, 0, 0, 12, MP['texto'], C_NOMBRES, mundo=Vector((60, -180, -0.4))).rotation_euler = (0, 0, math.radians(28))

# Los techos llevan una marca en el nombre: en la página se esconden con «Ver salones por dentro»
for ob in list(C_TECHOS.all_objects):
    ob.name = 'TECHO ' + ob.name

# ---------------- Luz y cámaras ----------------
mundo = bpy.data.worlds.new('Cielo'); escena.world = mundo; mundo.use_nodes = True
mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.58, 0.85, 1)
mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
sol = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN'))
sol.data.energy = 4.0; sol.data.angle = math.radians(3)
sol.rotation_euler = (math.radians(42), math.radians(8), math.radians(-35)); escena.collection.objects.link(sol)
def cam(nombre, desde, hacia, lente=32):
    c = bpy.data.objects.new(nombre, bpy.data.cameras.new(nombre)); c.data.lens = lente; c.data.clip_end = 4000
    c.location = desde; c.rotation_euler = (Vector(hacia) - Vector(desde)).to_track_quat('-Z', 'Y').to_euler()
    escena.collection.objects.link(c); return c
CAMS = {   # nombre: (cámara, ¿sin techos?)
    'plantel_general': (cam('Cámara · plantel completo', (190, -330, 230), (-30, 0, 0), 30), False),
    'ruta_jaragua_sheraton': (cam('Cámara · ruta Jaragua → Sheraton', (-40, 250, 170), (-10, 20, 0), 30), False),
    'desde_arriba': (cam('Cámara · desde arriba', (-30, -20, 560), (-30, -19.99, 0), 40), False),
    'jaragua': (cam('Cámara · Jaragua', (-300, -60, 110), (-120, -40, 10), 30), False),
    'sheraton': (cam('Cámara · Sheraton', (250, -110, 95), (90, 25, 15), 30), False),
    'sheraton_salones': (cam('Cámara · salones del Sheraton', tuple(P(110, -30, 70)), tuple(P(36, 22, 0)), 28), True),
    'malecon_terrace': (cam('Cámara · Malecón Terrace', (120, 175, 50), (50, 105, 0), 30), True),
}
escena.render.engine = 'BLENDER_EEVEE'
escena.render.resolution_x, escena.render.resolution_y = 1920, 1080
escena.render.image_settings.file_format = 'PNG'
escena.view_settings.view_transform = 'Standard'; escena.view_settings.exposure = -0.15
escena.eevee.taa_render_samples = 48
def mirar(c):
    for ob in NOMBRES:
        ob.constraints.clear(); k = ob.constraints.new('TRACK_TO'); k.target = c; k.track_axis = 'TRACK_Z'; k.up_axis = 'UP_Y'
escena.camera = CAMS['plantel_general'][0]; mirar(escena.camera)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AQUI, 'Plantel_MINUME_XVII.blend'))

# ---------------- Exportar para la página ----------------
if 'web' in ARGS:
    deps = bpy.context.evaluated_depsgraph_get()
    for ob in list(C_TORRE.objects):          # los letreros de texto pasan a malla para que se exporten
        if ob.type == 'FONT':
            me = bpy.data.meshes.new_from_object(ob.evaluated_get(deps))
            nuevo = bpy.data.objects.new(ob.name, me); nuevo.matrix_world = ob.matrix_world; C_TORRE.objects.link(nuevo)
            bpy.data.objects.remove(ob)
    fuera = {C_MUEBLES, C_TEXTOS, C_NOMBRES, C_RUTA_P, C_RUTA}
    for ob in escena.objects: ob.select_set(False)
    for ob in escena.objects:
        if ob.type == 'MESH' and not any(ob.name in c.objects for c in fuera):
            ob.select_set(True)
    destino = os.path.join(os.path.dirname(BLENDER_DIR), 'src', 'plantel.glb')
    bpy.ops.export_scene.gltf(filepath=destino, export_format='GLB', use_selection=True, export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                              export_lights=False, export_cameras=False)
    print('GLB:', destino, round(os.path.getsize(destino) / 1e6, 2), 'MB')

if 'render' in ARGS:
    os.makedirs(os.path.join(AQUI, 'renders'), exist_ok=True)
    for nombre, (c, sin_techo) in CAMS.items():
        C_TECHOS.hide_render = sin_techo
        escena.camera = c; mirar(c)
        escena.render.filepath = os.path.join(AQUI, 'renders', f'{nombre}.png')
        bpy.ops.render.render(write_still=True)
    C_TECHOS.hide_render = False
print('LISTO: maqueta del plantel')
