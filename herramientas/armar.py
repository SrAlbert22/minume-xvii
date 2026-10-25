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
# Llave pública VAPID de los avisos al teléfono (Web Push). La privada está solo en el Vault de Supabase.
VAPID = 'BBsn3Fuwh7pW7GXmiTFbJqF_JYGVzu4ODFaODJPWHgOAb6NaE9V5vcgtTncvHLa5euBVSmMOF-PTinbojCgIKsw'
SUPABASE['vapid'] = VAPID
CONFIG_JS = 'window.MINUME_SUPABASE = ' + json.dumps(SUPABASE) + ';'
VERCEL = {'projectId': 'prj_dPyGbtm0VXXcpsgpDQXKcljhDQCd', 'orgId': 'team_8yZKZPf2aSv323isiAlHJwte', 'projectName': 'minume-xvii'}

#            carpeta        archivo para enviar        nombre                    corto           color      letra
SISTEMAS = {
    'asistencia':   ('Asistencia',            'Asistencia, Bienvenida y Acreditación', 'Asistencia',   '#00b5ff', 'A'),
    'acreditacion': ('Acreditacion',          'Acreditación',                'Acreditación', '#a974ff', 'A'),
    'seguridad':    ('Seguridad-y-Traslado',  'Seguridad y Traslado',        'Seguridad',    '#e53535', 'S'),
    'bienestar':    ('Bienestar',             'Bienestar',                   'Bienestar',    '#00fdef', 'B'),
    'eventos':      ('Eventos-y-Protocolo',   'Eventos y Protocolo',         'Eventos',      '#ffbeff', 'E'),
    'coordinacion': ('Coordinacion',          'Coordinación general',        'Coordinación', '#0090fb', 'C'),
}
ICONOS = {'inicio': ('#00b5ff', 'M')} | {c: (v[3], v[4]) for c, v in SISTEMAS.items()}

# Cabeceras de seguridad para Vercel (la política de contenido solo deja cargar lo que la página usa)
CSP = '; '.join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' data: blob: https://fakkqpwgidjvodippxup.supabase.co wss://fakkqpwgidjvodippxup.supabase.co https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com",
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
    """Icono de la app con la línea gráfica: degradado azul de MINUME, el logo de MINUME y una franja con el color del equipo."""
    im = Image.new('RGB', (tam, tam))
    d = ImageDraw.Draw(im)
    for y in range(tam):                       # degradado #0a0464 → #0043c5
        t = y / tam
        d.line([(0, y), (tam, y)], fill=(int(10 - 10 * t), int(4 + 63 * t), int(100 + 97 * t)))
    logo = Image.open(SRC / 'marca' / 'minume-blanco.png').convert('RGBA')
    ancho = int(tam * .8); logo = logo.resize((ancho, int(logo.height * ancho / logo.width)), Image.LANCZOS)
    im.paste(logo, ((tam - logo.width) // 2, (tam - logo.height) // 2 - (int(tam * .04) if letra != 'M' else 0)), logo)
    if letra != 'M':                           # franja del equipo abajo
        d.rounded_rectangle([int(tam * .3), int(tam * .66), int(tam * .7), int(tam * .7)], radius=int(tam * .02), fill=color)
    im.save(ruta)


def incrustar(html):
    """Los logos y elementos de marca/ van dentro de la página (así abren sin internet y en un solo archivo)."""
    def dato(m):
        f = SRC / 'marca' / m.group(1)
        tipo = 'image/svg+xml' if f.suffix == '.svg' else 'image/png'
        return 'data:%s;base64,%s' % (tipo, base64.b64encode(f.read_bytes()).decode())
    return re.sub(r'marca/([\w.-]+\.(?:svg|png))', dato, html)


def manifest(nombre, corto, icono_base, inicio):
    return json.dumps({
        'name': nombre, 'short_name': corto, 'description': f'{nombre} · diseño y desarrollo: Albert Silvestre', 'start_url': inicio, 'scope': './', 'display': 'standalone',
        'background_color': '#050a1a', 'theme_color': '#050a1a', 'lang': 'es-DO',
        'icons': [{'src': f'{icono_base}-192.png', 'sizes': '192x192', 'type': 'image/png'},
                  {'src': f'{icono_base}-512.png', 'sizes': '512x512', 'type': 'image/png'},
                  {'src': f'{icono_base}-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
    }, ensure_ascii=False, indent=1)


def etiquetas_app(icono_base, sw):
    return (f'<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="{icono_base}-180.png">\n<link rel="icon" type="image/png" href="{icono_base}-192.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="theme-color" content="#050a1a">\n'
            '<script>' + ACTUALIZAR_JS.replace('__SW__', sw) + '</script>')


# Registra el service worker y avisa cuando hay una versión nueva publicada: revisa cada 5 minutos y al volver a la pestaña.
# Si la pestaña está escondida se recarga sola; si la persona la está usando, sale un aviso con el botón «Actualizar».
ACTUALIZAR_JS = """if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => {
  const sw = navigator.serviceWorker; let habia = !!sw.controller;
  sw.register('__SW__').then(reg => {
    const revisar = () => reg.update().catch(() => {});
    setInterval(revisar, 5 * 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
  }).catch(() => {});
  sw.addEventListener('controllerchange', () => {
    if (!habia) { habia = true; return; }
    if (document.hidden) return location.reload();
    if (document.getElementById('versionNueva')) return;
    const d = document.createElement('div'); d.id = 'versionNueva'; d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:16px;right:16px;margin:0 auto;width:fit-content;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;align-items:center;gap:14px;padding:12px 12px 12px 18px;border-radius:16px;background:linear-gradient(135deg,#0043c5,#002193);border:1px solid #00b5ff;color:#fff;font:600 15px Barlow,system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.45);max-width:560px';
    d.innerHTML = '<span>Hay una versión nueva de MINUME</span>';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Actualizar';
    b.style.cssText = 'flex:none;border:0;border-radius:12px;padding:10px 16px;background:#00b5ff;color:#06033f;font:800 15px Barlow,system-ui,sans-serif;cursor:pointer';
    b.onclick = () => location.reload(); d.append(b); document.body.append(d);
  });
});"""


def escribir(ruta, texto):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding='utf-8')


def main():
    base = incrustar(ensamblar())
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
    # letras de la marca (Barlow, licencia OFL) para los reportes en PDF
    (DIST / 'fuentes').mkdir(exist_ok=True)
    for f in (SRC / 'fuentes').glob('*.ttf'):
        shutil.copy(f, DIST / 'fuentes' / f.name)
    for c, (col, le) in ICONOS.items():
        for t in (180, 192, 512):
            icono(DIST / 'iconos' / f'{c}-{t}.png', t, col, le)

    # Un sistema por equipo
    marca = '<meta charset="utf-8">'
    assert base.count(marca) == 1
    for clave, (archivo, nombre, corto, _, _) in SISTEMAS.items():
        elige = f'{marca}\n<script>window.MINUME_SISTEMA = "{clave}"; {CONFIG_JS}</script>'
        publicado = base.replace(marca, elige.replace('</script>', ' window.PLANTEL_GLB = "../plantel.glb"; window.MINUME_INICIO = "../";</script>') + '\n' + etiquetas_app(f'../iconos/{clave}', '../sw.js'), 1)
        escribir(DIST / clave / 'index.html', publicado)
        escribir(DIST / clave / 'manifest.webmanifest', manifest(f'MINUME XVII · {nombre}', corto, f'../iconos/{clave}', './'))
        suelto = base.replace(marca, elige.replace('</script>', f' window.PLANTEL_GLB = "data:model/gltf-binary;base64,{glb64}"; window.MINUME_INICIO = "Inicio-MINUME.html";</script>'), 1)
        escribir(ENVIAR / f'MINUME-{archivo}.html', suelto)

    # El Inicio usa los mismos bloques de sincronización y reportes que los sistemas
    plantilla = incrustar((SRC / 'inicio.html').read_text(encoding='utf-8'))
    bloques = [re.search(r'<script>\n/\*' + n + r'-INICIO\*/.*?/\*' + n + r'-FIN\*/\n</script>', base, re.S).group(0) for n in ('SYNC', 'REPORTES')]
    motor = f'<script>{CONFIG_JS}</script>\n' + '\n'.join(bloques)
    for ruta, enlace, app in ((DIST / 'index.html', lambda c, a: f'{c}/', True), (ENVIAR / 'Inicio-MINUME.html', lambda c, a: f'MINUME-{a}.html', False)):
        enlaces = {c: enlace(c, a) for c, (a, *_) in SISTEMAS.items()}
        html = re.sub(r'/\*__ENLACES__\*/ \{[^}]*\}', lambda _: json.dumps(enlaces, ensure_ascii=False), plantilla, count=1)
        html = html.replace('<!--__APP__-->', etiquetas_app('iconos/inicio', 'sw.js') if app else '').replace('<!--__REPORTES__-->', motor)
        escribir(ruta, html)
    escribir(DIST / 'manifest.webmanifest', manifest('MINUME XVII · Staff', 'MINUME', 'iconos/inicio', './'))

    # Service worker: guarda lo necesario para abrir sin internet
    libs = sorted(set(re.findall(r"https://cdn\.jsdelivr\.net/npm/[^']+\.js", motor))) + LIBS_3D
    precarga = ['./', './manifest.webmanifest', './plantel.glb'] + [f'./fuentes/{f.name}' for f in sorted((SRC / 'fuentes').glob('*.ttf'))] + [f'./iconos/{c}-{t}.png' for c in ICONOS for t in (180, 192, 512)]
    for c in SISTEMAS:
        precarga += [f'./{c}/', f'./{c}/manifest.webmanifest']
    sw = (SRC / 'sw.js').read_text(encoding='utf-8')
    sw = sw.replace('__VERSION__', time.strftime('%Y%m%d-%H%M%S')).replace('__PRECARGA__', json.dumps(precarga, indent=1)).replace('__LIBS__', json.dumps(libs)).replace('__SUPABASE__', json.dumps({'url': SUPABASE['url'], 'key': SUPABASE['key']}))
    escribir(DIST / 'sw.js', sw)

    escribir(DIST / 'vercel.json', json.dumps({
        'cleanUrls': False,
        # direcciones limpias: /coordinacion/mapa abre el sistema en esa sección; index.html ya no se ve
        'redirects': [{'source': '/index.html', 'destination': '/', 'permanent': True}]
                   + [{'source': f'/{c}/index.html', 'destination': f'/{c}/', 'permanent': True} for c in SISTEMAS],
        'rewrites': [{'source': f'/{c}/:seccion([a-z-]+)', 'destination': f'/{c}/index.html'} for c in SISTEMAS],
        'headers': [
            {'source': '/sw.js', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}, {'key': 'Service-Worker-Allowed', 'value': '/'}]},
            {'source': '/(.*).html', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]},
            {'source': '/(.*)/', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]},
            {'source': '/(.*)', 'headers': CABECERAS},
        ],
    }, ensure_ascii=False, indent=1))
    print('Listo: dist/ y enviar/')


if __name__ == '__main__':
    # Modo evento: sin franja DEMO, sin códigos de prueba a la vista, sin «Simular» y con el reloj real siempre
    if '--evento' in sys.argv:
        CONFIG_JS += " window.MINUME_DEMO = false; document.documentElement.classList.add('modo-evento');"
        print('Modo evento: sin nada de demostración')
    main()
