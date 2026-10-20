# Sheraton Santo Domingo en 3D (sede de MINUME XVII)
# Autor: Albert Silvestre
#
# Modelo para planear la logística: torre, podio de salones con sus medidas reales,
# lobby, piscina, Malecón Terrace (la carpa) y la ruta a pie desde el Renaissance Jaragua.
#
#   blender -b --factory-startup -P construir_sheraton.py -- render
#   blender -b --factory-startup -P construir_sheraton.py -- render video
#
# Sin "render" solo guarda el .blend. Con "video" también saca los cuadros del recorrido.
#
# Qué es real y qué es estimado: ver LEEME.txt.
#   Real: contorno y orientación de la torre (OpenStreetMap + foto satelital), medidas, alturas
#         y capacidades de los salones (plano de renta de salones del hotel), carpa del Malecón
#         Terrace (36 x 23 m), ruta a pie trazada sobre el satélite.
#   Estimado: dónde queda cada salón dentro del podio, alturas de la torre (11 pisos), interiores.

import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector

CARPETA = os.path.dirname(os.path.abspath(__file__))
# La foto satelital y los contornos son los mismos del modelo de las dos sedes
SEDES = next(c for c in (os.path.dirname(CARPETA), os.path.join(os.path.expanduser('~'), 'Documents', 'MINUME-Sedes-Blender'))
             if os.path.exists(os.path.join(c, 'satelite_zona.jpg')))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HACER_RENDER, HACER_VIDEO = 'render' in ARGS, 'video' in ARGS
random.seed(17)
# Dentro de la maqueta del plantel (blender/plantel) este script solo arma el hotel
PLANTEL = globals().get('PLANTEL', False)

# ---------------- Ajustes ----------------
PISOS = 11              # pisos de habitaciones (las fichas dicen 10 u 11)
ALTO_PISO = 3.1
ALTO_PODIO = 8.5        # salones (4.2 m de techo) + estructura y mezanine
MONTAJE = {             # cómo se monta cada salón para MINUME: herradura, teatro, escuela, directorio, banquete
    'Samaná': 'herradura', 'Bonanza': 'herradura', 'Constanza': 'herradura',
    'Yarey': 'teatro', 'Da Vinci': 'escuela', 'Board Room': 'directorio',
    'Este I': 'herradura', 'Este II': 'directorio', 'Este III': 'directorio',
    'Este IV': 'directorio', 'Este V': 'directorio', 'Este VI': 'directorio',
}

# ---------------- Geografía (mismo sistema que el modelo de las dos sedes) ----------------
LAT0, LON0 = 18.4628, -69.8988
M_LAT, M_LON = 110540.0, 111320.0 * math.cos(math.radians(LAT0))
ZOOM, TILE_X, TILE_Y = 19, 160342, 234775
FOTO_W, FOTO_H = 2304, 1792

def geo(lat, lon, z=0.0):
    return Vector(((lon - LON0) * M_LON, (lat - LAT0) * M_LAT, z))

def tile_a_latlon(tx, ty):
    n = 2 ** ZOOM
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ty / n)))), tx / n * 360 - 180

# El hotel está girado respecto al norte. Se trabaja en un plano propio:
#   x = hacia el este del hotel (0 = fachada oeste de la torre), y = a lo largo de la torre (hacia el norte)
# Origen y ejes salen del contorno de la torre en OpenStreetMap (way 1454933037).
ORIGEN = Vector((79.2, 4.0, 0))
EJE_Y = Vector((-20.4, 46.6, 0)).normalized()
EJE_X = Vector((EJE_Y.y, -EJE_Y.x, 0))
GIRO = math.atan2(EJE_X.y, EJE_X.x)

def P(x, y, z=0.0):
    return ORIGEN + EJE_X * x + EJE_Y * y + Vector((0, 0, z))

# ---------------- Utilidades ----------------
def material(nombre, color, rugoso=0.6, emision=0.0, metal=0.0, alfa=1.0, transmision=0.0):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rugoso
    p.inputs['Metallic'].default_value = metal
    if emision:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emision
    if transmision:
        p.inputs['Transmission Weight'].default_value = transmision
    if alfa < 1:
        p.inputs['Alpha'].default_value = alfa
        m.surface_render_method = 'BLENDED'
    return m

def coleccion(nombre, padre=None):
    c = bpy.data.collections.new(nombre)
    (padre or bpy.context.scene.collection).children.link(c)
    return c

def enlazar(ob, col):
    for c in ob.users_collection:
        c.objects.unlink(ob)
    col.objects.link(ob)
    return ob

def prisma_mundo(nombre, puntos, z0, z1, mat, col):
    """Extruye un contorno (puntos en metros del mundo) entre dos alturas."""
    bm = bmesh.new()
    vs = [bm.verts.new((p.x, p.y, z0)) for p in puntos]
    try:
        cara = bm.faces.new(vs)
    except ValueError:
        bm.free(); return None
    if cara.normal.z < 0:
        cara.normal_flip()
    hecho = bmesh.ops.extrude_face_region(bm, geom=[cara])
    bmesh.ops.translate(bm, vec=(0, 0, z1 - z0), verts=[v for v in hecho['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    malla = bpy.data.meshes.new(nombre); bm.to_mesh(malla); bm.free()
    ob = bpy.data.objects.new(nombre, malla); ob.data.materials.append(mat); col.objects.link(ob)
    return ob

def prisma(nombre, puntos_xy, z0, z1, mat, col):
    """Igual, pero con puntos en el plano del hotel."""
    return prisma_mundo(nombre, [P(x, y) for x, y in puntos_xy], z0, z1, mat, col)

def caja(nombre, x0, y0, x1, y1, z0, z1, mat, col):
    return prisma(nombre, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], z0, z1, mat, col)

# Piezas que se repiten (sillas, mesas, palmas): una sola malla y muchas copias enlazadas
PIEZAS = {}
def pieza(nombre, construir):
    if nombre not in PIEZAS:
        bm = bmesh.new(); mats = construir(bm)
        m = bpy.data.meshes.new(nombre); bm.to_mesh(m); bm.free()
        for mt in mats:
            m.materials.append(mt)
        PIEZAS[nombre] = m
    return PIEZAS[nombre]

def cubo_bm(bm, cx, cy, cz, sx, sy, sz, idx=0):
    r = bmesh.ops.create_cube(bm, size=1)
    for v in r['verts']:
        v.co.x = cx + v.co.x * sx; v.co.y = cy + v.co.y * sy; v.co.z = cz + v.co.z * sz
    for f in {f for v in r['verts'] for f in v.link_faces}:
        f.material_index = idx

def cilindro_bm(bm, cx, cy, z0, z1, r1, r2=None, lados=16, idx=0):
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r1, radius2=r1 if r2 is None else r2, depth=z1 - z0)
    for v in r['verts']:
        v.co.x += cx; v.co.y += cy; v.co.z += (z0 + z1) / 2
    for f in {f for v in r['verts'] for f in v.link_faces}:
        f.material_index = idx

def poner(malla, nombre, x, y, z, giro, col):
    """Copia enlazada de una pieza, en el plano del hotel; giro en grados respecto al eje y del hotel."""
    ob = bpy.data.objects.new(nombre, malla)
    ob.location = P(x, y, z); ob.rotation_euler.z = GIRO + math.radians(giro)
    col.objects.link(ob)
    return ob

FUENTE = None
def texto(cuerpo, x, y, z, tam, mat, col, plano=True, giro=0.0, mundo=None):
    global FUENTE
    if FUENTE is None and os.path.exists('C:/Windows/Fonts/arialbd.ttf'):
        FUENTE = bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf')
    cu = bpy.data.curves.new(cuerpo, 'FONT'); cu.body = cuerpo; cu.size = tam
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = 0.04 * tam
    if FUENTE:
        cu.font = FUENTE
    ob = bpy.data.objects.new('Texto · ' + cuerpo.replace('\n', ' '), cu)
    ob.location = mundo if mundo is not None else P(x, y, z)
    ob.rotation_euler = (0 if plano else math.pi / 2, 0, GIRO + math.radians(giro))
    ob.data.materials.append(mat); col.objects.link(ob)
    return ob

# ---------------- Escena ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene; escena.name = 'Sheraton Santo Domingo'
escena.unit_settings.system = 'METRIC'

C_SUELO = coleccion('Suelo y zona')
C_TORRE = coleccion('Torre')
C_PODIO = coleccion('Podio y fachadas')
C_TECHOS = coleccion('Techos (se ocultan para ver por dentro)')
C_SALONES = coleccion('Salones')
C_MUEBLES = coleccion('Montaje de los salones')
C_EXTERIOR = coleccion('Piscina, jardines y entradas')
C_CARPA = coleccion('Malecón Terrace')
C_RUTA = coleccion('Ruta a pie')
C_TEXTOS = coleccion('Nombres')

M = {
    'losa': material('Losas blancas', (0.92, 0.91, 0.88), 0.5),
    'vidrio': material('Vidrio azul', (0.10, 0.20, 0.30), 0.08, metal=0.6),
    'muro': material('Muro crema', (0.86, 0.82, 0.74), 0.7),
    'techo': material('Techo del podio', (0.80, 0.80, 0.78), 0.85),
    'cielo_raso': material('Cielo raso', (0.95, 0.94, 0.90), 0.8),
    'alfombra': material('Alfombra salones', (0.28, 0.16, 0.20), 0.95),
    'alfombra2': material('Alfombra azul', (0.12, 0.17, 0.30), 0.95),
    'marmol': material('Mármol lobby', (0.88, 0.86, 0.80), 0.25),
    'madera': material('Madera', (0.38, 0.22, 0.12), 0.45),
    'mantel': material('Mantel blanco', (0.96, 0.96, 0.95), 0.7),
    'mantel_azul': material('Mantel azul MINUME', (0.05, 0.22, 0.55), 0.7),
    'silla': material('Silla', (0.18, 0.18, 0.20), 0.5),
    'silla_dorada': material('Silla dorada', (0.78, 0.62, 0.30), 0.35, metal=0.6),
    'tarima': material('Tarima', (0.10, 0.10, 0.12), 0.4),
    'pantalla': material('Pantalla', (0.55, 0.75, 1.0), 0.2, emision=2.5),
    'agua': material('Agua piscina', (0.10, 0.62, 0.78), 0.05, transmision=0.3),
    'deck': material('Deck piscina', (0.83, 0.76, 0.62), 0.8),
    'cesped': material('Césped', (0.16, 0.38, 0.12), 1.0),
    'tronco': material('Tronco palma', (0.42, 0.33, 0.22), 0.9),
    'hojas': material('Hojas palma', (0.14, 0.40, 0.13), 0.7),
    'carpa': material('Lona carpa', (0.97, 0.97, 0.95), 0.6),
    'piso_carpa': material('Piso carpa', (0.70, 0.62, 0.50), 0.7),
    'zona': material('Edificios vecinos', (0.55, 0.56, 0.58), 0.85),
    'jaragua': material('Renaissance Jaragua', (0.78, 0.62, 0.42), 0.6),
    'ruta': material('Ruta morada', (0.45, 0.04, 1.0), 0.3, emision=2.2),
    'texto': material('Texto blanco', (1, 1, 1), emision=1.5),
    'texto_salon': material('Texto salones', (0.35, 0.90, 1.0), emision=1.8),
    'letrero': material('Letrero Sheraton', (0.75, 0.88, 1.0), emision=6.0),
    'luz_calida': material('Luz cálida', (1.0, 0.85, 0.6), emision=4.0),
    'bandera': material('Bandera ONU', (0.30, 0.60, 0.90), 0.6),
    'mostrador': material('Mostrador', (0.20, 0.13, 0.08), 0.35),
    'sofa': material('Sofá', (0.55, 0.50, 0.44), 0.9),
    'calle': material('Asfalto', (0.16, 0.16, 0.17), 0.95),
}

# ---------------- Suelo: foto satelital real ----------------
if not PLANTEL:
    la_n, lo_o = tile_a_latlon(TILE_X, TILE_Y)
    la_s, lo_e = tile_a_latlon(TILE_X + FOTO_W / 256, TILE_Y + FOTO_H / 256)
    a, b = geo(la_n, lo_o), geo(la_s, lo_e)
    bpy.ops.mesh.primitive_plane_add(size=1, location=((a.x + b.x) / 2, (a.y + b.y) / 2, -0.05))
    suelo = enlazar(bpy.context.active_object, C_SUELO); suelo.name = 'Suelo satelital'
    suelo.scale = (abs(b.x - a.x), abs(a.y - b.y), 1)
    ms = bpy.data.materials.new('Satélite'); ms.use_nodes = True
    img = ms.node_tree.nodes.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(os.path.join(SEDES, 'satelite_zona.jpg'))
    pb = ms.node_tree.nodes['Principled BSDF']; pb.inputs['Roughness'].default_value = 1
    ms.node_tree.links.new(img.outputs['Color'], pb.inputs['Base Color']); suelo.data.materials.append(ms)
    bpy.ops.mesh.primitive_plane_add(size=5000, location=(0, 0, -0.3))
    enlazar(bpy.context.active_object, C_SUELO).data.materials.append(material('Fondo', (0.05, 0.08, 0.12), 1))

    # Edificios vecinos de OpenStreetMap (bajos de detalle, para dar contexto)
    SHERATON_OSM = {272974124, 1454933037}
    TORRE_JARAGUA = [(318, 352), (395, 333), (440, 465), (360, 490)]
    def foto(px, py):
        return geo(*tile_a_latlon(TILE_X + px * 2 / 256, TILE_Y + py * 2 / 256))
    for e in json.load(open(os.path.join(SEDES, 'datos_osm_zona.json'), encoding='utf-8'))['elements']:
        t, g = e.get('tags', {}), e.get('geometry')
        if e['type'] != 'way' or 'building' not in t or not g or e['id'] in SHERATON_OSM:
            continue
        pts = [geo(p['lat'], p['lon']) for p in g]
        if (pts[0] - pts[-1]).length < 0.1:
            pts = pts[:-1]
        if len(pts) < 3 or not all(min(a.x, b.x) + 5 < q.x < max(a.x, b.x) - 5 and min(a.y, b.y) + 5 < q.y < max(a.y, b.y) - 5 for q in pts):
            continue
        if e['id'] == 177332379:
            prisma_mundo('Renaissance Jaragua', pts, 0, 14, M['jaragua'], C_SUELO)
            continue
        alto = 8.0
        if 'building:levels' in t:
            try: alto = float(t['building:levels']) * 3.2
            except ValueError: pass
        prisma_mundo(t.get('name', 'Vecino'), pts, 0, alto, M['zona'], C_SUELO)
    prisma_mundo('Torre del Jaragua', [foto(*p) for p in TORRE_JARAGUA], 14, 35, M['jaragua'], C_SUELO)

# ---------------- Torre: 11 pisos con los balcones en diente de sierra ----------------
LARGO_T, ANCHO_T, DIENTES, SALIENTE = 68.0, 22.0, 9, 2.2
Y0_T = -12.0
def planta_torre(m=0.0):
    """Contorno de un piso. La fachada oeste es en diente de sierra (así se ve en el satélite)."""
    paso, y0, y1 = LARGO_T / DIENTES, Y0_T, Y0_T + LARGO_T
    pts = [(ANCHO_T - m, y0 + m), (ANCHO_T - m, y1 - m)]
    for i in range(DIENTES - 1, -1, -1):
        yt, yb = y0 + (i + 1) * paso, y0 + i * paso
        pts += [(m, min(yt, y1 - m)), (-SALIENTE + m, max(yb + 0.4, y0 + m)), (m, max(yb + 0.4, y0 + m) + 0.01)]
    pts.append((m, y0 + m))
    limpio = []
    for q in pts:
        if not limpio or (Vector(q) - Vector(limpio[-1])).length > 0.05:
            limpio.append(q)
    return limpio

prisma('Torre · planta baja', planta_torre(0.45), 0, ALTO_PODIO, M['vidrio'], C_TORRE)
z = ALTO_PODIO
for piso in range(1, PISOS + 1):
    prisma(f'Torre · losa piso {piso}', planta_torre(0.0), z, z + 0.35, M['losa'], C_TORRE)
    prisma(f'Torre · vidrio piso {piso}', planta_torre(0.45), z + 0.35, z + ALTO_PISO, M['vidrio'], C_TORRE)
    z += ALTO_PISO
prisma('Torre · azotea', planta_torre(0.0), z, z + 0.5, M['losa'], C_TORRE)
prisma('Torre · pretil', planta_torre(0.0), z + 0.5, z + 1.6, M['muro'], C_TORRE)
caja('Torre · cuarto de máquinas', 6, 18, 15, 34, z + 0.5, z + 5.5, M['muro'], C_TORRE)
caja('Torre · cuarto de máquinas 2', 6, 40, 14, 48, z + 0.5, z + 4.0, M['muro'], C_TORRE)
ALTO_TORRE = z
# Núcleo de ascensores que se ve desde el lobby
caja('Torre · núcleo de ascensores', 8, 26, 14, 36, 0, ALTO_PODIO, M['muro'], C_TORRE)
# Letrero en lo alto, mirando al mar (sur) y a la ciudad (norte)
caja('Letrero · panel', 2, Y0_T + 0.2, 19, Y0_T + 0.6, ALTO_TORRE + 1.4, ALTO_TORRE + 5.2, M['tarima'], C_TORRE)
caja('Letrero · panel norte', 2, Y0_T + LARGO_T - 0.6, 19, Y0_T + LARGO_T - 0.2, ALTO_TORRE + 1.4, ALTO_TORRE + 5.2, M['tarima'], C_TORRE)
texto('SHERATON', 10.5, Y0_T - 0.4 + 0.5, ALTO_TORRE + 3.2, 3.4, M['letrero'], C_TORRE, plano=False, giro=0)
texto('SHERATON', 10.5, Y0_T + LARGO_T + 0.4 - 0.5, ALTO_TORRE + 3.2, 3.4, M['letrero'], C_TORRE, plano=False, giro=180)

# ---------------- Podio: salones, lobby y pasillos (techo aparte para poder quitarlo) ----------------
PODIO = [(-1, -12), (60, -12), (60, 66), (44, 66), (44, 64), (20, 64), (20, 58), (-1, 58)]
prisma('Podio · piso', PODIO, -0.05, 0.1, M['marmol'], C_PODIO)
def muros_perimetro(nombre, puntos, z0, z1, grueso, mat, col):
    for i, (p, q) in enumerate(zip(puntos, puntos[1:] + puntos[:1])):
        d = Vector((q[0] - p[0], q[1] - p[1], 0)); L = d.length
        if L < 0.1:
            continue
        n = Vector((-d.y, d.x, 0)).normalized() * grueso
        prisma(f'{nombre} {i}', [(p[0], p[1]), (q[0], q[1]), (q[0] + n.x, q[1] + n.y), (p[0] + n.x, p[1] + n.y)], z0, z1, mat, col)
muros_perimetro('Podio · fachada', PODIO, 0, ALTO_PODIO, 0.4, M['muro'], C_PODIO)
# franja de ventanas del podio
muros_perimetro('Podio · ventanal', PODIO, 1.0, 3.2, 0.45, M['vidrio'], C_PODIO)
prisma('Podio · techo', PODIO, ALTO_PODIO - 0.4, ALTO_PODIO, M['techo'], C_TECHOS)
# equipos de aire acondicionado sobre el podio
for i in range(10):
    caja(f'Podio · aire acondicionado {i + 1}', 30 + (i % 5) * 5.5, 2 + (i // 5) * 9, 33.5 + (i % 5) * 5.5, 6 + (i // 5) * 9, ALTO_PODIO, ALTO_PODIO + 1.6, M['muro'], C_TECHOS)

SALONES = {}   # nombre: (x0, y0, x1, y1, alto)
def salon(nombre, x0, y0, x1, y1, alto, piso='alfombra', datos=''):
    """Salón con piso, muros bajos de vidrio/muro, cielo raso (en Techos) y nombre en el piso."""
    SALONES[nombre] = (x0, y0, x1, y1, alto)
    caja(f'{nombre} · piso', x0, y0, x1, y1, 0.1, 0.16, M[piso], C_SALONES)
    g = 0.2
    for i, (a0, b0, a1, b1) in enumerate(((x0, y0, x1, y0 + g), (x0, y1 - g, x1, y1), (x0, y0, x0 + g, y1), (x1 - g, y0, x1, y1))):
        caja(f'{nombre} · muro {i + 1}', a0, b0, a1, b1, 0.16, alto, M['muro'], C_SALONES)
    caja(f'{nombre} · cielo raso', x0, y0, x1, y1, alto, alto + 0.12, M['cielo_raso'], C_TECHOS)
    # luces del techo (se ven al quitar el techo como puntos cálidos)
    luz = bpy.data.lights.new(f'Luz {nombre}', 'AREA'); luz.shape = 'RECTANGLE'
    luz.size, luz.size_y = (x1 - x0) * 0.8, (y1 - y0) * 0.8; luz.energy = 7 * (x1 - x0) * (y1 - y0)
    ol = bpy.data.objects.new(f'Luz {nombre}', luz); ol.location = P((x0 + x1) / 2, (y0 + y1) / 2, alto - 0.2)
    ol.rotation_euler.z = GIRO; C_SALONES.objects.link(ol)
    texto(nombre.upper() + (f'\n{datos}' if datos else ''), (x0 + x1) / 2, (y0 + y1) / 2, ALTO_PODIO + 0.6, min(2.2, (x1 - x0) / 6), M['texto_salon'], C_TEXTOS, giro=-90 if (y1 - y0) > (x1 - x0) * 1.3 else 0)

# Medidas del plano «Renta de salones» del hotel (metros) · alto de techo
salon('Samaná', 27, 18.5, 43, 27.8, 4.2, datos='9.3 x 16 m')
salon('Bonanza', 27, 27.8, 43, 40.1, 4.2, datos='12.3 x 16 m')
salon('Constanza', 27, 40.1, 43, 49.3, 4.2, datos='9.2 x 16 m')
salon('Yarey', 27, -5.0, 42.6, 17.3, 3.3, datos='15.6 x 22.3 m')
salon('Da Vinci', 45, 30, 59, 41, 3.1, datos='14 x 11 m')
salon('Board Room', 45, 42.5, 52, 48.5, 2.6)
y = -4.0
for nombre, largo in (('Este I', 11.0), ('Este II', 7.43), ('Este III', 7.5), ('Este IV', 7.5)):
    salon(nombre, 45, y, 50.5, y + largo, 2.6); y += largo
salon('Este V', 52, 14, 57.5, 21.5, 2.6); salon('Este VI', 52, 21.5, 57.5, 29, 2.6)
# Gran Salón = Samaná + Bonanza + Constanza abiertos (31 x 16 m): se marca con un borde
texto('GRAN SALÓN (Samaná + Bonanza + Constanza · 31 x 16 m)', 44.2, 34, ALTO_PODIO + 0.6, 0.9, M['texto'], C_TEXTOS, giro=-90)

# Foyer y pasillos
caja('Foyer de salones · alfombra', 22.5, -5, 26.8, 50, 0.1, 0.15, M['alfombra2'], C_SALONES)
caja('Pasillo este · alfombra', 43.2, -4, 44.8, 50, 0.1, 0.15, M['alfombra2'], C_SALONES)
texto('FOYER', 24.6, 22, ALTO_PODIO + 0.6, 1.8, M['texto'], C_TEXTOS, giro=-90)

# Lobby: mostrador de check-in, salas y entrada principal con marquesina
caja('Lobby · piso', 22.5, 56.5, 43.5, 63.5, 0.1, 0.15, M['marmol'], C_SALONES)
caja('Lobby · mostrador check-in', 24, 57.5, 25.2, 63, 0.15, 1.15, M['mostrador'], C_MUEBLES)
caja('Lobby · tope del mostrador', 23.8, 57.3, 25.4, 63.2, 1.15, 1.22, M['marmol'], C_MUEBLES)
for i, (sx, sy) in enumerate(((30, 57.5), (36, 57.5), (30, 61), (36, 61))):
    caja(f'Lobby · sofá {i + 1}', sx, sy, sx + 3.2, sy + 1.0, 0.15, 0.85, M['sofa'], C_MUEBLES)
    caja(f'Lobby · mesa baja {i + 1}', sx + 0.8, sy + 1.4, sx + 2.4, sy + 2.2, 0.15, 0.55, M['madera'], C_MUEBLES)
caja('Lobby · cielo raso', 22.5, 56.5, 43.5, 63.5, 6.0, 6.15, M['cielo_raso'], C_TECHOS)
caja('Entrada principal · marquesina', 25, 64, 39, 72, 4.2, 4.6, M['losa'], C_EXTERIOR)
for i, cx in enumerate((25.4, 38.6)):
    for cy in (68, 71.6):
        caja(f'Marquesina · columna {i}{cy}', cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 0, 4.2, M['muro'], C_EXTERIOR)
luz = bpy.data.lights.new('Luz lobby', 'AREA'); luz.size = 18; luz.energy = 1400
ol = bpy.data.objects.new('Luz lobby', luz); ol.location = P(33, 60, 5.6); C_SALONES.objects.link(ol)
texto('LOBBY · CHECK-IN', 32, 60, ALTO_PODIO + 0.6, 1.4, M['texto'], C_TEXTOS)
texto('ENTRADA PRINCIPAL', 32, 70, 4.75, 1.2, M['texto'], C_TEXTOS)

# Entrada oeste (por donde llegan los grupos que vienen caminando del Jaragua)
caja('Entrada oeste · marquesina', -9, -11, -4, -5, 3.4, 3.7, M['losa'], C_EXTERIOR)
for cx, cy in ((-8.6, -10.6), (-8.6, -5.4)):
    caja('Entrada oeste · columna', cx - 0.25, cy - 0.25, cx + 0.25, cy + 0.25, 0, 3.4, M['muro'], C_EXTERIOR)
texto('ENTRADA OESTE\n(llegada desde el Jaragua)', -6.5, -8, 3.95, 0.8, M['texto'], C_TEXTOS)

# ---------------- Montaje de cada salón ----------------
def silla_bm(bm):
    cubo_bm(bm, 0, 0, 0.45, 0.45, 0.45, 0.06)
    cubo_bm(bm, 0, -0.2, 0.75, 0.45, 0.05, 0.55)
    for dx in (-0.19, 0.19):
        for dy in (-0.19, 0.19):
            cubo_bm(bm, dx, dy, 0.22, 0.04, 0.04, 0.44)
    return [M['silla']]
def silla_dorada_bm(bm):
    silla_bm(bm); return [M['silla_dorada']]
def mesa_recta_bm(bm):
    cubo_bm(bm, 0, 0, 0.74, 1.8, 0.6, 0.04, 0)
    cubo_bm(bm, 0, 0.27, 0.4, 1.8, 0.04, 0.68, 0)
    return [M['mantel_azul']]
def mesa_redonda_bm(bm):
    cilindro_bm(bm, 0, 0, 0.0, 0.76, 0.9, 0.95, 24, 0)
    return [M['mantel']]
def mesa_directorio_bm(bm):
    cubo_bm(bm, 0, 0, 0.74, 1.2, 4.4, 0.06, 0)
    cubo_bm(bm, 0, 0, 0.37, 0.8, 4.0, 0.7, 0)
    return [M['madera']]
SILLA, SILLA_D = pieza('Silla', silla_bm), pieza('Silla dorada', silla_dorada_bm)
MESA, REDONDA, DIRECT = pieza('Mesa 1.8 m', mesa_recta_bm), pieza('Mesa redonda', mesa_redonda_bm), pieza('Mesa de directorio', mesa_directorio_bm)

def tarima(nombre, x0, y0, x1, y1, pantalla=True):
    caja(f'{nombre} · tarima', x0, y0, x1, y1, 0.16, 0.6, M['tarima'], C_MUEBLES)
    if pantalla:
        cx = (x0 + x1) / 2
        caja(f'{nombre} · pantalla', cx - 1.8, y1 - 0.15, cx + 1.8, y1 - 0.05, 1.4, 3.4, M['pantalla'], C_MUEBLES)

def montar(nombre, tipo):
    x0, y0, x1, y1, alto = SALONES[nombre]
    w, h = x1 - x0, y1 - y0; cx = (x0 + x1) / 2
    n = 0
    if tipo == 'herradura':
        # mesa (presidencia) al norte, delegados en U mirando hacia ella; como un comité de MUN
        largo_u = max(3, int((h - 4.2) / 1.85)); ancho_u = max(2, int((w - 3.2) / 1.85))
        ux0 = cx - ancho_u * 0.925; ytop = y1 - 2.6
        poner(MESA, f'{nombre} · mesa presidencia', cx - 0.95, ytop, 0.16, 180, C_MUEBLES)
        poner(MESA, f'{nombre} · mesa presidencia', cx + 0.95, ytop, 0.16, 180, C_MUEBLES)
        for k in (-1.4, -0.45, 0.45, 1.4):
            poner(SILLA_D, f'{nombre} · silla presidencia', cx + k, ytop + 0.75, 0.16, 180, C_MUEBLES)
        caja(f'{nombre} · bandera', cx + 2.6, y1 - 0.8, cx + 2.65, y1 - 0.75, 0.16, 2.4, M['silla'], C_MUEBLES)
        caja(f'{nombre} · bandera tela', cx + 2.65, y1 - 1.6, cx + 2.69, y1 - 0.8, 1.6, 2.4, M['bandera'], C_MUEBLES)
        yb = ytop - 2.2
        for i in range(largo_u):            # brazos de la U
            yy = yb - i * 1.85 - 0.9
            for lado, xx, g in ((-1, ux0, 90), (1, ux0 + ancho_u * 1.85, -90)):
                poner(MESA, f'{nombre} · mesa', xx, yy, 0.16, g, C_MUEBLES)
                for s in (-0.45, 0.45):
                    poner(SILLA, f'{nombre} · silla', xx - lado * 0.75, yy + s, 0.16, g, C_MUEBLES); n += 1
        yfondo = yb - largo_u * 1.85 - 0.3
        for j in range(ancho_u):            # fondo de la U
            xx = ux0 + 0.925 + j * 1.85
            poner(MESA, f'{nombre} · mesa', xx, yfondo, 0.16, 0, C_MUEBLES)
            for s in (-0.45, 0.45):
                poner(SILLA, f'{nombre} · silla', xx + s, yfondo - 0.75, 0.16, 0, C_MUEBLES); n += 1
    elif tipo == 'teatro':
        tarima(nombre, x0 + 1.5, y1 - 3.6, x1 - 1.5, y1 - 0.4)
        filas = int((h - 6.5) / 1.0)
        for f in range(filas):
            yy = y1 - 5.2 - f * 1.0
            for lado in (-1, 1):            # dos bloques con pasillo al centro
                for c in range(int((w / 2 - 1.6) / 0.6)):
                    xx = cx + lado * (0.9 + c * 0.6)
                    poner(SILLA, f'{nombre} · silla', xx, yy, 0.16, 180, C_MUEBLES); n += 1
    elif tipo == 'escuela':
        tarima(nombre, cx - 3, y1 - 2.4, cx + 3, y1 - 0.4)
        for f in range(int((h - 4.2) / 1.5)):
            yy = y1 - 3.8 - f * 1.5
            for lado in (-1, 1):
                for c in range(int((w / 2 - 1.0) / 1.85)):
                    xx = cx + lado * (1.0 + 0.925 + c * 1.85)
                    poner(MESA, f'{nombre} · mesa', xx, yy, 0.16, 180, C_MUEBLES)
                    for s in (-0.45, 0.45):
                        poner(SILLA, f'{nombre} · silla', xx + s, yy + 0.65, 0.16, 180, C_MUEBLES); n += 1
    elif tipo == 'directorio':
        L = min(h - 2.2, 4.4)
        ob = poner(DIRECT, f'{nombre} · mesa', cx, (y0 + y1) / 2, 0.16, 0, C_MUEBLES); ob.scale.y = L / 4.4
        for i in range(int(L / 0.8)):
            yy = (y0 + y1) / 2 - L / 2 + 0.4 + i * 0.8
            poner(SILLA, f'{nombre} · silla', cx - 1.0, yy, 0.16, -90, C_MUEBLES)
            poner(SILLA, f'{nombre} · silla', cx + 1.0, yy, 0.16, 90, C_MUEBLES); n += 2
    return n

PUESTOS = {nombre: montar(nombre, tipo) for nombre, tipo in MONTAJE.items() if nombre in SALONES}

# ---------------- Piscina, jardín y palmas ----------------
prisma('Deck de la piscina', [(-8, -44), (32, -44), (32, -13), (-8, -13)], 0, 0.3, M['deck'], C_EXTERIOR)
prisma('Piscina', [(1, -30), (14, -32), (18, -25), (13, -17), (3, -17.5), (-1, -23)], 0.3, 0.35, M['agua'], C_EXTERIOR)
prisma('Jardín sur', [(-8, -56), (32, -56), (32, -44), (-8, -44)], 0, 0.15, M['cesped'], C_EXTERIOR)
def palma_bm(bm):
    cilindro_bm(bm, 0, 0, 0, 8.5, 0.22, 0.16, 8, 0)
    for k in range(7):
        a = k / 7 * math.tau
        r = bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.5, radius2=0.02, depth=3.4)
        for v in r['verts']:
            v.co.rotate(__import__('mathutils').Euler((math.radians(70), 0, a)))
            v.co.z += 8.4; v.co.x += math.cos(a + math.pi / 2) * 1.4; v.co.y += math.sin(a + math.pi / 2) * 1.4
        for f in {f for v in r['verts'] for f in v.link_faces}:
            f.material_index = 1
    return [M['tronco'], M['hojas']]
PALMA = pieza('Palma', palma_bm)
for i in range(26):
    x, y = random.uniform(-10, 34), random.uniform(-54, -14)
    if -3 < x < 20 and -34 < y < -15:
        continue
    ob = poner(PALMA, 'Palma', x, y, 0.3, random.uniform(0, 360), C_EXTERIOR); ob.scale = (1, 1, random.uniform(0.8, 1.2))
if not PLANTEL:
    for y in range(-6, 60, 9):
        poner(PALMA, 'Palma calle interna', -15, y, 0, random.uniform(0, 360), C_EXTERIOR)

# ---------------- Malecón Terrace: carpa de 36 x 23 m con montaje de banquete ----------------
TX0, TY0, TX1, TY1 = 3.8, 89.0, 26.8, 125.0
caja('Malecón Terrace · piso', TX0, TY0, TX1, TY1, 0, 0.3, M['piso_carpa'], C_CARPA)
for i in range(4):                       # cuatro picos de carpa a lo largo
    y0 = TY0 + i * 9; y1 = y0 + 9
    bm = bmesh.new()
    base = [P(TX0, y0, 3.6), P(TX1, y0, 3.6), P(TX1, y1, 3.6), P(TX0, y1, 3.6)]
    vs = [bm.verts.new(p) for p in base]; pico = bm.verts.new(P((TX0 + TX1) / 2, (y0 + y1) / 2, 8.2))
    for k in range(4):
        bm.faces.new((vs[k], vs[(k + 1) % 4], pico))
    mm = bpy.data.meshes.new('Carpa'); bm.to_mesh(mm); bm.free()
    ob = bpy.data.objects.new(f'Malecón Terrace · techo {i + 1}', mm); ob.data.materials.append(M['carpa']); C_TECHOS.objects.link(ob)
    mod = ob.modifiers.new('Grosor', 'SOLIDIFY'); mod.thickness = 0.08
for x in (TX0, TX1):
    for y in [TY0 + k * 4.5 for k in range(9)]:
        caja('Malecón Terrace · poste', x - 0.12, y - 0.12, x + 0.12, y + 0.12, 0.3, 3.6, M['carpa'], C_CARPA)
tarima('Malecón Terrace', TX0 + 6, TY1 - 4, TX1 - 6, TY1 - 0.6)
mesas_carpa = 0
for fx in range(4):
    for fy in range(9):
        x = TX0 + 3.2 + fx * 5.5; y = TY0 + 3 + fy * 3.35
        if y > TY1 - 6:
            continue
        poner(REDONDA, 'Malecón Terrace · mesa', x, y, 0.3, 0, C_MUEBLES); mesas_carpa += 1
        for k in range(10):
            a = k / 10 * math.tau
            poner(SILLA, 'Malecón Terrace · silla', x + math.cos(a) * 1.25, y + math.sin(a) * 1.25, 0.3, math.degrees(a) - 90 + 180, C_MUEBLES)
texto('MALECÓN TERRACE\n36 x 23 m · banquete', (TX0 + TX1) / 2, TY0 - 2.5, 0.4, 1.6, M['texto'], C_TEXTOS)

# ---------------- Ruta a pie desde el Jaragua (trazada sobre el satélite) ----------------
if not PLANTEL:
    rutas = json.load(open(os.path.join(SEDES, 'rutas_y_puntos.json'), encoding='utf-8'))['rutas']
    def linea_ruta(nombre, pts):
        cu = bpy.data.curves.new(nombre, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.55; cu.bevel_resolution = 2
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts):
            sp.points[i].co = (p.x, p.y, 0.9, 1)
        ob = bpy.data.objects.new(nombre, cu); ob.data.materials.append(M['ruta']); C_RUTA.objects.link(ob)
        resto = 6.0
        for a, b in zip(pts, pts[1:]):         # flechas cada 12 m
            d = b - a; L = d.length; s = resto
            while s < L:
                q = a + d * (s / L)
                bm = bmesh.new(); r = bmesh.ops.create_cone(bm, cap_ends=True, segments=3, radius1=1.4, radius2=0, depth=2.2)
                mm = bpy.data.meshes.new('Flecha'); bm.to_mesh(mm); bm.free()
                f = bpy.data.objects.new(f'{nombre} · flecha', mm); f.data.materials.append(M['ruta'])
                f.location = (q.x, q.y, 1.4); f.rotation_euler = (0, math.pi / 2, math.atan2(d.y, d.x)); C_RUTA.objects.link(f)
                s += 12.0
            resto = s - L
    R_JS = [geo(la, lo) for la, lo in rutas['jaragua-sheraton']['puntos']] + [P(-6.5, -8)]
    R_SM = [P(-6.5, -8), P(-20, -6), P(-20, 64), P(-8, 104), P(TX0 + 0.5, 107)]
    linea_ruta('Ruta Jaragua → Sheraton (entrada oeste)', R_JS)
    linea_ruta('Ruta Sheraton → Malecón Terrace', R_SM)
    texto(f"{rutas['jaragua-sheraton']['metros']} m · {rutas['jaragua-sheraton']['minutos_caminando']:.0f} min a pie desde el Jaragua",
          0, 0, 0, 3.0, M['texto'], C_TEXTOS, mundo=R_JS[len(R_JS) // 2] + Vector((0, 0, 3)))

# ---------------- Cielo, sol y cámaras ----------------
if not PLANTEL:
    mundo = bpy.data.worlds.new('Cielo'); escena.world = mundo; mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.36, 0.55, 0.88, 1)
    mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sol = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN'))
    sol.data.energy = 4.2; sol.data.angle = math.radians(3)
    sol.rotation_euler = (math.radians(40), math.radians(10), math.radians(-30)); escena.collection.objects.link(sol)

    def camara(nombre, desde, hacia, lente=30):
        cam = bpy.data.objects.new(nombre, bpy.data.cameras.new(nombre))
        cam.data.lens = lente; cam.data.clip_start = 0.1; cam.data.clip_end = 3000
        cam.location = desde
        cam.rotation_euler = (Vector(hacia) - Vector(desde)).to_track_quat('-Z', 'Y').to_euler()
        escena.collection.objects.link(cam)
        return cam

    centro = P(25, 25)
    CAMARAS = {   # nombre: (cámara, ¿se quitan los techos?)
        'vista_general': (camara('Cámara · vista general', P(-120, -110, 95), P(20, 30, 10), 30), False),
        'desde_el_mar': (camara('Cámara · desde el mar', P(30, -170, 40), P(20, 20, 22), 32), False),
        'salones_sin_techo': (camara('Cámara · salones sin techo', P(95, -25, 55), P(36, 22, 0), 28), True),
        'samana_comite': (camara('Cámara · Samaná montado como comité', P(35, 19.3, 2.6), P(35, 26.5, 0.9), 16), False),
        'yarey_teatro': (camara('Cámara · Yarey', P(34.8, -4.0, 2.4), P(34.8, 14, 1.8), 16), False),
        'lobby': (camara('Cámara · lobby', P(42, 52, 2.0), P(23, 60, 1.4), 18), False),
        'malecon_terrace': (camara('Cámara · Malecón Terrace', P(50, 140, 26), P(15, 105, 1), 30), True),
        'ruta_desde_jaragua': (camara('Cámara · ruta desde el Jaragua', P(-150, 60, 110), P(-30, 0, 0), 30), False),
    }

    escena.render.engine = 'BLENDER_EEVEE'
    escena.render.resolution_x, escena.render.resolution_y = 1920, 1080
    escena.render.image_settings.file_format = 'PNG'
    escena.view_settings.view_transform = 'Standard'
    escena.view_settings.exposure = -0.2
    escena.eevee.taa_render_samples = 48

    # ---------------- Recorrido animado (escena aparte, sin techos para ver los salones) ----------------
    FPS, SEG = 24, 48
    PASOS = [   # (segundo, cámara, hacia dónde mira)
        (0, P(-160, -40, 70), P(-60, -20, 5)),
        (6, P(-95, -30, 45), P(-20, -5, 2)),             # bajando sobre la ruta desde el Jaragua
        (12, P(-48, -26, 32), P(-6, -8, 2)),             # llegando a la entrada oeste
        (18, P(-60, 45, 75), P(12, 25, 28)),             # sube junto a la torre
        (21, P(10, -20, 80), P(35, 15, 0)),             # por encima de la torre
        (24, P(70, -30, 40), P(35, 15, 0)),              # salones sin techo desde el sureste
        (30, P(70, 30, 26), P(35, 35, 0)),               # Gran Salón (Samaná, Bonanza, Constanza)
        (36, P(55, 80, 22), P(30, 55, 0)),               # lobby
        (42, P(30, 145, 28), P(15, 106, 0)),             # Malecón Terrace
        (48, P(-60, 170, 90), P(15, 60, 10)),            # vista final
    ]
    rec = bpy.data.scenes.new('Recorrido (animación)')
    for c in (C_SUELO, C_TORRE, C_PODIO, C_SALONES, C_MUEBLES, C_EXTERIOR, C_CARPA, C_RUTA, C_TEXTOS):
        rec.collection.children.link(c)
    rec.world = mundo; rec.collection.objects.link(sol)
    rec.render.engine = 'BLENDER_EEVEE'; rec.eevee.taa_render_samples = 16
    rec.render.resolution_x, rec.render.resolution_y = 1280, 720; rec.render.fps = FPS
    rec.frame_start, rec.frame_end = 1, FPS * SEG
    rec.view_settings.view_transform = 'Standard'; rec.view_settings.exposure = -0.2
    rec.render.image_settings.file_format = 'PNG'
    rec.render.filepath = os.path.join(CARPETA, 'recorrido_cuadros', 'cuadro_')
    cam = bpy.data.objects.new('Cámara · recorrido', bpy.data.cameras.new('Cámara · recorrido'))
    cam.data.lens = 26; cam.data.clip_end = 3000; rec.collection.objects.link(cam); rec.camera = cam
    mira = bpy.data.objects.new('Mira del recorrido', None); rec.collection.objects.link(mira)
    for s, desde, hacia in PASOS:
        f = 1 + int(s * FPS)
        cam.location = desde; cam.keyframe_insert('location', frame=f)
        mira.location = hacia; mira.keyframe_insert('location', frame=f)
    for ob in (cam, mira):
        for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action, 'fcurves') else []:
            for k in fc.keyframe_points:
                k.interpolation = 'BEZIER'
    t = cam.constraints.new('TRACK_TO'); t.target = mira; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'

    escena.camera = CAMARAS['vista_general'][0]
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CARPETA, 'Sheraton_Santo_Domingo.blend'))

    total = sum(PUESTOS.values())
    print('PUESTOS POR SALÓN:', PUESTOS, '· total', total, '· mesas en la carpa', mesas_carpa)

    if HACER_RENDER:
        os.makedirs(os.path.join(CARPETA, 'renders'), exist_ok=True)
        for nombre, (cm, sin_techo) in CAMARAS.items():
            C_TECHOS.hide_render = sin_techo
            escena.camera = cm
            escena.render.filepath = os.path.join(CARPETA, 'renders', f'{nombre}.png')
            bpy.ops.render.render(write_still=True, scene=escena.name)
        C_TECHOS.hide_render = False
    if HACER_VIDEO:
        bpy.ops.render.render(animation=True, scene=rec.name)
    print('LISTO: Sheraton Santo Domingo')
