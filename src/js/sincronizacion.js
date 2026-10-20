/*SYNC-INICIO*/
// Sincronización con Supabase (MINUME XVII) · Albert Silvestre
// Sincroniza con Supabase todo lo compartido (claves "minume.compartido.*") entre teléfonos y computadoras.
// La página sigue guardando en el teléfono como siempre; este puente sube cada cambio, baja lo de los demás en tiempo real
// y, si no hay internet, guarda la cola y la envía cuando vuelve la señal.
(() => {
  const C = window.MINUME_SUPABASE; if (!C || !C.url || !C.key) return;
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const PRE = 'minume.compartido.', COLA = 'minume.sync.cola';
  const ls = window.localStorage, setOrig = Storage.prototype.setItem;
  let cliente = null, listo = false, sinRed = false, aplicando = false;
  const pendientes = new Map(), enviando = new Set(), antes = new Set();
  let cola; try { cola = new Set(JSON.parse(ls.getItem(COLA) || '[]')); } catch { cola = new Set(); }
  const guardarCola = () => { try { setOrig.call(ls, COLA, JSON.stringify([...cola])); } catch {} };
  const avisar = clave => { try { window.dispatchEvent(new StorageEvent('storage', { key: clave })); } catch {} };
  const quien = () => { try { const u = JSON.parse(ls.getItem(`minume.${window.MINUME_SISTEMA || 'portal'}.usuario`) || 'null'); return u ? u.nombre : 'Inicio'; } catch { return ''; } };
  const estado = e => { window.MINUME_SYNC = e; try { window.dispatchEvent(new CustomEvent('minume-sync', { detail: e })); } catch {} };
  function ponerLocal(clave, valor) { const t = JSON.stringify(valor); if (ls.getItem(clave) === t) return false; aplicando = true; try { setOrig.call(ls, clave, t); } finally { aplicando = false; } return true; }
  Storage.prototype.setItem = function (k, v) {
    setOrig.call(this, k, v);
    if (this !== ls || aplicando || typeof k !== 'string' || !k.startsWith(PRE)) return;
    if (!listo) { if (sinRed) { cola.add(k); guardarCola(); } else antes.add(k); return; }
    clearTimeout(pendientes.get(k)); pendientes.set(k, setTimeout(() => subir(k), 350));
  };
  async function subir(k) {
    pendientes.delete(k);
    let valor; try { valor = JSON.parse(ls.getItem(k)); } catch { return; } if (valor == null) return;
    if (!cliente || navigator.onLine === false) { cola.add(k); guardarCola(); return; }
    enviando.add(k);
    const { data, error } = await cliente.rpc('minume_guardar', { p_clave: k, p_valor: valor, p_por: quien() });
    enviando.delete(k);
    if (error) { cola.add(k); guardarCola(); estado('error'); return; }
    cola.delete(k); guardarCola(); estado('conectado');
    if (data && !pendientes.has(k) && ponerLocal(k, data)) avisar(k); // lo que guardaron otros al mismo tiempo también llega
  }
  function recibir(fila) {
    if (!fila || !fila.clave || pendientes.has(fila.clave) || enviando.has(fila.clave)) return;
    if (ponerLocal(fila.clave, fila.valor)) avisar(fila.clave);
  }
  const cargarLib = () => new Promise((ok, mal) => { if (window.supabase) return ok(); const s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
  let iniciando = false;
  async function iniciar() {
    if (iniciando || listo) return; iniciando = true;
    estado('conectando');
    try { await cargarLib(); } catch { sinRed = true; [...antes].forEach(k => cola.add(k)); antes.clear(); guardarCola(); estado('sin-internet'); iniciando = false; return setTimeout(iniciar, 20000); }
    cliente = window.supabase.createClient(C.url, C.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await cliente.from('minume_compartido').select('clave, valor');
    if (error) { sinRed = true; estado('sin-internet'); iniciando = false; return setTimeout(iniciar, 20000); }
    sinRed = false;
    const remotas = new Set(data.map(f => f.clave));
    // Lo que el teléfono creó al abrir (datos de ejemplo) no pisa lo que ya está en la base
    data.forEach(f => { if (!cola.has(f.clave)) { antes.delete(f.clave); if (ponerLocal(f.clave, f.valor)) avisar(f.clave); } });
    listo = true;
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PRE) && !remotas.has(k)) cola.add(k); }
    [...antes].forEach(k => cola.add(k)); antes.clear();
    [...cola].forEach(k => subir(k));
    cliente.channel('minume-compartido').on('postgres_changes', { event: '*', schema: 'public', table: 'minume_compartido' }, p => recibir(p.new))
      .subscribe(s => estado(s === 'SUBSCRIBED' ? 'conectado' : s === 'CLOSED' || s === 'CHANNEL_ERROR' ? 'reconectando' : 'conectando'));
  }
  addEventListener('online', () => { if (listo) [...cola].forEach(k => subir(k)); else iniciar(); });
  iniciar();
})();
/*SYNC-FIN*/