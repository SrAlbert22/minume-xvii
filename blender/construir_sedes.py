# Sedes de MINUME XVII: Renaissance Santo Domingo Jaragua y Sheraton Santo Domingo
# Autor: Albert Silvestre
#
# Arma la zona en 3D con datos reales:
#   - contornos de los edificios: OpenStreetMap (datos_osm_zona.json)
#   - suelo: foto satelital Esri World Imagery, zoom 19 (satelite_zona.jpg)
#   - rutas y puntos: trazados sobre la foto satelital (rutas_y_puntos.json)
# Las alturas y la ubicación de los salones dentro de cada hotel son estimadas
# (ver LEEME.txt). Se corre así:
#   blender -b --factory-startup -P construir_sedes.py -- render
# Sin "render" solo guarda el .blend y exporta el .glb.

import bpy, bmesh, json, math, os, sys
from mathutils import Vector

CARPETA = os.path.dirname(os.path.abspath(__file__))
HACER_RENDER = 'render' in sys.argv

# ---------- Geografía ----------
LAT0, LON0 = 18.4628, -69.8988                      # centro entre los dos hoteles
M_LAT = 110540.0
M_LON = 111320.0 * math.cos(math.radians(LAT0))
ZOOM, TILE_X, TILE_Y = 19, 160342, 234775           # esquina de la foto satelital
FOTO_W, FOTO_H = 2304, 1792

def local(lat, lon, z=0.0):
    return Vector(((lon - LON0) * M_LON, (lat - LAT0) * M_LAT, z))

def tile_a_latlon(tx, ty):
    n = 2 ** ZOOM
    lon = tx / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ty / n))))
    return lat, lon

def foto(px, py, z=0.0):
    """Punto de la foto satelital a mitad de tamaño (la usada para trazar) a metros locales."""
    return local(*tile_a_latlon(TILE_X + px * 2 / 256, TILE_Y + py * 2 / 256), z)

# ---------- Alturas (metros) ----------
JARAGUA, SHERATON = 177332379, 272974124
ALTURA_BASE = {JARAGUA: 14.0, SHERATON: 12.0}
TORRES = {   # partes altas, medidas sobre la foto satelital
    'Torre Jaragua': ([(318, 352), (395, 333), (440, 465), (360, 490)], 14.0, 35.0),   # 10 pisos
    'Torre Sheraton': ([(678, 232), (732, 222), (745, 392), (694, 402)], 12.0, 38.0),  # 10-11 pisos
}
TERRAZA_ALTO = 5.0       # el Malecón Terrace es una carpa sobre una terraza baja

# ---------- Salones (ubicación aproximada dentro de cada hotel) ----------
SALONES = [
    ('Lobby Jaragua', (455, 478), 'jaragua'),
    ('Teatro La Fiesta', (265, 520), 'jaragua'),
    ('Casino Jaragua', (300, 470), 'jaragua'),
    ('Anacaona A · B · C', (390, 545), 'jaragua'),
    ('Marién · Maguá · Higüey · Maguana', (432, 520), 'jaragua'),
    ('Sol de Oro', (470, 420), 'jaragua'),
    ('Lobby Sheraton', (735, 236), 'sheraton'),
    ('Gran Salón', (775, 255), 'sheraton'),
    ('Samaná · Bonanza · Constanza', (792, 292), 'sheraton'),
    ('Yarey', (818, 332), 'sheraton'),
    ('Da Vinci', (796, 368), 'sheraton'),
    ('Este I – VI', (828, 380), 'sheraton'),
    ('Malecón Terrace', (665, 167), 'terraza'),
]

# ---------- Utilidades ----------
def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def material(nombre, color, emision=0.0, rugoso=0.6, alfa=1.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rugoso
    if emision:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emision
    if alfa < 1:
        p.inputs['Alpha'].default_value = alfa
    return m

def coleccion(nombre):
    c = bpy.data.collections.new(nombre)
    bpy.context.scene.collection.children.link(c)
    return c

def prisma(nombre, puntos, z0, z1, mat, col):
    """Extruye un contorno (lista de Vector en el suelo) entre dos alturas."""
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    verts = [bm.verts.new((p.x, p.y, z0)) for p in puntos]
    try:
        cara = bm.faces.new(verts)
    except ValueError:
        bm.free(); return None
    if cara.normal.z < 0:
        cara.normal_flip()
    hecho = bmesh.ops.extrude_face_region(bm, geom=[cara])
    arriba = [v for v in hecho['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, z1 - z0), verts=arriba)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(malla); bm.free()
    ob = bpy.data.objects.new(nombre, malla)
    ob.data.materials.append(mat)
    col.objects.link(ob)
    return ob

def sin_repetidos(pts):
    out = []
    for p in pts:
        if not out or (p - out[-1]).length > 0.05:
            out.append(p)
    if len(out) > 2 and (out[0] - out[-1]).length < 0.05:
        out.pop()
    return out

def altura_osm(t):
    if 'height' in t:
        try: return float(str(t['height']).split()[0])
        except ValueError: pass
    if 'building:levels' in t:
        try: return float(t['building:levels']) * 3.2
        except ValueError: pass
    return {'apartments': 12.0, 'commercial': 10.0, 'hotel': 30.0, 'hospital': 12.0}.get(t.get('building'), 8.0)

FUENTE = None
def etiqueta(texto, posicion, mat, col, tam=3.2):
    global FUENTE
    if FUENTE is None and os.path.exists('C:/Windows/Fonts/arialbd.ttf'):
        FUENTE = bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf')
    curva = bpy.data.curves.new(texto, 'FONT')
    curva.body = texto; curva.size = tam; curva.align_x = 'CENTER'; curva.extrude = 0.08
    if FUENTE: curva.font = FUENTE
    ob = bpy.data.objects.new('Etiqueta · ' + texto, curva)
    ob.location = posicion
    ob.data.materials.append(mat)
    col.objects.link(ob)
    return ob

def ruta(nombre, puntos_latlon, mat, col, alto=1.2, grosor=0.9):
    curva = bpy.data.curves.new(nombre, 'CURVE')
    curva.dimensions = '3D'; curva.bevel_depth = grosor; curva.bevel_resolution = 3
    sp = curva.splines.new('POLY')
    sp.points.add(len(puntos_latlon) - 1)
    for i, (la, lo) in enumerate(puntos_latlon):
        p = local(la, lo, alto)
        sp.points[i].co = (p.x, p.y, p.z, 1)
    ob = bpy.data.objects.new(nombre, curva)
    ob.data.materials.append(mat)
    col.objects.link(ob)
    # flechas cada 18 m, como la ruta del GPS de un videojuego
    pts = [local(la, lo, alto) for la, lo in puntos_latlon]
    resto = 9.0
    for a, b in zip(pts, pts[1:]):
        tramo = b - a; L = tramo.length; d = resto
        while d < L:
            p = a + tramo * (d / L)
            bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=2.0, depth=3.0, location=p + Vector((0, 0, 0.6)))
            f = bpy.context.active_object
            f.rotation_euler = (0, math.pi / 2, math.atan2(tramo.y, tramo.x))
            f.name = f'{nombre} · flecha'; f.data.materials.append(mat)
            for c in f.users_collection: c.objects.unlink(f)
            col.objects.link(f)
            d += 18.0
        resto = d - L
    return ob

# ---------- Escena ----------
limpiar()
escena = bpy.context.scene
escena.name = 'Sedes MINUME XVII'
escena.unit_settings.system = 'METRIC'

c_suelo, c_zona, c_hoteles, c_rutas, c_salones = (coleccion(n) for n in ('Suelo satelital', 'Edificios de la zona', 'Hoteles sede', 'Rutas', 'Salones'))

M_ZONA = material('Edificio de la zona', (0.42, 0.44, 0.48), rugoso=0.85)
M_JARAGUA = material('Jaragua', (0.72, 0.56, 0.36), rugoso=0.5)
M_SHERATON = material('Sheraton', (0.30, 0.42, 0.62), rugoso=0.45)
M_TORRE_J = material('Torre Jaragua', (0.85, 0.70, 0.48), rugoso=0.35)
M_TORRE_S = material('Torre Sheraton', (0.22, 0.33, 0.52), rugoso=0.3)
M_TERRAZA = material('Malecón Terrace', (1.0, 0.42, 0.42), emision=0.4, rugoso=0.5)
M_RUTA = material('Ruta GPS morada', (0.45, 0.04, 1.0), emision=1.8, rugoso=0.3)
M_RUTA_INT = material('Ruta interna', (1.0, 0.55, 0.0), emision=1.6, rugoso=0.3)
M_TEXTO = material('Texto', (1.0, 1.0, 1.0), emision=1.2)
M_TEXTO_J = material('Texto Jaragua', (1.0, 0.80, 0.25), emision=1.4)
M_TEXTO_S = material('Texto Sheraton', (0.35, 0.90, 1.0), emision=1.4)
M_PIN = material('Pin', (1.0, 0.25, 0.55), emision=1.2)

# Suelo con la foto satelital (mismo encuadre que la imagen descargada)
la_n, lo_o = tile_a_latlon(TILE_X, TILE_Y)
la_s, lo_e = tile_a_latlon(TILE_X + FOTO_W / 256, TILE_Y + FOTO_H / 256)
a, b = local(la_n, lo_o), local(la_s, lo_e)
bpy.ops.mesh.primitive_plane_add(size=1, location=((a.x + b.x) / 2, (a.y + b.y) / 2, 0))
suelo = bpy.context.active_object; suelo.name = 'Suelo satelital'
suelo.scale = (abs(b.x - a.x), abs(a.y - b.y), 1)
ms = bpy.data.materials.new('Satélite'); ms.use_nodes = True
nodos = ms.node_tree.nodes; img = nodos.new('ShaderNodeTexImage')
img.image = bpy.data.images.load(os.path.join(CARPETA, 'satelite_zona.jpg'))
pr = nodos.get('Principled BSDF'); pr.inputs['Roughness'].default_value = 1.0
ms.node_tree.links.new(img.outputs['Color'], pr.inputs['Base Color'])
suelo.data.materials.append(ms)
for c in suelo.users_collection: c.objects.unlink(suelo)
c_suelo.objects.link(suelo)

bpy.ops.mesh.primitive_plane_add(size=4000, location=(0, 0, -0.2))
fondo = bpy.context.active_object; fondo.name = 'Fondo'; fondo.data.materials.append(material('Fondo', (0.05, 0.08, 0.12), rugoso=1))
for c in fondo.users_collection: c.objects.unlink(fondo)
c_suelo.objects.link(fondo)

# Edificios de OpenStreetMap
osm = json.load(open(os.path.join(CARPETA, 'datos_osm_zona.json'), encoding='utf-8'))['elements']
for e in osm:
    t = e.get('tags', {}); g = e.get('geometry')
    if e['type'] != 'way' or 'building' not in t or not g:
        continue
    pts = sin_repetidos([local(p['lat'], p['lon']) for p in g])
    if len(pts) < 3 or not all(min(a.x, b.x) + 5 < q.x < max(a.x, b.x) - 5 and min(a.y, b.y) + 5 < q.y < max(a.y, b.y) - 5 for q in pts):
        continue
    if e['id'] == JARAGUA:
        prisma('Renaissance Jaragua (complejo)', pts, 0, ALTURA_BASE[JARAGUA], M_JARAGUA, c_hoteles)
    elif e['id'] == SHERATON:
        prisma('Sheraton (podio de salones)', pts, 0, ALTURA_BASE[SHERATON], M_SHERATON, c_hoteles)
    else:
        prisma(t.get('name', f'Edificio {e["id"]}'), pts, 0, altura_osm(t), M_ZONA, c_zona)

for nombre, (pts, z0, z1) in TORRES.items():
    prisma(nombre, [foto(*p) for p in pts], z0, z1, M_TORRE_J if 'Jaragua' in nombre else M_TORRE_S, c_hoteles)

datos = json.load(open(os.path.join(CARPETA, 'rutas_y_puntos.json'), encoding='utf-8'))
terraza = [local(la, lo) for la, lo in datos['malecon_terrace']]
prisma('Malecón Terrace (terraza)', terraza, -1.0, 0.6, M_TERRAZA, c_hoteles)
# La carpa: techo a dos aguas sobre la terraza
cx = sum(p.x for p in terraza) / 4; cy = sum(p.y for p in terraza) / 4
eje = (terraza[1] - terraza[0]); ancho = (terraza[3] - terraza[0]).length; largo = eje.length
bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, 0.6 + 2.2))
carpa = bpy.context.active_object; carpa.name = 'Malecón Terrace (carpa)'
carpa.scale = (largo * 0.92, ancho * 0.9, 4.4); carpa.rotation_euler.z = math.atan2(eje.y, eje.x)
carpa.data.materials.append(material('Carpa', (0.97, 0.97, 0.95), rugoso=0.7))
techo = carpa.modifiers.new('Techo', 'SIMPLE_DEFORM'); techo.deform_method = 'TAPER'; techo.factor = -0.35; techo.deform_axis = 'Z'
for c in carpa.users_collection: c.objects.unlink(carpa)
c_hoteles.objects.link(carpa)

# Rutas
nombres_ruta = {'jaragua-sheraton': 'Ruta Jaragua → Sheraton', 'sheraton-malecon': 'Ruta Sheraton → Malecón Terrace', 'lobby-jaragua-salones': 'Ruta interna Jaragua'}
for k, r in datos['rutas'].items():
    ruta(nombres_ruta.get(k, k), r['puntos'], M_RUTA_INT if 'interna' in nombres_ruta.get(k, '') else M_RUTA, c_rutas)

# Salones: pin + nombre flotando
etiquetas = []
for nombre, px, sede in SALONES:
    base = foto(*px)
    tope = {'jaragua': 22.0, 'sheraton': 20.0, 'terraza': 8.0}[sede]
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.35, depth=tope, location=(base.x, base.y, tope / 2))
    pin = bpy.context.active_object; pin.name = f'Pin · {nombre}'; pin.data.materials.append(M_PIN)
    for c in pin.users_collection: c.objects.unlink(pin)
    c_salones.objects.link(pin)
    m = {'jaragua': M_TEXTO_J, 'sheraton': M_TEXTO_S, 'terraza': M_TEXTO}[sede]
    etiquetas.append(etiqueta(nombre, (base.x, base.y, tope + 2.0), m, c_salones, 5.0))
for nombre, sede, px in (('RENAISSANCE JARAGUA', 'jaragua', (380, 440)), ('SHERATON', 'sheraton', (712, 312))):
    p = foto(*px)
    etiquetas.append(etiqueta(nombre, (p.x, p.y, (62 if sede == 'sheraton' else 48)), M_TEXTO_J if sede == 'jaragua' else M_TEXTO_S, c_salones, 10.0))
r = datos['rutas']['jaragua-sheraton']
mitad = r['puntos'][len(r['puntos']) // 2]
etiquetas.append(etiqueta(f"{r['metros']} m · {r['minutos_caminando']:.0f} min a pie", tuple(local(*mitad, 10.0)), M_TEXTO, c_rutas, 6.0))

# Luz, cielo y cámaras
mundo = bpy.data.worlds.new('Cielo'); escena.world = mundo
mundo.use_nodes = True
mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.32, 0.50, 0.85, 1)
mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
sol = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN'))
sol.data.energy = 4.0; sol.data.angle = math.radians(4)
sol.rotation_euler = (math.radians(38), math.radians(8), math.radians(-35))
escena.collection.objects.link(sol)

def camara(nombre, desde, hacia, lente=35):
    cam = bpy.data.objects.new(nombre, bpy.data.cameras.new(nombre))
    cam.data.lens = lente; cam.data.clip_end = 3000
    cam.location = desde
    direccion = Vector(hacia) - Vector(desde)
    cam.rotation_euler = direccion.to_track_quat('-Z', 'Y').to_euler()
    escena.collection.objects.link(cam)
    return cam

j, s, t = foto(400, 450), foto(720, 320), foto(665, 167)
centro = (j + s) / 2
CAMARAS = {
    'vista_general': camara('Cámara · vista general', (centro.x + 120, centro.y - 330, 230), (centro.x, centro.y + 20, 0), 32),
    'ruta_jaragua_sheraton': camara('Cámara · ruta entre hoteles', (centro.x - 40, centro.y - 190, 120), (centro.x + 10, centro.y + 40, 5), 30),
    'malecon_terrace': camara('Cámara · Malecón Terrace', (t.x - 95, t.y + 80, 60), (t.x + 15, t.y - 25, 0), 30),
    'desde_arriba': camara('Cámara · desde arriba', (centro.x, centro.y + 10, 520), (centro.x, centro.y + 10.01, 0), 40),
}

def mirar(cam):
    for ob in etiquetas:
        ob.constraints.clear()
        c = ob.constraints.new('TRACK_TO'); c.target = cam; c.track_axis = 'TRACK_Z'; c.up_axis = 'UP_Y'

escena.render.engine = 'BLENDER_EEVEE'
escena.render.resolution_x, escena.render.resolution_y = 1920, 1080
escena.render.image_settings.file_format = 'PNG'
escena.view_settings.view_transform = 'Standard'
escena.view_settings.exposure = -0.3

escena.camera = CAMARAS['vista_general']; mirar(escena.camera)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CARPETA, 'Sedes_MINUME_Jaragua_Sheraton.blend'))

# GLB para la web: hoteles, terraza y rutas (sin el suelo ni los textos)
for ob in bpy.context.scene.objects: ob.select_set(False)
for col in (c_hoteles, c_rutas):
    for ob in col.objects:
        if ob.type in ('MESH', 'CURVE'): ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(CARPETA, 'sedes_minume.glb'), export_format='GLB', use_selection=True, export_apply=True, export_draco_mesh_compression_enable=True)

if HACER_RENDER:
    for nombre, cam in CAMARAS.items():
        escena.camera = cam; mirar(cam)
        escena.render.filepath = os.path.join(CARPETA, 'renders', f'{nombre}.png')
        bpy.ops.render.render(write_still=True)
print('LISTO: sedes MINUME XVII')
