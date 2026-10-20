# Tomas del video de MINUME XVII (se corre sobre los .blend de la maqueta y de los salones)
# Autor: Albert Silvestre
#
#   blender -b ../plantel/Plantel_MINUME_XVII.blend -P recorrido_video.py -- plantel
#   blender -b ../salones/Salones_MINUME_XVII.blend -P recorrido_video.py -- salones
#
# Cada toma es una cámara que se mueve entre puntos clave; los cuadros quedan en cuadros/<toma>/.
import bpy, math, os, sys
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
QUE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'plantel'
FPS, ANCHO, ALTO = 24, 1280, 720

def toma(escena, nombre, pasos, lente=30, muestras=24):
    """pasos: [(segundo, desde, hacia)]. Renderiza la toma completa."""
    cam = bpy.data.objects.new(f'Video · {nombre}', bpy.data.cameras.new(f'Video · {nombre}'))
    cam.data.lens = lente; cam.data.clip_start = 0.1; cam.data.clip_end = 4000; escena.collection.objects.link(cam)
    mira = bpy.data.objects.new(f'Mira · {nombre}', None); escena.collection.objects.link(mira)
    for s, desde, hacia in pasos:
        f = 1 + round(s * FPS)
        cam.location = desde; cam.keyframe_insert('location', frame=f)
        mira.location = hacia; mira.keyframe_insert('location', frame=f)
    t = cam.constraints.new('TRACK_TO'); t.target = mira; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'
    for ob in escena.objects:            # los nombres flotantes miran a esta cámara
        for c in ob.constraints:
            if c.type == 'TRACK_TO' and ob.type == 'FONT': c.target = cam
    escena.camera = cam
    escena.frame_start, escena.frame_end = 1, round(pasos[-1][0] * FPS)
    escena.render.fps = FPS; escena.render.resolution_x, escena.render.resolution_y = ANCHO, ALTO
    escena.render.resolution_percentage = 100; escena.eevee.taa_render_samples = muestras
    escena.render.image_settings.file_format = 'JPEG'; escena.render.image_settings.quality = 92
    escena.render.filepath = os.path.join(AQUI, 'cuadros', nombre, 'c_')
    bpy.ops.render.render(animation=True, scene=escena.name)

if QUE == 'plantel':
    sc = bpy.data.scenes['Sheraton Santo Domingo'] if 'Sheraton Santo Domingo' in bpy.data.scenes else bpy.context.scene
    for c in bpy.data.collections:
        if c.name.startswith('Techos'): c.hide_render = False
    toma(sc, '1_plantel', [
        (0, (300, -360, 230), (-20, 0, 0)),          # desde el mar, la maqueta completa
        (6, (60, -230, 100), (-70, -40, 15)),        # hacia el Jaragua
        (11, (-175, -20, 62), (-95, 15, 4)),         # puerta este del Jaragua
        (17, (-70, 100, 46), (0, 62, 0)),            # la ruta por el borde de las canchas
        (23, (5, 25, 72), (60, 20, 18)),             # hacia el Sheraton
        (28, (150, -70, 85), (85, 30, 15)),          # el Sheraton desde el mar
        (33, (115, 175, 52), (50, 105, 0)),          # la carpa del Malecón Terrace
        (37, (-80, 300, 300), (-25, 10, 0)),         # vista final
    ], lente=28)
else:
    def esconder_techos(escena):
        for o in escena.objects:
            if o.name.startswith(('Techo', 'Bandeja del techo', 'Lámpara colgante')): o.hide_render = True
            if o.name.startswith('Lámpara de cristal') and escena.name == 'Anacaona': o.hide_render = True
    toma(bpy.data.scenes['Teatro La Fiesta'], '2_teatro', [(0, (0, -19, 8.5), (0, 12.5, 3)), (7, (0, -3, 4.0), (0, 15, 3.2))], lente=20, muestras=32)
    esconder_techos(bpy.data.scenes['Anacaona'])
    toma(bpy.data.scenes['Anacaona'], '3_anacaona', [(0, (-28, -26, 24), (0, 0, 0)), (7, (24, -28, 20), (0, 0, 0))], lente=24, muestras=32)
    toma(bpy.data.scenes['Gran Salón'], '4_gran_salon', [(0, (-1, -7.6, 2.8), (-1.5, 7, 1)), (7, (-1, -1.5, 2.3), (-1.5, 7, 1.2))], lente=16, muestras=32)
    toma(bpy.data.scenes['Malecón Terrace'], '5_malecon', [(0, (0, -17.5, 3.4), (0, 10, 1.8)), (7, (0, 5, 2.4), (0, 17, 2.6))], lente=17, muestras=32)
print('LISTO: tomas', QUE)
