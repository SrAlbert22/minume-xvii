/*SYNC-INICIO*/
// Sincronización con Supabase (MINUME XVII) · Albert Silvestre
// Cada persona entra con su código: el servidor lo verifica (minume_entrar) y entrega una sesión de 30 días.
// Con esa sesión se leen (minume_datos) y se guardan (minume_guardar) las claves "minume.compartido.*".
// La tabla no se puede leer directo: la base solo responde a quien tiene una sesión válida.
// Si no hay internet, los cambios quedan en cola y se envían cuando vuelve la señal.
(() => {
  const C = window.MINUME_SUPABASE; if (!C || !C.url || !C.key) return;
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const PRE = 'minume.compartido.', COLA = 'minume.sync.cola', TOKEN = 'minume.sesion.token';
  const ls = window.localStorage, setOrig = Storage.prototype.setItem;
  let cliente = null, listo = false, sinRed = false, aplicando = false, canal = null;
  const pendientes = new Map(), enviando = new Set(), antes = new Set();
  let cola; try { cola = new Set(JSON.parse(ls.getItem(COLA) || '[]')); } catch { cola = new Set(); }
  const guardarCola = () => { try { setOrig.call(ls, COLA, JSON.stringify([...cola])); } catch {} };
  const avisar = clave => { try { window.dispatchEvent(new StorageEvent('storage', { key: clave })); } catch {} };
  const token = () => { try { return ls.getItem(TOKEN); } catch { return null; } };
  const estado = e => { window.MINUME_SYNC = e; try { window.dispatchEvent(new CustomEvent('minume-sync', { detail: e })); } catch {} };
  const rpc = async (fn, args) => {
    const r = await fetch(`${C.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const d = await r.json().catch(() => null);
    if (!r.ok) { const e = new Error((d && d.message) || 'Error del servidor'); e.code = d && d.code; throw e; }
    return d;
  };
  function sesionVencida() {
    try { ls.removeItem(TOKEN); } catch {}
    listo = false; estado('sin-sesion');
    try { window.dispatchEvent(new Event('minume-sesion-vencida')); } catch {}
  }
  // La página llama esto al entrar con un código
  window.MINUME_ENTRAR = async codigo => {
    try {
      const d = await rpc('minume_entrar', { p_codigo: codigo });
      if (!d || d.error) return { error: (d && d.error) || 'No se pudo verificar el código.' };
      setOrig.call(ls, TOKEN, d.token); iniciar(); return d;
    } catch (e) { return navigator.onLine === false || e instanceof TypeError ? { sinRed: true } : { error: 'No se pudo verificar el código. Intenta otra vez.' }; }
  };
  // Funciones del servidor que piden la sesión (por ejemplo, los códigos de acceso de coordinación)
  window.MINUME_RPC = (fn, args) => token() ? rpc(fn, { p_token: token(), ...args }).catch(e => { if (e.code === '28000') sesionVencida(); throw e; }) : Promise.reject(new Error('Vuelve a entrar con tu código'));
  window.MINUME_SALIR = () => { try { ls.removeItem(TOKEN); } catch {} if (canal && cliente) cliente.removeChannel(canal); canal = null; listo = false; };
  function ponerLocal(clave, valor) { const t = JSON.stringify(valor); if (ls.getItem(clave) === t) return false; aplicando = true; try { setOrig.call(ls, clave, t); } finally { aplicando = false; } return true; }
  Storage.prototype.setItem = function (k, v) {
    setOrig.call(this, k, v);
    if (this !== ls || aplicando || typeof k !== 'string' || !k.startsWith(PRE)) return;
    if (!listo) { if (sinRed || !token()) { cola.add(k); guardarCola(); } else antes.add(k); return; }
    clearTimeout(pendientes.get(k)); pendientes.set(k, setTimeout(() => subir(k), 350));
  };
  async function subir(k) {
    pendientes.delete(k);
    let valor; try { valor = JSON.parse(ls.getItem(k)); } catch { return; } if (valor == null) return;
    if (!token() || navigator.onLine === false) { cola.add(k); guardarCola(); return; }
    enviando.add(k);
    try {
      const data = await rpc('minume_guardar', { p_token: token(), p_clave: k, p_valor: valor });
      enviando.delete(k); cola.delete(k); guardarCola(); estado('conectado');
      if (data && !pendientes.has(k) && ponerLocal(k, data)) avisar(k); // lo que guardaron otros al mismo tiempo también llega
    } catch (e) {
      enviando.delete(k);
      if (e.code === '28000') return sesionVencida();
      if (e.code === '42501' || /no permitida/.test(e.message)) { cola.delete(k); guardarCola(); return; } // esa información no es de este equipo
      cola.add(k); guardarCola(); estado('error');
    }
  }
  async function bajar(claves) {
    const d = await rpc('minume_datos', claves ? { p_token: token(), p_claves: claves } : { p_token: token() });
    if (d.personal) window.MINUME_PERSONAL = d.personal;   // nombres y equipos del staff real (nunca sus códigos)
    for (const f of d.filas || []) if (!pendientes.has(f.clave) && !enviando.has(f.clave) && !cola.has(f.clave)) { antes.delete(f.clave); if (ponerLocal(f.clave, f.valor)) avisar(f.clave); }
    return d;
  }
  const cargarLib = () => new Promise((ok, mal) => { if (window.supabase) return ok(); const s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
  let iniciando = false;
  async function iniciar() {
    if (iniciando || listo) return;
    if (!token()) { estado('sin-sesion'); return; }
    iniciando = true; estado('conectando');
    let d;
    try { d = await bajar(null); }
    catch (e) { iniciando = false; if (e.code === '28000') return sesionVencida(); sinRed = true; [...antes].forEach(k => cola.add(k)); antes.clear(); guardarCola(); estado('sin-internet'); return setTimeout(iniciar, 20000); }
    sinRed = false; listo = true; iniciando = false;
    const remotas = new Set((d.filas || []).map(f => f.clave)), ocultas = new Set(d.ocultas || []);
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PRE) && !remotas.has(k) && !ocultas.has(k)) cola.add(k); }
    [...antes].forEach(k => cola.add(k)); antes.clear();
    [...cola].forEach(k => subir(k));
    estado('conectado');
    // Tiempo real: el servidor solo avisa qué clave cambió; cada teléfono la vuelve a pedir con su sesión
    try {
      await cargarLib();
      cliente = cliente || window.supabase.createClient(C.url, C.key, { auth: { persistSession: false, autoRefreshToken: false } });
      canal = cliente.channel('minume-compartido', { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'cambio' }, m => { const k = m.payload && m.payload.clave; if (k && listo) bajar([k]).catch(() => {}); })
        .on('broadcast', { event: 'chat' }, m => { try { window.dispatchEvent(new CustomEvent('minume-chat', { detail: m.payload || {} })); } catch {} })
        .subscribe(s => estado(s === 'SUBSCRIBED' ? 'conectado' : s === 'CLOSED' || s === 'CHANNEL_ERROR' ? 'reconectando' : 'conectando'));
    } catch { setInterval(() => listo && bajar(null).catch(() => {}), 30000); }   // sin la librería, revisa cada 30 s
  }
  addEventListener('online', () => { if (listo) [...cola].forEach(k => subir(k)); else iniciar(); });
  iniciar();
})();
/*SYNC-FIN*/