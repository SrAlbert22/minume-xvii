// MINUME XVII · crea un par de llaves VAPID para los avisos al teléfono (Web Push) · Albert Silvestre
// Uso: node herramientas/llaves_vapid.mjs
// La pública va en armar.py (VAPID) y en el Vault como minume_vapid_publica; la privada SOLO en el Vault (minume_vapid_privada).
import crypto from 'node:crypto';
const j = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'jwk' });
const publica = Buffer.concat([Buffer.from([4]), Buffer.from(j.x, 'base64url'), Buffer.from(j.y, 'base64url')]).toString('base64url');
console.log(JSON.stringify({ publica, privada: j.d }));
