# Salones de eventos de MINUME XVII en 3D, por dentro y montados
# Autor: Albert Silvestre
#
#   blender -b --factory-startup -P construir_salones.py -- render
#
# Cuatro escenas, una por salón, con medidas y capacidades del cuadro de cada hotel y el estilo de
# las fotos del lugar (ver LEEME.txt):
#   Teatro La Fiesta (Jaragua) ....... ceremonia de apertura, 1,152 butacas y presídium
#   Anacaona (Jaragua) ............... 40 x 18 m, dividido en 3 secciones montadas como comités
#   Gran Salón (Sheraton) ............ 31 x 16 m: Samaná, Bonanza y Constanza como comités
#   Malecón Terrace (carpa Sheraton) . 36 x 23 m, almuerzo para 500 (49 mesas de 10 + mesa principal)

import bpy, bmesh, math, os, sys
from mathutils import Vector, Euler

AQUI = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------- Materiales ----------------
def material(nombre, color, rugoso=0.6, metal=0.0, emision=0.0, imagen=None, alfa=1.0):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rugoso; p.inputs['Metallic'].default_value = metal
    if emision:
        p.inputs['Emission Color'].default_value = (*color, 1); p.inputs['Emission Strength'].default_value = emision
    if imagen:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(AQUI, imagen))
        m.node_tree.links.new(t.outputs['Color'], p.inputs['Base Color']); m.node_tree.links.new(t.outputs['Color'], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = emision or 1.5
    if alfa < 1:
        p.inputs['Alpha'].default_value = alfa; m.surface_render_method = 'BLENDED'
    return m
M = {
    'negro': material('Techo negro', (0.02, 0.02, 0.025), 0.9),
    'crema': material('Muro crema', (0.80, 0.72, 0.58), 0.75),
    'crema_claro': material('Muro crema claro', (0.90, 0.85, 0.74), 0.7),
    'madera': material('Madera oscura', (0.20, 0.11, 0.06), 0.45),
    'piso_teatro': material('Piso del teatro', (0.10, 0.09, 0.09), 0.6),
    'alfombra_gris': material('Alfombra gris', (0.30, 0.31, 0.34), 0.95),
    'alfombra_beige': material('Alfombra beige', (0.62, 0.52, 0.40), 0.95),
    'alfombra_azul': material('Alfombra azul', (0.10, 0.16, 0.32), 0.95),
    'telon': material('Telón rojo', (0.45, 0.02, 0.06), 0.55),
    'tarima': material('Tarima', (0.05, 0.05, 0.06), 0.4),
    'butaca': material('Butaca', (0.32, 0.04, 0.06), 0.7),
    'silla_oscura': material('Silla de conferencia', (0.16, 0.13, 0.12), 0.6),
    'dorado': material('Dorado', (0.80, 0.60, 0.25), 0.3, metal=0.9),
    'blanco': material('Silla blanca', (0.95, 0.95, 0.94), 0.3),
    'mantel': material('Mantel blanco', (0.96, 0.96, 0.95), 0.8),
    'mantel_azul': material('Mantel azul MINUME', (0.05, 0.20, 0.52), 0.8),
    'mantel_dorado': material('Mantel dorado', (0.62, 0.48, 0.24), 0.6, metal=0.3),
    'aluminio': material('Aluminio', (0.75, 0.76, 0.78), 0.3, metal=0.9),
    'lona': material('Lona de la carpa', (0.97, 0.97, 0.96), 0.7),
    'piso_carpa': material('Piso de la carpa', (0.42, 0.40, 0.38), 0.6),
    'cristal': material('Cristal', (1.0, 0.93, 0.80), 0.05, emision=1.4),
    'foco': material('Foco', (1.0, 0.95, 0.85), 0.2, emision=12.0),
    'foco_azul': material('Luz azul', (0.25, 0.55, 1.0), 0.2, emision=8.0),
    'foco_turquesa': material('Luz turquesa', (0.3, 0.95, 0.9), 0.2, emision=5.0),
    'verde': material('Follaje', (0.12, 0.36, 0.12), 0.8),
    'pantalla': material('Pantalla MINUME', (1, 1, 1), 0.3, emision=1.6, imagen='pantalla_minume.png'),
    'banner': material('Banner MINUME', (1, 1, 1), 0.5, emision=1.2, imagen='banner_minume.png'),
    'baranda': material('Baranda de vidrio', (0.7, 0.8, 0.9), 0.05, alfa=0.35),
    'bandera_onu': material('Bandera ONU', (0.30, 0.60, 0.90), 0.6),
    'bandera_rd_a': material('Bandera RD azul', (0.0, 0.18, 0.55), 0.6),
    'bandera_rd_r': material('Bandera RD rojo', (0.80, 0.07, 0.15), 0.6),
    'muro_movil': material('Muro móvil', (0.72, 0.66, 0.55), 0.8),
    'agua': material('Botella de agua', (0.7, 0.85, 1.0), 0.05, alfa=0.5),
}

# ---------------- Piezas (una malla, muchas copias) ----------------
def malla(nombre, partes):
    """partes: lista de (tipo, centro, tamaño o radio/alto, material)."""
    bm = bmesh.new(); mats = []
    for tipo, c, t, m in partes:
        if m not in mats: mats.append(m)
        idx = mats.index(m)
        if tipo == 'caja':
            r = bmesh.ops.create_cube(bm, size=1)
            for v in r['verts']: v.co = Vector((c[0] + v.co.x * t[0], c[1] + v.co.y * t[1], c[2] + v.co.z * t[2]))
        elif tipo == 'cil':
            r = bmesh.ops.create_cone(bm, cap_ends=True, segments=t[3] if len(t) > 3 else 20, radius1=t[0], radius2=t[1], depth=t[2])
            for v in r['verts']: v.co += Vector(c)
        elif tipo == 'esfera':
            r = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=t)
            for v in r['verts']: v.co += Vector(c)
        for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = idx
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    return me

BUTACA = malla('Butaca', [('caja', (0, 0, 0.45), (0.5, 0.48, 0.12), M['butaca']), ('caja', (0, -0.22, 0.85), (0.5, 0.08, 0.7), M['butaca']),
                          ('caja', (-0.27, 0, 0.55), (0.05, 0.45, 0.3), M['tarima']), ('caja', (0.27, 0, 0.55), (0.05, 0.45, 0.3), M['tarima'])])
CHIAVARI = malla('Silla chiavari', [('caja', (0, 0, 0.46), (0.42, 0.42, 0.06), M['mantel']), ('caja', (0, -0.2, 0.75), (0.42, 0.04, 0.6), M['dorado'])] +
                 [('cil', (x, y, 0.23), (0.018, 0.018, 0.46, 6), M['dorado']) for x in (-0.18, 0.18) for y in (-0.18, 0.18)])
FANTASMA = malla('Silla blanca medallón', [('caja', (0, 0, 0.46), (0.46, 0.46, 0.07), M['blanco']), ('caja', (0, -0.22, 0.84), (0.40, 0.05, 0.62), M['blanco']), ('caja', (0, -0.22, 1.16), (0.30, 0.05, 0.06), M['blanco'])] +
                 [('cil', (x, y, 0.23), (0.02, 0.02, 0.46, 6), M['blanco']) for x in (-0.19, 0.19) for y in (-0.19, 0.19)])
CONFERENCIA = malla('Silla de conferencia', [('caja', (0, 0, 0.46), (0.48, 0.48, 0.08), M['silla_oscura']), ('caja', (0, -0.22, 0.78), (0.48, 0.06, 0.55), M['silla_oscura'])] +
                    [('cil', (x, y, 0.22), (0.02, 0.02, 0.44, 6), M['aluminio']) for x in (-0.2, 0.2) for y in (-0.2, 0.2)])
MESA_REDONDA = lambda mat: malla('Mesa redonda', [('cil', (0, 0, 0.38), (0.92, 0.95, 0.76, 32), mat), ('cil', (0, 0, 0.98), (0.02, 0.02, 0.4, 6), M['dorado']),
                                                ('esfera', (0, 0, 1.22), 0.22, M['verde']), ('cil', (0.4, 0.1, 0.86), (0.035, 0.035, 0.2, 8), M['agua'])])
MESA_RECTA = malla('Mesa 1.8 m con faldón', [('caja', (0, 0, 0.75), (1.8, 0.6, 0.04), M['mantel_azul']), ('caja', (0, 0.28, 0.38), (1.8, 0.04, 0.74), M['mantel_azul']),
                                            ('cil', (-0.5, -0.1, 0.84), (0.035, 0.035, 0.2, 8), M['agua']), ('cil', (0.5, -0.1, 0.84), (0.035, 0.035, 0.2, 8), M['agua'])])
# Lámpara de cristal: aro dorado con cristales colgando en dos anillos y una gota al centro
LAMPARA = malla('Lámpara de cristal', [('cil', (0, 0, 0.15), (0.62, 0.62, 0.04, 28), M['dorado']), ('cil', (0, 0, -0.25), (0.38, 0.38, 0.03, 24), M['dorado']),
    ('cil', (0, 0, 0.75), (0.015, 0.015, 1.2, 6), M['dorado']), ('cil', (0, 0, 0.3), (0.18, 0.06, 0.3, 12), M['dorado'])] +
    [('esfera', (math.cos(a) * 0.6, math.sin(a) * 0.6, 0.15 - 0.12 * (k % 2)), 0.06, M['cristal']) for k, a in enumerate(i / 18 * math.tau for i in range(18))] +
    [('esfera', (math.cos(a) * 0.36, math.sin(a) * 0.36, -0.36), 0.05, M['cristal']) for a in (i / 12 * math.tau for i in range(12))] +
    [('esfera', (0, 0, z), r, M['cristal']) for z, r in ((-0.45, 0.09), (-0.62, 0.07), (-0.76, 0.05))])
FAROL = malla('Lámpara colgante', [('cil', (0, 0, 0), (0.55, 0.55, 0.45, 16), M['cristal']), ('cil', (0, 0, 0.6), (0.02, 0.02, 0.8, 6), M['madera'])])
FOCO = malla('Foco de techo', [('cil', (0, 0, 0), (0.12, 0.12, 0.05, 10), M['foco'])])

def poner(me, x, y, z=0.0, giro=0.0, col=None, escala=1.0):
    ob = bpy.data.objects.new(me.name, me); ob.location = (x, y, z); ob.rotation_euler.z = math.radians(giro); ob.scale = (escala,) * 3
    (col or bpy.context.scene.collection).objects.link(ob); return ob

def caja(nombre, x0, y0, x1, y1, z0, z1, mat, col):
    ob = poner(malla(nombre, [('caja', ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (x1 - x0, y1 - y0, z1 - z0), mat)]), 0, 0, 0, 0, col)
    ob.name = nombre; return ob

def plano_img(nombre, x, y, z, w, h, mat, col, giro=0):
    """Pantalla o banner vertical mirando hacia -y (hacia el público)."""
    me = bpy.data.meshes.new(nombre); me.from_pydata([(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)], [], [(0, 1, 2, 3)])
    me.uv_layers.new(); uv = me.uv_layers[0].data
    for i, c in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv[i].uv = c
    me.materials.append(mat); ob = bpy.data.objects.new(nombre, me); ob.location = (x, y, z); ob.rotation_euler.z = math.radians(giro); col.objects.link(ob); return ob

def luz_area(nombre, x, y, z, w, d, energia, col, color=(1, 0.95, 0.88)):
    l = bpy.data.lights.new(nombre, 'AREA'); l.shape = 'RECTANGLE'; l.size = w; l.size_y = d; l.energy = energia; l.color = color
    ob = bpy.data.objects.new(nombre, l); ob.location = (x, y, z); col.objects.link(ob); return ob

def foco_luz(nombre, x, y, z, hacia, energia, color, col, angulo=30):
    l = bpy.data.lights.new(nombre, 'SPOT'); l.energy = energia; l.color = color; l.spot_size = math.radians(angulo); l.spot_blend = 0.6
    ob = bpy.data.objects.new(nombre, l); ob.location = (x, y, z)
    ob.rotation_euler = (Vector(hacia) - Vector((x, y, z))).to_track_quat('-Z', 'Y').to_euler(); col.objects.link(ob); return ob

def bandera(x, y, col, tipo='onu'):
    caja('Asta', x - 0.02, y - 0.02, x + 0.02, y + 0.02, 0, 2.6, M['dorado'], col)
    if tipo == 'onu': caja('Bandera ONU', x + 0.02, y - 0.01, x + 1.0, y + 0.01, 1.9, 2.55, M['bandera_onu'], col)
    else:
        caja('Bandera RD', x + 0.02, y - 0.01, x + 0.5, y + 0.01, 2.22, 2.55, M['bandera_rd_a'], col); caja('Bandera RD', x + 0.5, y - 0.01, x + 1.0, y + 0.01, 2.22, 2.55, M['bandera_rd_r'], col)
        caja('Bandera RD', x + 0.02, y - 0.01, x + 0.5, y + 0.01, 1.9, 2.22, M['bandera_rd_r'], col); caja('Bandera RD', x + 0.5, y - 0.01, x + 1.0, y + 0.01, 1.9, 2.22, M['bandera_rd_a'], col)
        caja('Bandera RD cruz', x + 0.47, y - 0.012, x + 0.55, y + 0.012, 1.9, 2.55, M['blanco'], col); caja('Bandera RD cruz', x + 0.02, y - 0.012, x + 1.0, y + 0.012, 2.18, 2.26, M['blanco'], col)

def herradura(x0, y0, x1, y1, col, silla=CONFERENCIA, nombre=''):
    """Comité en U: presidencia al fondo (y1), delegados en U mirándola; como en un modelo de la ONU."""
    cx, w, h = (x0 + x1) / 2, x1 - x0, y1 - y0
    for k in (-0.95, 0.95): poner(MESA_RECTA, cx + k, y1 - 2.2, 0, 180, col)
    for k in (-1.4, -0.45, 0.45, 1.4): poner(silla, cx + k, y1 - 1.45, 0, 180, col)
    bandera(cx + 2.8, y1 - 0.8, col); bandera(cx - 3.8, y1 - 0.8, col, 'rd')
    brazos, fondo = max(2, int((h - 5.2) / 1.85)), max(2, int((w - 4.4) / 1.85))
    ux0, ux1, yb = cx - fondo * 0.925, cx + fondo * 0.925, y1 - 4.6
    for i in range(brazos):
        yy = yb - i * 1.85
        for xx, g, sx in ((ux0, -90, -0.75), (ux1, 90, 0.75)):
            poner(MESA_RECTA, xx, yy, 0, g, col)
            for s in (-0.45, 0.45): poner(silla, xx + sx, yy + s, 0, g, col)
    yf = yb - brazos * 1.85 + 0.4
    for j in range(fondo):
        xx = ux0 + 0.925 + j * 1.85; poner(MESA_RECTA, xx, yf, 0, 0, col)
        for s in (-0.45, 0.45): poner(silla, xx + s, yf - 0.75, 0, 0, col)

def escena(nombre):
    sc = bpy.data.scenes.new(nombre)
    sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.eevee.taa_render_samples = 64
    sc.eevee.use_raytracing = True   # la luz rebota en paredes y techo
    w = bpy.data.worlds.new('Mundo ' + nombre); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25; sc.world = w
    return sc

def camara(sc, nombre, desde, hacia, lente=24):
    c = bpy.data.objects.new(nombre, bpy.data.cameras.new(nombre)); c.data.lens = lente; c.data.clip_end = 400
    c.location = desde; c.rotation_euler = (Vector(hacia) - Vector(desde)).to_track_quat('-Z', 'Y').to_euler(); sc.collection.objects.link(c); return c

ESCENAS = {}
TECHOS = {}   # escena: objetos que se esconden en la toma desde arriba

# ======================= 1. Teatro La Fiesta (Renaissance Jaragua) =======================
sc = escena('Teatro La Fiesta'); col = sc.collection
AN, LA, ALTO = 38.0, 44.0, 11.0          # 1,035 m² de cuadro (11,136 pies²), techo alto negro como en las fotos
caja('Piso', -AN / 2, -LA / 2, AN / 2, LA / 2, -0.2, 0, M['piso_teatro'], col)
caja('Alfombra del pasillo', -0.9, -LA / 2 + 4, 0.9, LA / 2 - 9, 0.0, 0.02, M['alfombra_gris'], col)
for nombre_, x0, x1 in (('Muro izquierdo', -AN / 2 - 0.4, -AN / 2), ('Muro derecho', AN / 2, AN / 2 + 0.4)):
    caja(nombre_, x0, -LA / 2, x1, LA / 2, 0, ALTO, M['crema'], col)
caja('Muro del fondo', -AN / 2, -LA / 2 - 0.4, AN / 2, -LA / 2, 0, ALTO, M['crema'], col)
caja('Muro del escenario', -AN / 2, LA / 2, AN / 2, LA / 2 + 0.4, 0, ALTO, M['negro'], col)
caja('Techo negro', -AN / 2, -LA / 2, AN / 2, LA / 2, ALTO, ALTO + 0.3, M['negro'], col)
for i in range(7):                      # columnas color crema a los lados
    y = -LA / 2 + 4 + i * 5.5
    for x in (-AN / 2 + 0.4, AN / 2 - 0.4): caja('Columna', x - 0.4, y - 0.4, x + 0.4, y + 0.4, 0, ALTO, M['crema_claro'], col)
# palcos y mezzanine al fondo y a los lados, con baranda de vidrio (segundo piso del plano)
caja('Mezzanine del fondo', -AN / 2, -LA / 2, AN / 2, -LA / 2 + 5, 4.2, 4.6, M['crema_claro'], col)
caja('Baranda del fondo', -AN / 2, -LA / 2 + 4.9, AN / 2, -LA / 2 + 5, 4.6, 5.6, M['baranda'], col)
caja('Cabina de control', -4, -LA / 2, 4, -LA / 2 + 3.5, 4.6, 7.5, M['negro'], col)
caja('Ventana de la cabina', -3.5, -LA / 2 + 3.49, 3.5, -LA / 2 + 3.52, 5.6, 7.0, M['foco_azul'], col)
for x0, x1 in ((-AN / 2, -AN / 2 + 3.5), (AN / 2 - 3.5, AN / 2)):
    caja('Palco lateral', x0, -LA / 2 + 5, x1, 6, 4.2, 4.6, M['crema_claro'], col)
    xb = x1 - 0.1 if x0 < 0 else x0
    caja('Baranda lateral', xb, -LA / 2 + 5, xb + 0.1, 6, 4.6, 5.6, M['baranda'], col)
# escenario con telón, pantallas, presídium y atril
YE = LA / 2 - 9.5
caja('Escenario', -14, YE, 14, LA / 2, 0, 1.1, M['tarima'], col)
caja('Telón de fondo', -14, LA / 2 - 0.6, 14, LA / 2 - 0.3, 1.1, ALTO - 0.6, M['telon'], col)
for x in (-15.2, 15.2): caja('Bambalina lateral', x - 1.2, YE - 0.3, x + 1.2, YE + 0.3, 0, ALTO - 0.5, M['telon'], col)
caja('Bambalina superior', -16, YE - 0.3, 16, YE + 0.3, ALTO - 2.4, ALTO - 0.3, M['telon'], col)
plano_img('Pantalla central', 0, LA / 2 - 0.9, 6.0, 11, 6.2, M['pantalla'], col)
for x in (-18.4, 18.4): plano_img('Pantalla lateral', x, YE - 1.5, 6.0, 5.4, 3.04, M['pantalla'], col, giro=-25 if x < 0 else 25)
for k in range(-3, 4): poner(MESA_RECTA, k * 1.85, YE + 4.2, 1.1, 180, col)
for k in range(7): poner(CHIAVARI, (k - 3) * 1.5, YE + 5.0, 1.1, 180, col)
caja('Atril', 9.6, YE + 2.6, 10.4, YE + 3.2, 1.1, 2.3, M['madera'], col)
plano_img('Banner del atril', 10, YE + 2.58, 1.9, 0.75, 0.3, M['banner'], col, giro=0)
bandera(-12.5, YE + 6.5, col); bandera(-11, YE + 6.5, col, 'rd')
# 1,152 butacas: 24 filas (A a X) de 12 + 24 + 12, igual que el plano de asientos de la página
for f in range(24):
    y = YE - 3.0 - f * 1.05; x = -(48 + 4) * 0.55 / 2
    for b, n in enumerate((12, 24, 12)):
        for i in range(n):
            xx = x + 0.275 + i * 0.55; curva = 0.0045 * xx * xx
            poner(BUTACA, xx, y + curva, 0, math.degrees(math.atan2(xx, 40)) * 0.6, col)
        x += n * 0.55 + 1.1
# techo: parrilla de focos y cerchas de iluminación
for i in range(14):
    for j in range(16): poner(FOCO, -AN / 2 + 2 + i * (AN - 4) / 13, -LA / 2 + 2 + j * (LA - 4) / 15, ALTO - 0.05, 0, col)
for y in (YE - 2, YE - 10, YE - 20):
    caja('Cercha de luces', -16, y - 0.3, 16, y + 0.3, ALTO - 2.6, ALTO - 2.0, M['aluminio'], col)
    for x in range(-14, 15, 4): foco_luz('Luz de escenario', x, y, ALTO - 2.7, (x * 0.3, YE + 4, 1.5), 900, (1, 0.9, 0.8), col, 22)
luz_area('Luz general del público', 0, -6, ALTO - 0.4, AN - 4, LA - 14, 9000, col)
luz_area('Luz del escenario', 0, YE + 4, ALTO - 0.4, 26, 7, 6000, col)
for x in (-13, 13): foco_luz('Luz morada', x, YE + 1, 1.2, (x * 0.6, LA / 2, 7), 1500, (0.55, 0.2, 1.0), col, 40)
ESCENAS['teatro_la_fiesta'] = (sc, [camara(sc, 'Cámara · desde los palcos', (0, -LA / 2 + 4, 7.4), (0, YE + 2, 2.4), 20),
                                    camara(sc, 'Cámara · desde el escenario', (9, YE + 6.5, 4.2), (-3, -12, 0.6), 18)])

# ======================= 2. Anacaona (Renaissance Jaragua), 40 x 18 m, techo 5 m =======================
sc = escena('Anacaona'); col = sc.collection
AN, LA, ALTO = 40.0, 18.0, 5.0
caja('Alfombra gris con dibujo', -AN / 2, -LA / 2, AN / 2, LA / 2, -0.1, 0, M['alfombra_gris'], col)
for nombre_, args in (('Muro norte', (-AN / 2, LA / 2, AN / 2, LA / 2 + 0.3)), ('Muro sur', (-AN / 2, -LA / 2 - 0.3, AN / 2, -LA / 2)),
                      ('Muro oeste', (-AN / 2 - 0.3, -LA / 2, -AN / 2, LA / 2)), ('Muro este', (AN / 2, -LA / 2, AN / 2 + 0.3, LA / 2))):
    caja(nombre_, *args, 0, ALTO, M['crema_claro'], col)
for x in range(-19, 20, 3):             # paneles con moldura en las paredes
    for y, d in ((LA / 2 - 0.02, -0.03), (-LA / 2 + 0.02, 0.03)): caja('Moldura', x - 0.9, min(y, y + d), x + 0.9, max(y, y + d), 0.6, 3.8, M['crema'], col)
TECHOS['Anacaona'] = [caja('Techo', -AN / 2, -LA / 2, AN / 2, LA / 2, ALTO, ALTO + 0.2, M['crema_claro'], col)]
luz_area('Luz que rebota en el techo', 0, 0, 0.4, AN - 2, LA - 2, 1800, col).rotation_euler = (math.pi, 0, 0)
for x in (-AN / 6, AN / 6):              # muros móviles: 3 secciones de 18 x 13 m (cuadro de capacidades)
    caja('Muro móvil', x - 0.15, -LA / 2, x + 0.15, LA / 2, 0, ALTO, M['muro_movil'], col)
for k, (nombre_, com) in enumerate((('Sección 1', 'CSNU'), ('Sección 2', 'AMS'), ('Sección 3', 'CIJ'))):
    x0 = -AN / 2 + k * AN / 3; herradura(x0 + 0.6, -LA / 2 + 0.6, x0 + AN / 3 - 0.6, LA / 2 - 0.6, col, CHIAVARI)
    plano_img(f'Pantalla {com}', x0 + AN / 6, LA / 2 - 0.05, 3.1, 3.6, 2.0, M['pantalla'], col)
    TECHOS['Anacaona'] += [poner(LAMPARA, x0 + AN / 6 + (i - 0.5) * 6, (j - 0.5) * 8, ALTO - 1.2, 0, col, 0.85) for i in range(2) for j in range(2)]
    luz_area(f'Luz {nombre_}', x0 + AN / 6, 0, ALTO - 0.15, AN / 3 - 2, LA - 2, 3400, col)
ESCENAS['anacaona_comites'] = (sc, [camara(sc, 'Cámara · Anacaona sección 2', (0, -LA / 2 + 1.2, 3.6), (0, 4, 0.8), 16),
                                    camara(sc, 'Cámara · Anacaona sin techo', (-6, -LA / 2 - 22, 30), (0, 0, 0), 26)])

# ======================= 3. Gran Salón (Sheraton): Samaná + Bonanza + Constanza, 31 x 16 m, techo 4.2 m =======================
sc = escena('Gran Salón'); col = sc.collection
AN, LA, ALTO = 31.0, 16.0, 4.2
caja('Alfombra beige con medallones', -AN / 2, -LA / 2, AN / 2, LA / 2, -0.1, 0, M['alfombra_beige'], col)
MEDALLON = malla('Medallón', [('cil', (0, 0, 0), (1.3, 1.3, 0.01, 24), M['crema'])])
for i in range(-14, 15, 4):
    for j in (-4, 0, 4): poner(MEDALLON, i, j, 0.005, 0, col)
for nombre_, args in (('Muro norte', (-AN / 2, LA / 2, AN / 2, LA / 2 + 0.3)), ('Muro sur', (-AN / 2, -LA / 2 - 0.3, AN / 2, -LA / 2)),
                      ('Muro oeste', (-AN / 2 - 0.3, -LA / 2, -AN / 2, LA / 2)), ('Muro este', (AN / 2, -LA / 2, AN / 2 + 0.3, LA / 2))):
    caja(nombre_, *args, 0, ALTO, M['crema_claro'], col)
for x in range(-15, 16, 3):              # pilastras de madera oscura como en las fotos
    for y in (LA / 2 - 0.2, -LA / 2): caja('Pilastra de madera', x - 0.3, y, x + 0.3, y + 0.2, 0, ALTO, M['madera'], col)
TECHOS['Gran Salón'] = [caja('Techo con moldura', -AN / 2, -LA / 2, AN / 2, LA / 2, ALTO, ALTO + 0.2, M['crema_claro'], col),
                        caja('Bandeja del techo', -AN / 2 + 1.5, -LA / 2 + 1.5, AN / 2 - 1.5, LA / 2 - 1.5, ALTO - 0.35, ALTO - 0.25, M['crema'], col)]
luz_area('Luz que rebota en el techo', 0, 0, 0.4, AN - 2, LA - 2, 1400, col).rotation_euler = (math.pi, 0, 0)
anchos = (('Samaná', 'ONUDI', 9.3), ('Bonanza', 'UNCTAD', 12.3), ('Constanza', 'OMA', 9.2))
x = -AN / 2
for k, (nombre_, com, w) in enumerate(anchos):
    herradura(x + 0.5, -LA / 2 + 0.5, x + w - 0.5, LA / 2 - 0.5, col)
    plano_img(f'Pantalla {nombre_}', x + w / 2, LA / 2 - 0.25, 2.6, 2.8, 1.58, M['pantalla'], col)
    TECHOS['Gran Salón'] += [poner(FAROL, x + w / 2, j, ALTO - 0.9, 0, col) for j in (-4, 2)]
    luz_area(f'Luz {nombre_}', x + w / 2, 0, ALTO - 0.4, w - 1, LA - 1, 1500, col)
    x += w
    if k < 2: caja('Muro móvil', x - 0.12, -LA / 2, x + 0.12, LA / 2, 0, ALTO - 0.25, M['muro_movil'], col)
ESCENAS['gran_salon_comites'] = (sc, [camara(sc, 'Cámara · Bonanza', (-1, -LA / 2 + 0.8, 2.6), (-1.5, 4, 0.9), 15),
                                      camara(sc, 'Cámara · Gran Salón sin techo', (8, -LA / 2 - 18, 24), (0, 0, 0), 26)])

# ======================= 4. Malecón Terrace (carpa del Sheraton), 36 x 23 m =======================
sc = escena('Malecón Terrace'); col = sc.collection
AN, LA, MURO, PICO = 23.0, 36.0, 4.0, 7.2
caja('Piso de la carpa', -AN / 2, -LA / 2, AN / 2, LA / 2, -0.15, 0, M['piso_carpa'], col)
for nombre_, args in (('Lona oeste', (-AN / 2 - 0.05, -LA / 2, -AN / 2, LA / 2)), ('Lona este', (AN / 2, -LA / 2, AN / 2 + 0.05, LA / 2)),
                      ('Lona sur', (-AN / 2, -LA / 2 - 0.05, AN / 2, -LA / 2))):
    caja(nombre_, *args, 0, MURO, M['lona'], col)
caja('Lona norte (detrás de la tarima)', -AN / 2, LA / 2, AN / 2, LA / 2 + 0.05, 0, MURO, M['lona'], col)
bm = bmesh.new()                         # techo a dos aguas de lona, con un frontón en cada punta
v = [bm.verts.new(p) for p in [(-AN / 2, -LA / 2, MURO), (AN / 2, -LA / 2, MURO), (AN / 2, LA / 2, MURO), (-AN / 2, LA / 2, MURO), (0, -LA / 2, PICO), (0, LA / 2, PICO)]]
for f in ((v[0], v[4], v[5], v[3]), (v[1], v[2], v[5], v[4]), (v[0], v[1], v[4]), (v[3], v[5], v[2])): bm.faces.new(f)
me = bpy.data.meshes.new('Techo de lona'); bm.to_mesh(me); bm.free(); me.materials.append(M['lona'])
ob = bpy.data.objects.new('Techo de lona', me); col.objects.link(ob); ob.modifiers.new('Grosor', 'SOLIDIFY').thickness = 0.05
for y in range(int(-LA / 2), int(LA / 2) + 1, 4):   # arcos de aluminio cada 4 m
    for x in (-AN / 2 + 0.1, AN / 2 - 0.1): caja('Poste', x - 0.1, y - 0.1, x + 0.1, y + 0.1, 0, MURO, M['aluminio'], col)
    for lado in (-1, 1):
        a, b = Vector((lado * AN / 2, y, MURO)), Vector((0, y, PICO)); d = b - a
        o = poner(malla('Viga', [('caja', (0, 0, 0), (d.length, 0.18, 0.18), M['aluminio'])]), *((a + b) / 2), 0, col)
        o.rotation_euler = (0, -math.atan2(d.z, abs(d.x)) * (1 if lado < 0 else -1), 0)
for x in (-6, 0, 6):                     # filas de lámparas de cristal con guirnaldas verdes
    caja('Guirnalda', x - 0.25, -LA / 2 + 3, x + 0.25, LA / 2 - 6, PICO - 1.6 - abs(x) * 0.35, PICO - 1.4 - abs(x) * 0.35, M['verde'], col)
    for y in range(-14, 13, 4): poner(LAMPARA, x, y, PICO - 2.2 - abs(x) * 0.35, 0, col, 0.75)
caja('Tarima', -6, LA / 2 - 4.5, 6, LA / 2 - 0.3, 0, 0.6, M['tarima'], col)
plano_img('Pantalla de la carpa', 0, LA / 2 - 0.4, 3.4, 7.2, 4.05, M['pantalla'], col)
for k in range(-2, 3): poner(MESA_RECTA, k * 1.85, LA / 2 - 6.0, 0, 180, col)
for k in range(10): poner(FANTASMA, (k - 4.5) * 0.9, LA / 2 - 5.3, 0, 180, col)
mesa = MESA_REDONDA(M['mantel'])
for i in range(7):
    for j in range(7):
        x, y = -AN / 2 + 2.6 + i * 2.97, -LA / 2 + 2.6 + j * 3.6
        poner(mesa, x, y, 0, 0, col)
        for s in range(10):
            a = s / 10 * math.tau; poner(FANTASMA, x + math.cos(a) * 1.3, y + math.sin(a) * 1.3, 0, math.degrees(a) + 90, col)
for x in (-AN / 2 + 0.4, AN / 2 - 0.4):  # luces turquesa sobre la lona, como en las fotos
    for y in range(-16, 17, 4): foco_luz('Luz turquesa', x, y, 0.2, (x * 0.7, y, MURO + 1), 300, (0.3, 0.95, 0.9), col, 50)
luz_area('Luz general de la carpa', 0, 0, PICO - 1.2, AN - 3, LA - 3, 14000, col)
luz_area('Luz que rebota en la lona', 0, 0, 0.5, AN - 3, LA - 3, 3500, col).rotation_euler = (math.pi, 0, 0)
ESCENAS['malecon_terrace_banquete'] = (sc, [camara(sc, 'Cámara · entrada de la carpa', (0, -LA / 2 + 1, 2.8), (0, 8, 1.2), 17),
                                            camara(sc, 'Cámara · carpa desde la tarima', (7, LA / 2 - 2, 3.6), (-2, -10, 0.6), 17)])

# Guardar y fotos
for k in list(bpy.data.scenes):
    if k.name == 'Scene': bpy.data.scenes.remove(k)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AQUI, 'Salones_MINUME_XVII.blend'))
if 'render' in ARGS:
    os.makedirs(os.path.join(AQUI, 'renders'), exist_ok=True)
    for nombre, (sc, cams) in ESCENAS.items():
        for i, c in enumerate(cams):
            for t in TECHOS.get(sc.name, []): t.hide_render = (i == 1)
            sc.camera = c; sc.render.filepath = os.path.join(AQUI, 'renders', f'{nombre}_{i + 1}.png')
            bpy.ops.render.render(write_still=True, scene=sc.name)
print('LISTO: salones')
