# Arma los sistemas de MINUME XVII a partir del código en src/.
# Autor: Albert Silvestre
#
#   python herramientas/armar.py
#
# Salidas:
#   dist/    lo que se publica en Vercel: el Inicio y un sistema por equipo, instalables como app
#   enviar/  cada sistema en un solo archivo .html, para mandarlo por WhatsApp o correo
import base64, json, pathlib, re, shutil, sys, time

from PIL import Image, ImageDraw, ImageFont

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST, ENVIAR = RAIZ / 'src', RAIZ / 'dist', RAIZ / 'enviar'
sys.path.insert(0, str(RAIZ / 'herramientas'))
from ensamblar import ensamblar

# Base de datos compartida en Supabase. Es la llave pública (anon), hecha para ir en la página;
# lo que protege los datos son las reglas de la base (ver supabase/).
SUPABASE = {'url': 'https://fakkqpwgidjvodippxup.supabase.co', 'key': 'sb_publishable_3C3Jueq_dsv75UwmOm0UnA_b-tlgAXc'}
CONFIG_JS = 'window.MINUME_SUPABASE = ' + json.dumps(SUPABASE) + ';'
VERCEL = {'projectId': 'prj_dPyGbtm0VXXcpsgpDQXKcljhDQCd', 'orgId': 'team_8yZKZPf2aSv323isiAlHJwte', 'projectName': 'minume-xvii'}

#            carpeta        archivo para enviar        nombre                    corto           color      letra
SISTEMAS = {
    'asistencia':   ('Asistencia',            'Subsecretaría de Asistencia', 'Asistencia',   '#45c8ff', 'A'),
    'seguridad':    ('Seguridad-y-Traslado',  'Seguridad y Traslado',        'Seguridad',    '#ff4d5e', 'S'),
    'bienestar':    ('Bienestar',             'Bienestar',                   'Bienestar',    '#2fd38c', 'B'),
    'eventos':      ('Eventos-y-Protocolo',   'Eventos y Protocolo',         'Eventos',      '#f472b6', 'E'),
    'coordinacion': ('Coordinacion',          'Coordinación general',        'Coordinación', '#ffd23f', 'C'),
}
ICONOS = {'inicio': ('#45c8ff', 'M')} | {c: (v[3], v[4]) for c, v in SISTEMAS.items()}

# Cabeceras de seguridad para Vercel (la política de contenido solo deja cargar lo que la página usa)
CSP = '; '.join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' data: blob: https://fakkqpwgidjvodippxup.supabase.co wss://fakkqpwgidjvodippxup.supabase.co https://cdn.jsdelivr.net",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
])
TRES = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
LIBS_3D = [TRES + 'build/three.module.js'] + [TRES + 'examples/jsm/' + r for r in (
    'controls/OrbitControls.js', 'loaders/GLTFLoader.js', 'loaders/DRACOLoader.js', 'utils/BufferGeometryUtils.js',
    'libs/draco/gltf/draco_decoder.js', 'libs/draco/gltf/draco_decoder.wasm', 'libs/draco/gltf/draco_wasm_wrapper.js')]
CABECERAS = [
    {'key': 'Content-Security-Policy', 'value': CSP},
    {'key': 'Strict-Transport-Security', 'value': 'max-age=63072000; includeSubDomains; preload'},
    {'key': 'X-Content-Type-Options', 'value': 'nosniff'},
    {'key': 'X-Frame-Options', 'value': 'DENY'},
    {'key': 'Referrer-Policy', 'value': 'strict-origin-when-cross-origin'},
    {'key': 'Permissions-Policy', 'value': 'geolocation=(self), camera=(self), microphone=(), payment=(), usb=()'},
    {'key': 'Cross-Origin-Opener-Policy', 'value': 'same-origin'},
]


def icono(ruta, tam, color, letra):
    im = Image.new('RGB', (tam, tam), '#050a1a')
    d = ImageDraw.Draw(im)
    m = int(tam * .16)
    d.rounded_rectangle([m, m, tam - m, tam - m], radius=int(tam * .2), fill=color)
    try:
        f = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', int(tam * .44))
    except OSError:
        f = ImageFont.load_default()
    d.text((tam / 2, tam / 2 + tam * .01), letra, font=f, fill='#04121d', anchor='mm')
    im.save(ruta)


def manifest(nombre, corto, icono_base, inicio):
    return json.dumps({
        'name': nombre, 'short_name': corto, 'start_url': inicio, 'scope': './', 'display': 'standalone',
        'background_color': '#050a1a', 'theme_color': '#050a1a', 'lang': 'es-DO',
        'icons': [{'src': f'{icono_base}-192.png', 'sizes': '192x192', 'type': 'image/png'},
                  {'src': f'{icono_base}-512.png', 'sizes': '512x512', 'type': 'image/png'},
                  {'src': f'{icono_base}-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
    }, ensure_ascii=False, indent=1)


def etiquetas_app(icono_base, sw):
    return (f'<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="{icono_base}-180.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="theme-color" content="#050a1a">\n'
            f"<script>if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('{sw}').catch(() => {{}}));</script>")


def escribir(ruta, texto):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding='utf-8')


def main():
    base = ensamblar()
    glb = SRC / 'plantel.glb'
    glb64 = base64.b64encode(glb.read_bytes()).decode()
    for d in (DIST, ENVIAR):          # se vacían (no se borran) por si alguna terminal está parada dentro
        d.mkdir(exist_ok=True)
        for x in d.iterdir():
            shutil.rmtree(x) if x.is_dir() else x.unlink()
    (DIST / 'iconos').mkdir()
    # enlace al proyecto de Vercel (minume-xvii.vercel.app) para publicar con: npx vercel deploy --prod desde dist/
    escribir(DIST / '.vercel' / 'project.json', json.dumps(VERCEL))
    shutil.copy(glb, DIST / 'plantel.glb')
    for c, (col, le) in ICONOS.items():
        for t in (180, 192, 512):
            icono(DIST / 'iconos' / f'{c}-{t}.png', t, col, le)

    # Un sistema por equipo
    marca = '<meta charset="utf-8">'
    assert base.count(marca) == 1
    for clave, (archivo, nombre, corto, _, _) in SISTEMAS.items():
        elige = f'{marca}\n<script>window.MINUME_SISTEMA = "{clave}"; {CONFIG_JS}</script>'
        publicado = base.replace(marca, elige.replace('</script>', ' window.PLANTEL_GLB = "../plantel.glb"; window.MINUME_INICIO = "../index.html";</script>') + '\n' + etiquetas_app(f'../iconos/{clave}', '../sw.js'), 1)
        escribir(DIST / clave / 'index.html', publicado)
        escribir(DIST / clave / 'manifest.webmanifest', manifest(f'MINUME XVII · {nombre}', corto, f'../iconos/{clave}', './'))
        suelto = base.replace(marca, elige.replace('</script>', f' window.PLANTEL_GLB = "data:model/gltf-binary;base64,{glb64}"; window.MINUME_INICIO = "Inicio-MINUME.html";</script>'), 1)
        escribir(ENVIAR / f'MINUME-{archivo}.html', suelto)

    # El Inicio usa los mismos bloques de sincronización y reportes que los sistemas
    plantilla = (SRC / 'inicio.html').read_text(encoding='utf-8')
    bloques = [re.search(r'<script>\n/\*' + n + r'-INICIO\*/.*?/\*' + n + r'-FIN\*/\n</script>', base, re.S).group(0) for n in ('SYNC', 'REPORTES')]
    motor = f'<script>{CONFIG_JS}</script>\n' + '\n'.join(bloques)
    for ruta, enlace, app in ((DIST / 'index.html', lambda c, a: f'{c}/index.html', True), (ENVIAR / 'Inicio-MINUME.html', lambda c, a: f'MINUME-{a}.html', False)):
        enlaces = {c: enlace(c, a) for c, (a, *_) in SISTEMAS.items()}
        html = re.sub(r'/\*__ENLACES__\*/ \{[^}]*\}', lambda _: json.dumps(enlaces, ensure_ascii=False), plantilla, count=1)
        html = html.replace('<!--__APP__-->', etiquetas_app('iconos/inicio', 'sw.js') if app else '').replace('<!--__REPORTES__-->', motor)
        escribir(ruta, html)
    escribir(DIST / 'manifest.webmanifest', manifest('MINUME XVII · Staff', 'MINUME', 'iconos/inicio', './index.html'))

    # Service worker: guarda lo necesario para abrir sin internet
    libs = sorted(set(re.findall(r"https://cdn\.jsdelivr\.net/npm/[^']+\.js", motor))) + LIBS_3D
    precarga = ['./', './index.html', './manifest.webmanifest', './plantel.glb'] + [f'./iconos/{c}-{t}.png' for c in ICONOS for t in (180, 192, 512)]
    for c in SISTEMAS:
        precarga += [f'./{c}/', f'./{c}/index.html', f'./{c}/manifest.webmanifest']
    sw = (SRC / 'sw.js').read_text(encoding='utf-8')
    sw = sw.replace('__VERSION__', time.strftime('%Y%m%d-%H%M%S')).replace('__PRECARGA__', json.dumps(precarga, indent=1)).replace('__LIBS__', json.dumps(libs))
    escribir(DIST / 'sw.js', sw)

    escribir(DIST / 'vercel.json', json.dumps({
        'cleanUrls': False,
        'headers': [
            {'source': '/sw.js', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}, {'key': 'Service-Worker-Allowed', 'value': '/'}]},
            {'source': '/(.*).html', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]},
            {'source': '/(.*)/', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]},
            {'source': '/(.*)', 'headers': CABECERAS},
        ],
    }, ensure_ascii=False, indent=1))
    print('Listo: dist/ y enviar/')


if __name__ == '__main__':
    main()
