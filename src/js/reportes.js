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
    const wb = new ExcelJS.Workbook(); wb.creator = 'MINUME XVII'; wb.created = new Date();
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