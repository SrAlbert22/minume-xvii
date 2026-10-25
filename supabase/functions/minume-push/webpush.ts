// MINUME XVII · Web Push sin librerías (solo Web Crypto) · Albert Silvestre
// Cifrado aes128gcm (RFC 8291) y firma VAPID (RFC 8292). Sirve igual en Deno (Supabase) y en Node para probarlo.

const te = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const deB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const unir = (...p: Uint8Array[]) => { const r = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { r.set(x, i); i += x.length; } return r; };

async function hkdf(sal: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, bytes * 8));
}

export type Llaves = { publica: string; privada: string; sub: string };
export type Suscripcion = { endpoint: string; p256dh: string; auth: string };

// La llave VAPID se importa una sola vez y cada firma (una por servicio de push) se guarda 10 horas
let firmante: CryptoKey | null = null, firmanteDe = '';
const firmas = new Map<string, { jwt: string; vence: number }>();
async function vapid(aud: string, ll: Llaves) {
  const ahora = Math.floor(Date.now() / 1000), f = firmas.get(aud);
  if (f && f.vence - 3600 > ahora) return f.jwt;
  if (!firmante || firmanteDe !== ll.publica) {
    const pub = deB64u(ll.publica);
    firmante = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: ll.privada, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    firmanteDe = ll.publica;
  }
  const vence = ahora + 12 * 3600;
  const cuerpo = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' + b64u(te.encode(JSON.stringify({ aud, exp: vence, sub: ll.sub })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, firmante, te.encode(cuerpo)));
  const jwt = cuerpo + '.' + b64u(sig);
  firmas.set(aud, { jwt, vence });
  return jwt;
}

export async function cifrar(s: Suscripcion, texto: string) {
  const ua = deB64u(s.p256dh), auth = deB64u(s.auth);
  const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secreto = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, par.privateKey, 256));
  const ikm = await hkdf(auth, secreto, unir(te.encode('WebPush: info\0'), ua, as), 32);
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sal, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cif = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, unir(te.encode(texto), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   // tamaño de registro 4096
  return unir(sal, rs, new Uint8Array([as.length]), as, cif);
}

// Devuelve el código HTTP del servicio de push (201 = entregado; 404/410 = ese teléfono ya no existe)
export async function enviar(s: Suscripcion, texto: string, ll: Llaves, op: { ttl?: number; urgencia?: string; tema?: string } = {}) {
  const u = new URL(s.endpoint);
  const jwt = await vapid(u.origin, ll);
  const h: Record<string, string> = {
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
    TTL: String(op.ttl ?? 3600), Urgency: op.urgencia || 'high', Authorization: `vapid t=${jwt}, k=${ll.publica}`,
  };
  if (op.tema) h.Topic = op.tema;
  const r = await fetch(s.endpoint, { method: 'POST', headers: h, body: await cifrar(s, texto) });
  const detalle = r.ok ? '' : (await r.text().catch(() => '')).slice(0, 200);
  return { estado: r.status, detalle };
}
