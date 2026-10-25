/*REPORTES-INICIO*/
// Reportes en PDF y Excel (MINUME XVII) · Albert Silvestre
// Reportes con la línea gráfica de MINUME XVII: banda azul de la marca con el logo, franja de colores, letras Barlow,
// indicadores, tabla con el color del equipo y pie con el logo institucional y las páginas.
// Las librerías y las letras se cargan solo la primera vez que alguien descarga; después quedan guardadas para usarse sin internet.
(() => {
  const LIBS = {
    xlsx: ['https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'],
    pdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'],
  };
  // Línea gráfica
  const MARCA = { noche: '#0a0464', rey: '#002193', azul: '#0043c5', medio: '#0090fb', celeste: '#00b5ff', turquesa: '#00fdef', rosa: '#ffbeff', rojo: '#e53535' };
  const FRANJA = [MARCA.noche, MARCA.rey, MARCA.azul, MARCA.medio, MARCA.celeste, MARCA.turquesa];
  const LOGO = { blanco: ['marca/minume-xvii-blanco.svg', 750.23 / 83.98], institucional: ['marca/educacion-plerd-color.svg', 395 / 168.28], adorno: ['marca/anillo-turquesa.svg', 289.45 / 286.88] };
  const LETRAS = { 'BarlowCondensed-ExtraBold': ['Barlow Condensed', 'bold'], 'BarlowCondensed-SemiBold': ['Barlow Condensed', 'normal'], 'Barlow-Regular': ['Barlow', 'normal'], 'Barlow-SemiBold': ['Barlow', 'bold'] };

  const cargados = {};
  const cargar = src => cargados[src] || (cargados[src] = new Promise((ok, mal) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => { delete cargados[src]; mal(new Error('No se pudo cargar ' + src)); };
    document.head.appendChild(s);
  }));
  const cargarTodo = async l => { for (const s of l) await cargar(s); };
  const sinEmoji = v => String(v ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  const paraPdf = v => sinEmoji(v).replace(/→/g, '->').replace(/✓/g, '').replace(/[^\u0000-ÿ–—‘’“”•…€]/g, '').trim();
  const rgb = h => { h = String(h || MARCA.medio).trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  // Si el color del equipo es claro (rosa o turquesa, por ejemplo), el texto encima va oscuro para que se lea
  const esClaro = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62; };
  const argb = h => 'FF' + rgb(h).map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  const mezcla = (a, b, t) => rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t));
  const TONOS = { verde: '#1F9D63', amarillo: '#B7791F', rojo: '#D64553', azul: '#2F6FD6', gris: '#6B7894' };
  const NAVY = MARCA.noche, TINTA = '#1B1F45', SUAVE = '#5B6390', CLARO = '#F2F5FF', LINEA = '#DDE3F5';
  const fechaTxt = () => new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const bajar = (blob, nombre) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const aviso = t => (window.toastMinume || console.log)(t);

  // Los logos son SVG; el PDF y el Excel los necesitan en PNG, así que se dibujan una vez en un lienzo
  const pngs = {};
  const aPng = (clave, ancho) => pngs[clave + ancho] || (pngs[clave + ancho] = new Promise(ok => {
    const [src, prop] = LOGO[clave], im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas'); cv.width = ancho; cv.height = Math.round(ancho / prop);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      try { ok({ data: cv.toDataURL('image/png'), prop }); } catch { ok(null); }
    };
    im.onerror = () => ok(null); im.src = src;
  }));
  // Letras de la marca para el PDF (si no cargan, el PDF sale igual con Helvetica)
  let letras = null;
  const cargarLetras = () => letras || (letras = (async () => {
    if (!/^https?:$/.test(location.protocol)) return null;
    const out = {};
    for (const n of Object.keys(LETRAS)) {
      const r = await fetch('/fuentes/' + n + '.ttf'); if (!r.ok) throw new Error('sin letras');
      const b = new Uint8Array(await r.arrayBuffer()); let s = '';
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      out[n] = btoa(s);
    }
    return out;
  })().catch(() => { letras = null; return null; }));

  async function excel(c) {
    await cargarTodo(LIBS.xlsx);
    const wb = new ExcelJS.Workbook(); wb.creator = 'Albert Silvestre'; wb.lastModifiedBy = 'Albert Silvestre'; wb.company = 'MINUME XVII'; wb.created = new Date();
    const n = c.columnas.length, ac = c.color || MARCA.medio, sobreAc = esClaro(ac) ? NAVY : '#FFFFFF', numAc = esClaro(ac) ? NAVY : ac;
    const TIT = { name: 'Barlow Condensed', family: 2 }, TXT = { name: 'Barlow', family: 2 };
    const ws = wb.addWorksheet(sinEmoji(c.titulo).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Reporte', {
      views: [{ showGridLines: false }],
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .4, right: .4, top: .5, bottom: .6, header: .2, footer: .3 } },
      headerFooter: { oddFooter: `&L&8MINUME XVII · ${sinEmoji(c.titulo)}&R&8Página &P de &N` },
    });
    ws.columns = c.columnas.map(col => ({ width: col.w || 16 }));
    const fila = (r, alto) => { ws.getRow(r).height = alto; };
    const solido = h => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: argb(h) } });
    const banda = (r, valor, estilo) => { ws.mergeCells(r, 1, r, n); const x = ws.getCell(r, 1); x.value = valor; Object.assign(x, estilo); return x; };
    // banda azul de la marca con el logo a la izquierda y el equipo a la derecha
    banda(1, sinEmoji(c.equipo || '').toUpperCase(), { font: { ...TIT, size: 12, bold: true, color: { argb: argb(MARCA.celeste) } }, fill: solido(NAVY), alignment: { vertical: 'middle', horizontal: 'right', indent: 1 } }); fila(1, 40);
    const logo = await aPng('blanco', 600);
    if (logo) ws.addImage(wb.addImage({ base64: logo.data, extension: 'png' }), { tl: { col: 0.12, row: 0.28 }, ext: { width: 230, height: 230 / logo.prop }, editAs: 'absolute' });
    // franja de colores de la marca
    for (let i = 1; i <= n; i++) ws.getCell(2, i).fill = solido(FRANJA[Math.floor((i - 1) * FRANJA.length / n)]);
    fila(2, 5);
    banda(3, sinEmoji(c.titulo).toUpperCase(), { font: { ...TIT, size: 22, bold: true, color: { argb: argb(NAVY) } }, alignment: { vertical: 'middle', indent: 1 } }); fila(3, 38);
    banda(4, `Generado el ${fechaTxt()}${c.autor ? ' · por ' + sinEmoji(c.autor) : ''} · ${c.nota || 'Datos de ejemplo'}`, { font: { ...TXT, size: 9.5, italic: true, color: { argb: argb(SUAVE) } }, alignment: { vertical: 'middle', indent: 1 } }); fila(4, 18);
    let r = 6;
    if (c.subtitulo) { banda(r, sinEmoji(c.subtitulo), { font: { ...TXT, size: 10, color: { argb: argb(TINTA) } }, alignment: { wrapText: true, vertical: 'top', indent: 1 } }); fila(r, 30); r += 2; }
    const k = (c.resumen || []).slice(0, n);
    if (k.length) {
      k.forEach(([v, t], i) => {
        const a = ws.getCell(r, i + 1), b = ws.getCell(r + 1, i + 1), borde = { style: 'thin', color: { argb: argb(LINEA) } };
        a.value = sinEmoji(v); a.font = { ...TIT, size: 20, bold: true, color: { argb: argb(numAc) } };
        b.value = sinEmoji(t).toUpperCase(); b.font = { ...TXT, size: 8.5, bold: true, color: { argb: argb(SUAVE) } };
        [a, b].forEach(x => { x.fill = solido(CLARO); x.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }; });
        a.border = { top: borde, left: { style: 'thick', color: { argb: argb(ac) } }, right: borde }; b.border = { bottom: borde, left: { style: 'thick', color: { argb: argb(ac) } }, right: borde };
      });
      fila(r, 30); fila(r + 1, 26); r += 3;
    }
    const cab = r, linea = { style: 'thin', color: { argb: argb(LINEA) } };
    c.columnas.forEach((col, i) => { const x = ws.getCell(cab, i + 1); x.value = sinEmoji(col.t).toUpperCase(); x.font = { ...TIT, size: 11, bold: true, color: { argb: argb(sobreAc) } }; x.fill = solido(ac); x.alignment = { vertical: 'middle', wrapText: true, indent: 1 }; x.border = { bottom: { style: 'medium', color: { argb: argb(NAVY) } } }; });
    fila(cab, 28);
    c.filas.forEach((f, j) => {
      const fr = cab + 1 + j;
      f.forEach((v, i) => {
        const x = ws.getCell(fr, i + 1); x.value = typeof v === 'number' ? v : sinEmoji(v);
        x.font = { ...TXT, size: 10, color: { argb: argb(TINTA) } };
        x.alignment = { vertical: 'top', wrapText: true, indent: 1 };
        x.border = { bottom: linea };
        if (j % 2) x.fill = solido('#F6F8FF');
        if (c.estado && i === c.estadoCol) { const t = c.estado(v); if (t) x.font = { ...TXT, size: 10, bold: true, color: { argb: argb(TONOS[t]) } }; }
      });
    });
    const fin = cab + c.filas.length + 2;
    banda(fin, `${c.filas.length} ${c.filas.length === 1 ? 'registro' : 'registros'} · MINUME XVII · XVII Período de Sesiones · ${sinEmoji(c.equipo || '')}`, { font: { ...TXT, size: 9, italic: true, color: { argb: argb(SUAVE) } }, alignment: { indent: 1 } });
    ws.autoFilter = { from: { row: cab, column: 1 }, to: { row: cab, column: n } };
    ws.views = [{ state: 'frozen', ySplit: cab, showGridLines: false }];
    bajar(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), c.archivo + '.xlsx');
  }

  async function pdf(c) {
    await cargarTodo(LIBS.pdf);
    const [ttf, logo, inst, adorno] = await Promise.all([cargarLetras(), aPng('blanco', 760), aPng('institucional', 320), aPng('adorno', 240)]);
    const { jsPDF } = window.jspdf, doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: paraPdf(c.titulo), subject: 'MINUME XVII', author: 'Albert Silvestre', creator: 'MINUME XVII · Albert Silvestre' });
    if (ttf) for (const [n, [fam, est]] of Object.entries(LETRAS)) { doc.addFileToVFS(n + '.ttf', ttf[n]); doc.addFont(n + '.ttf', fam, est); }
    const TIT = ttf ? 'Barlow Condensed' : 'helvetica', TXT = ttf ? 'Barlow' : 'helvetica';
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), ac = rgb(c.color || MARCA.medio), navy = rgb(NAVY), suave = rgb(SUAVE);
    const sobreAc = esClaro(c.color) ? navy : [255, 255, 255];
    const cabecera = () => {
      // degradado de la marca, de azul noche a azul rey
      const pasos = 70;
      for (let i = 0; i < pasos; i++) { const t = i / (pasos - 1); doc.setFillColor(...(t < .6 ? mezcla(MARCA.noche, MARCA.rey, t / .6) : mezcla(MARCA.rey, MARCA.azul, (t - .6) / .4))); doc.rect(W * i / pasos, 0, W / pasos + .3, 26, 'F'); }
      if (adorno) { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .35 })); doc.addImage(adorno.data, 'PNG', W - 26, -16, 40, 40 / adorno.prop, 'adorno', 'FAST'); doc.restoreGraphicsState(); }
      if (logo) doc.addImage(logo.data, 'PNG', 12, 7, 64, 64 / logo.prop, 'logo', 'FAST');
      else { doc.setFont(TIT, 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.text('MINUME XVII', 12, 13); }
      doc.setFont(TIT, 'normal'); doc.setFontSize(10.5); doc.setTextColor(...rgb(MARCA.celeste)); doc.text(paraPdf(c.equipo || '').toUpperCase(), 12, 20.5, { charSpace: .3 });
      doc.setFont(TXT, 'normal'); doc.setFontSize(8.5); doc.setTextColor(214, 224, 255);
      doc.text(paraPdf(fechaTxt()), W - 32, 12, { align: 'right' }); doc.text(paraPdf(c.nota || 'Datos de ejemplo'), W - 32, 17, { align: 'right' });
      // franja de colores de la marca
      FRANJA.forEach((col, i) => { doc.setFillColor(...rgb(col)); doc.rect(W * i / FRANJA.length, 26, W / FRANJA.length + .2, 1.6, 'F'); });
    };
    cabecera();
    doc.setTextColor(...navy); doc.setFont(TIT, 'bold'); doc.setFontSize(26); doc.text(paraPdf(c.titulo).toUpperCase(), 12, 41);
    doc.setFillColor(...ac); doc.rect(12, 44, 22, 1.3, 'F');
    let y = 51;
    doc.setFont(TXT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(...suave);
    const sub = doc.splitTextToSize(paraPdf((c.subtitulo ? c.subtitulo.replace(/[.\s]*$/, '. ') : '') + (c.autor ? `Generado por ${c.autor}.` : '')), W - 24);
    if (sub.length && sub[0]) { doc.text(sub, 12, y); y += sub.length * 4.3; }
    const k = (c.resumen || []).slice(0, 6);
    if (k.length) {
      y += 1; const gap = 4, bw = (W - 24 - gap * (k.length - 1)) / k.length;
      k.forEach(([v, t], i) => {
        const x = 12 + i * (bw + gap);
        doc.setFillColor(...rgb(CLARO)); doc.setDrawColor(...rgb(LINEA)); doc.roundedRect(x, y, bw, 19, 3, 3, 'FD');
        doc.setFillColor(...ac); doc.roundedRect(x, y + 3.5, 1.6, 12, .8, .8, 'F');
        doc.setFont(TIT, 'bold'); doc.setFontSize(19); doc.setTextColor(...(esClaro(c.color) ? navy : ac)); doc.text(paraPdf(String(v)), x + 6, y + 9.6);
        doc.setFont(TXT, 'bold'); doc.setFontSize(7); doc.setTextColor(...suave); doc.text((doc.splitTextToSize(paraPdf(t).toUpperCase(), bw - 9)[0] || ''), x + 6, y + 15, { charSpace: .15 });
      });
      y += 25;
    }
    doc.autoTable({
      startY: y, head: [c.columnas.map(x => paraPdf(x.t).toUpperCase())], body: c.filas.map(f => f.map(v => paraPdf(v))),
      margin: { left: 12, right: 12, top: 34, bottom: 18 }, theme: 'grid',
      styles: { font: TXT, fontSize: 8.6, cellPadding: { top: 2.4, bottom: 2.4, left: 2.8, right: 2.8 }, textColor: rgb(TINTA), lineColor: rgb(LINEA), lineWidth: .2, overflow: 'linebreak', valign: 'top' },
      headStyles: { font: TIT, fillColor: ac, textColor: sobreAc, fontStyle: 'bold', fontSize: 9.4, valign: 'middle', lineColor: ac },
      alternateRowStyles: { fillColor: [246, 248, 255] },
      columnStyles: Object.fromEntries(c.columnas.map((x, i) => [i, x.pdf ? { cellWidth: x.pdf } : {}])),
      didParseCell: d => { if (d.section === 'body' && c.estado && d.column.index === c.estadoCol) { const t = c.estado(d.cell.raw); if (t) { d.cell.styles.textColor = rgb(TONOS[t]); d.cell.styles.fontStyle = 'bold'; } } },
      didDrawPage: d => { if (d.pageNumber > 1) cabecera(); },
    });
    const tot = doc.internal.getNumberOfPages();
    for (let p = 1; p <= tot; p++) {
      doc.setPage(p);
      FRANJA.forEach((col, i) => { doc.setFillColor(...rgb(col)); doc.rect(12 + (W - 24) * i / FRANJA.length, H - 12, (W - 24) / FRANJA.length + .1, .7, 'F'); });
      doc.setFont(TXT, 'normal'); doc.setFontSize(8); doc.setTextColor(110, 118, 160);
      doc.text(paraPdf(`MINUME XVII · XVII Período de Sesiones · ${c.titulo} · ${c.filas.length} ${c.filas.length === 1 ? 'registro' : 'registros'}`), 12, H - 6.5);
      if (inst) doc.addImage(inst.data, 'PNG', W - 58, H - 10.6, 7.6 * inst.prop, 7.6, 'inst', 'FAST');
      doc.setFont(TIT, 'bold'); doc.setFontSize(9); doc.setTextColor(...navy); doc.text(`PÁGINA ${p} DE ${tot}`, W - 12, H - 6.5, { align: 'right' });
    }
    bajar(doc.output('blob'), c.archivo + '.pdf');
  }

  // Expediente de una persona atendida por Bienestar: una hoja vertical tipo ficha clínica, con su foto,
  // una banda de identificación como la pulsera de un hospital (con QR del caso), la gravedad y lo que se hizo.
  async function expediente(e) {
    await cargarTodo(LIBS.pdf);
    const [ttf, logo, inst, adorno] = await Promise.all([cargarLetras(), aPng('blanco', 760), aPng('institucional', 320), aPng('adorno', 240)]);
    const { jsPDF } = window.jspdf, doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: 'Expediente ' + paraPdf(e.codigo), subject: 'MINUME XVII · Bienestar', author: 'Albert Silvestre', creator: 'MINUME XVII · Albert Silvestre' });
    if (ttf) for (const [n, [fam, est]] of Object.entries(LETRAS)) { doc.addFileToVFS(n + '.ttf', ttf[n]); doc.addFont(n + '.ttf', fam, est); }
    const TIT = ttf ? 'Barlow Condensed' : 'helvetica', TXT = ttf ? 'Barlow' : 'helvetica';
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14, navy = rgb(NAVY), suave = rgb(SUAVE), tinta = rgb(TINTA), linea = rgb(LINEA);
    const pc = rgb(e.prioColor || MARCA.medio);
    // cabecera de la marca
    const pasos = 60;
    for (let i = 0; i < pasos; i++) { const t = i / (pasos - 1); doc.setFillColor(...(t < .6 ? mezcla(MARCA.noche, MARCA.rey, t / .6) : mezcla(MARCA.rey, MARCA.azul, (t - .6) / .4))); doc.rect(W * i / pasos, 0, W / pasos + .3, 24, 'F'); }
    if (adorno) { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .35 })); doc.addImage(adorno.data, 'PNG', W - 24, -14, 36, 36 / adorno.prop, 'adorno', 'FAST'); doc.restoreGraphicsState(); }
    if (logo) doc.addImage(logo.data, 'PNG', M, 6.5, 56, 56 / logo.prop, 'logo', 'FAST');
    else { doc.setFont(TIT, 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.text('MINUME XVII', M, 13); }
    doc.setFont(TIT, 'normal'); doc.setFontSize(10); doc.setTextColor(...rgb(MARCA.celeste)); doc.text('SUBSECRETARÍA DE BIENESTAR', M, 19.5, { charSpace: .3 });
    doc.setFont(TXT, 'normal'); doc.setFontSize(8.2); doc.setTextColor(214, 224, 255);
    doc.text('Documento confidencial', W - 28, 11, { align: 'right' }); doc.text(paraPdf(fechaTxt()), W - 28, 16, { align: 'right' });
    FRANJA.forEach((col, i) => { doc.setFillColor(...rgb(col)); doc.rect(W * i / FRANJA.length, 24, W / FRANJA.length + .2, 1.4, 'F'); });

    // título y número de caso
    let y = 38;
    doc.setFont(TIT, 'bold'); doc.setFontSize(24); doc.setTextColor(...navy); doc.text('EXPEDIENTE DE ATENCIÓN', M, y);
    doc.setFontSize(22); doc.setTextColor(...navy); doc.text(paraPdf(e.codigo), W - M, y, { align: 'right' });
    doc.setFillColor(...rgb(MARCA.medio)); doc.rect(M, y + 3, 22, 1.2, 'F');
    y += 10;

    // foto, como en una ficha clínica
    const fw = 40, fh = 48;
    doc.setDrawColor(...navy); doc.setLineWidth(.6); doc.setFillColor(...rgb(CLARO)); doc.rect(M, y, fw, fh, 'FD');
    if (e.foto) { try { doc.addImage(e.foto, 'JPEG', M + 1.2, y + 1.2, fw - 2.4, fw - 2.4, 'foto', 'FAST'); } catch {} }
    else { doc.setFont(TIT, 'bold'); doc.setFontSize(30); doc.setTextColor(170, 180, 215); doc.text(paraPdf(e.nombre.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase()), M + fw / 2, y + fw / 2 + 4, { align: 'center' }); }
    doc.setFillColor(...navy); doc.rect(M, y + fw, fw, fh - fw, 'F');
    doc.setFont(TIT, 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255); doc.text(e.foto ? 'FOTO DE IDENTIFICACIÓN' : 'SIN FOTO', M + fw / 2, y + fw + 5.4, { align: 'center', charSpace: .2 });

    // banda de identificación (como la pulsera del hospital)
    const bx = M + fw + 6, bw = W - M - bx;
    doc.setFillColor(...navy); doc.roundedRect(bx, y, bw, 20, 2.5, 2.5, 'F');
    doc.setFillColor(...pc); doc.rect(bx, y, 3, 20, 'F');
    doc.setFont(TIT, 'bold'); doc.setFontSize(19); doc.setTextColor(255, 255, 255);
    doc.text(doc.splitTextToSize(paraPdf(e.nombre).toUpperCase(), bw - 30)[0], bx + 7, y + 9);
    doc.setFont(TXT, 'normal'); doc.setFontSize(8.6); doc.setTextColor(200, 214, 255);
    doc.text(paraPdf([e.persona, e.id ? 'ID ' + e.id : '', e.com].filter(Boolean).join('  ·  ')), bx + 7, y + 15.5);
    if (window.qrcode) {
      const q = window.qrcode(0, 'M'); q.addData(`M17-EXP.${e.codigo}.${e.id || 'sin-id'}`); q.make();
      const n = q.getModuleCount(), s = 15 / n, qx = bx + bw - 18, qy = y + 2.5;
      doc.setFillColor(255, 255, 255); doc.rect(qx - 1, qy - 1, 17, 17, 'F'); doc.setFillColor(...navy);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(qx + c * s, qy + r * s, s + .02, s + .02, 'F');
    }
    // datos de la persona
    // la comisión va a lo ancho porque su nombre completo es largo
    const datos = [['Comisión', e.comNombre ? `${e.com} · ${e.comNombre}` : e.com, 1], ['Delegación o equipo', e.del], ['Colegio', e.col], ['Llegada', `${e.fecha} · ${e.llega}`], ['Lugar', e.donde]];
    const dy = y + 25, cw = bw / 2;
    datos.forEach(([k, v, ancho], i) => {
      const j = i + 1, x = ancho ? bx : bx + (j % 2) * cw, yy = dy + (ancho ? 0 : Math.floor(j / 2) * 8.6), cw2 = ancho ? bw : cw;
      doc.setFont(TXT, 'bold'); doc.setFontSize(6.8); doc.setTextColor(...suave); doc.text(paraPdf(k).toUpperCase(), x, yy, { charSpace: .15 });
      doc.setFont(TXT, 'normal'); doc.setFontSize(9.6); doc.setTextColor(...tinta); doc.text(doc.splitTextToSize(paraPdf(v || '—'), cw2 - 3)[0], x, yy + 4.2);
    });
    y += fh + 7;

    // alergias
    const hayAl = e.alergias && e.alergias.length;
    doc.setFillColor(...(hayAl ? [253, 232, 234] : [229, 246, 237])); doc.setDrawColor(...rgb(hayAl ? TONOS.rojo : TONOS.verde)); doc.setLineWidth(.4);
    doc.roundedRect(M, y, W - 2 * M, 12, 2, 2, 'FD');
    doc.setFont(TIT, 'bold'); doc.setFontSize(11); doc.setTextColor(...rgb(hayAl ? TONOS.rojo : TONOS.verde));
    doc.text(hayAl ? 'ALERGIAS Y ALERTAS MÉDICAS' : 'SIN ALERGIAS REGISTRADAS', M + 4, y + 5.2, { charSpace: .2 });
    doc.setFont(TXT, 'normal'); doc.setFontSize(9); doc.setTextColor(...tinta);
    doc.text(doc.splitTextToSize(paraPdf(hayAl ? e.alergias.join(' · ') : 'Verifica siempre con la persona antes de dar alimentos o primeros auxilios.'), W - 2 * M - 8)[0], M + 4, y + 9.6);
    y += 17;

    // triaje: gravedad, categoría, motivo y estado
    const cols = [['Gravedad', e.prio, e.prioDesc], ['Categoría', e.area, ''], ['Motivo', e.motivo, ''], ['Estado', e.estado, e.salida]];
    const gw = (W - 2 * M - 9) / 4;
    cols.forEach(([k, v, s], i) => {
      const x = M + i * (gw + 3), sobre = i === 0 ? (esClaro(e.prioColor) ? navy : [255, 255, 255]) : null;
      if (i === 0) { doc.setFillColor(...pc); doc.roundedRect(x, y, gw, 19, 2, 2, 'F'); } else { doc.setFillColor(...rgb(CLARO)); doc.setDrawColor(...linea); doc.roundedRect(x, y, gw, 19, 2, 2, 'FD'); }
      doc.setFont(TXT, 'bold'); doc.setFontSize(6.8); doc.setTextColor(...(sobre || suave)); doc.text(paraPdf(k).toUpperCase(), x + 3.5, y + 5, { charSpace: .15 });
      const lv = doc.setFont(TIT, 'bold').setFontSize(13.5).splitTextToSize(paraPdf(v || '—'), gw - 6), dos = lv.length > 1 && !s;
      if (dos) doc.setFontSize(10.5); doc.setTextColor(...(sobre || navy)); doc.text(dos ? doc.splitTextToSize(paraPdf(v), gw - 6).slice(0, 2) : lv[0], x + 3.5, dos ? y + 10.5 : y + 11.5);
      if (s) { doc.setFont(TXT, 'normal'); doc.setFontSize(7.6); doc.setTextColor(...(sobre || suave)); doc.text(doc.splitTextToSize(paraPdf(s), gw - 6)[0], x + 3.5, y + 16); }
    });
    y += 26;

    // secciones de texto
    const seccion = (titulo, texto, alto = 0) => {
      doc.setFont(TIT, 'bold'); doc.setFontSize(11.5); doc.setTextColor(...navy); doc.text(paraPdf(titulo).toUpperCase(), M, y, { charSpace: .25 });
      doc.setDrawColor(...linea); doc.setLineWidth(.3); doc.line(M, y + 1.8, W - M, y + 1.8); y += 6.5;
      doc.setFont(TXT, 'normal'); doc.setFontSize(9.6); doc.setTextColor(...tinta);
      const l = doc.splitTextToSize(paraPdf(texto || 'Sin anotaciones.'), W - 2 * M); doc.text(l, M, y); y += Math.max(alto, l.length * 4.4) + 5;
    };
    seccion('Motivo de consulta y observaciones', e.que, 8);
    seccion('Atención brindada', e.hizo, 8);
    seccion('Egreso', e.sale ? `${e.salida || 'Cerrado'} · salió a las ${e.sale} · estuvo ${e.duracion}` : 'El caso sigue abierto.');

    // historial
    doc.setFont(TIT, 'bold'); doc.setFontSize(11.5); doc.setTextColor(...navy); doc.text('HISTORIAL DEL CASO', M, y, { charSpace: .25 }); y += 2.5;
    doc.autoTable({
      startY: y, head: [['HORA', 'QUÉ PASÓ', 'QUIÉN']], body: (e.hist || []).map(f => f.map(v => paraPdf(v))),
      margin: { left: M, right: M, bottom: 40 }, theme: 'grid',
      styles: { font: TXT, fontSize: 8.6, cellPadding: 2.2, textColor: tinta, lineColor: linea, lineWidth: .2 },
      headStyles: { font: TIT, fillColor: navy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [246, 248, 255] }, columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 52 } },
    });
    y = doc.lastAutoTable.finalY + 14;
    if (y > H - 42) { doc.addPage(); y = 30; }
    // firmas
    const fwid = (W - 2 * M - 12) / 2;
    [['Atendió', e.encargado], ['Firma y sello de Bienestar', '']].forEach(([k, v], i) => {
      const x = M + i * (fwid + 12);
      doc.setDrawColor(...navy); doc.setLineWidth(.35); doc.line(x, y + 8, x + fwid, y + 8);
      doc.setFont(TXT, 'normal'); doc.setFontSize(9.4); doc.setTextColor(...tinta); if (v) doc.text(paraPdf(v), x, y + 6);
      doc.setFont(TXT, 'bold'); doc.setFontSize(7); doc.setTextColor(...suave); doc.text(paraPdf(k).toUpperCase(), x, y + 12, { charSpace: .15 });
    });
    // pie
    const tot = doc.internal.getNumberOfPages();
    for (let p = 1; p <= tot; p++) {
      doc.setPage(p);
      FRANJA.forEach((col, i) => { doc.setFillColor(...rgb(col)); doc.rect(M + (W - 2 * M) * i / FRANJA.length, H - 13, (W - 2 * M) / FRANJA.length + .1, .7, 'F'); });
      doc.setFont(TXT, 'normal'); doc.setFontSize(7.4); doc.setTextColor(110, 118, 160);
      doc.text(paraPdf(`MINUME XVII · Expediente ${e.codigo} · Contiene datos de salud: solo para Bienestar y la Coordinación general`), M, H - 7.5);
      if (inst) doc.addImage(inst.data, 'PNG', W - 54, H - 11.4, 7 * inst.prop, 7, 'inst', 'FAST');
      doc.setFont(TIT, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...navy); doc.text(`${p}/${tot}`, W - M, H - 7.5, { align: 'right' });
    }
    const archivo = sinEmoji(e.nombre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    bajar(doc.output('blob'), `expediente-${e.codigo.toLowerCase()}-${archivo}.pdf`);
  }
  window.exportarExpediente = async e => {
    aviso('Preparando el expediente…');
    try { await expediente(e); aviso('Expediente descargado'); }
    catch (er) { console.warn(er); aviso('No se pudo crear el expediente. La primera vez necesita internet para preparar las plantillas.'); }
  };

  window.exportarReporte = async (fmt, c) => {
    if (!c) return;
    if (!c.filas || !c.filas.length) return aviso('Todavía no hay datos para descargar');
    aviso(fmt === 'pdf' ? 'Preparando el PDF…' : 'Preparando el Excel…');
    try { fmt === 'pdf' ? await pdf(c) : await excel(c); aviso(fmt === 'pdf' ? 'PDF descargado' : 'Excel descargado'); }
    catch (e) { console.warn(e); aviso('No se pudo crear el archivo. La primera vez necesita internet para preparar las plantillas.'); }
  };
  window.MINUME_LIBS_REPORTES = [...LIBS.xlsx, ...LIBS.pdf];
})();
/*REPORTES-FIN*/