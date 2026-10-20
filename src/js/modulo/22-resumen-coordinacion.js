// ---------- Resumen de coordinación general ----------
function resumenGeneral() {
  const o = leerComis(), enSes = COMISIONES.filter(([c]) => o[c] && o[c].est === 'sesion').length, prob = COMISIONES.filter(([c]) => o[c] && (o[c].est === 'detenida' || o[c].est === 'faltan')).length;
  cobEstado(); const { min } = cobAhora(); cobSembrar(min); const sn = cobFilas(min).filter(x => x.est === 'descubierta').length;
  const rl = leerRondas(), atras = RUTAS.filter(r => estadoRuta(r, rl).k === 'atrasada').length, enPunto = leerAtenciones().filter(x => !x.sale).length;
  return tile(`${enSes}/${COMISIONES.length}`, 'comisiones en sesión', '#2fd38c', 'ir-comisiones-vivo') + tile(prob, 'comisiones con problema', '#ff4d5e', 'ir-comisiones-vivo', prob > 0)
    + tile(sn, 'puntos de seguridad sin nadie', '#ff4d5e', 'ir-cobertura', sn > 0) + tile(atras, 'rondas atrasadas', '#ffd23f', 'ir-rondas', atras > 0)
    + tile(enPunto, 'personas en bienestar', '#c58bff', 'ir-atenciones') + tile(leerObjetos().filter(x => x.est === 'guardado').length, 'objetos perdidos guardados', '#45c8ff', 'ir-objetos')
    + tile(EV_LISTA.filter(e => estEv(e).est === 'curso').length, 'eventos en curso', '#f472b6', 'ir-eventos') + tile(EV_LISTA.filter(e => estEv(e).problema).length, 'eventos con problema', '#ff4d5e', 'ir-eventos', EV_LISTA.some(e => estEv(e).problema));
}
