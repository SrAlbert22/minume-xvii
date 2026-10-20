# Une las partes de src/ en una sola página (la base de todos los sistemas).
# Autor: Albert Silvestre
import io, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RAIZ, 'src')

def ensamblar(plantilla='pagina.html'):
    salida = []
    for linea in io.open(os.path.join(SRC, plantilla), encoding='utf-8').read().split('\n'):
        if linea.startswith('@@') and ' ' in linea:
            salida.append(io.open(os.path.join(SRC, linea.split(' ', 1)[1]), encoding='utf-8').read())
        else:
            salida.append(linea)
    return '\n'.join(salida)

if __name__ == '__main__':
    print(len(ensamblar()), 'caracteres')
