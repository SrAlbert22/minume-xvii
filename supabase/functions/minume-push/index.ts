// MINUME XVII · envía los avisos al teléfono (Web Push) · Albert Silvestre
//
// La base la llama cada vez que entra un SOS, un comunicado urgente o un mensaje urgente del chat.
// No recibe nada de quien la llama: solo vacía la cola «minume_push_cola» que llenó la base.
// Así, aunque alguien la llame desde fuera, no puede mandar avisos falsos.
// Responde enseguida y trabaja en segundo plano; varias llamadas a la vez se reparten la cola sin repetir avisos.
import { enviar, type Llaves } from './webpush.ts';

const BASE = Deno.env.get('SUPABASE_URL')!;
const LLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EN_PARALELO = 64;      // envíos simultáneos por aviso (los servicios de push aguantan mucho más)

type Sub = { id: number; endpoint: string; p256dh: string; auth: string; sistema: string };
type Aviso = { id: number; datos: Record<string, unknown>; ttl: number; desde: string; subs: Sub[] };

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST', body: JSON.stringify(args),
    headers: { apikey: LLAVE, Authorization: `Bearer ${LLAVE}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}

let llaves: Llaves | null = null;
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));

// Recorre la lista con N envíos a la vez
async function enTandas<T>(lista: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => { while (i < lista.length) await fn(lista[i++]); }));
}

async function mandar(a: Aviso) {
  const espera = new Date(a.desde).getTime() - Date.now();
  if (espera > 0) await dormir(Math.min(espera, 25000));   // la prueba sale unos segundos después, para bloquear el teléfono
  const buenos: number[] = [], malos: number[] = [], borrar: number[] = [];
  let error = '';
  await enTandas(a.subs, EN_PARALELO, async s => {
    const texto = JSON.stringify({ ...a.datos, url: `/${s.sistema}/${a.datos.sec || ''}` });
    try {
      const r = await enviar(s, texto, llaves!, { ttl: a.ttl, urgencia: 'high' });
      if (r.estado >= 200 && r.estado < 300) buenos.push(s.id);
      else if (r.estado === 404 || r.estado === 410) borrar.push(s.id);   // el teléfono ya no existe o quitó el permiso
      else { malos.push(s.id); error = `${r.estado} ${r.detalle}`; }
    } catch (e) { malos.push(s.id); error = String(e).slice(0, 200); }
  });
  await rpc('minume_push_listo', { p_id: a.id, p_buenos: buenos, p_malos: malos, p_borrar: borrar, p_error: error || null });
}

async function vaciarCola() {
  llaves = llaves || await rpc<Llaves>('minume_push_llaves');
  for (let vuelta = 0; vuelta < 10; vuelta++) {
    const lote = await rpc<Aviso[]>('minume_push_tomar', { p_limite: 25 });
    if (!lote.length) return;
    await Promise.all(lote.map(a => mandar(a).catch(e => console.error('aviso', a.id, e))));
  }
}

Deno.serve(req => {
  if (req.method !== 'POST') return new Response('MINUME push', { status: 200 });
  const trabajo = vaciarCola().catch(e => console.error('cola', e));
  // @ts-ignore: EdgeRuntime existe en Supabase
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(trabajo);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
