/*REPORTES-INICIO*/
// Reportes en PDF y Excel (MINUME XVII) · Albert Silvestre
// Reportes en PDF y Excel con la plantilla de MINUME XVII (banda de marca, título, indicadores, tabla con el color del equipo y pie con páginas).
// Las librerías se cargan solo la primera vez que alguien descarga; después quedan guardadas para usarse sin internet.
(() => {
  const LIBS = {
    xlsx: ['https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'],
    pdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'],
  };
  const cargados = {};
  const cargar = src => cargados[src] || (cargados[src] = new Promise((ok, mal) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => { delete cargados[src]; mal(new Error('No se pudo cargar ' + src)); };
    document.head.appendChild(s);
  }));
  const cargarTodo = async l => { for (const s of l) await cargar(s); };
  const sinEmoji = v => String(v ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  const paraPdf = v => sinEmoji(v).replace(/→/g, '->').replace(/✓/g, '').replace(/[^\u0000-ÿ–—‘’“”•…€]/g, '').trim();
  const rgb = h => { h = String(h || '#2f7bff').trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  // Si el color del equipo es claro (amarillo, por ejemplo), el texto encima va oscuro para que se lea
  const esClaro = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62; };
  const argb = h => 'FF' + rgb(h).map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  const TONOS = { verde: '#1F9D63', amarillo: '#B7791F', rojo: '#D64553', azul: '#2F6FD6', gris: '#6B7894' };
  const NAVY = '#0B1636', TINTA = '#1F2A44', SUAVE = '#5F6C8C';
  const fechaTxt = () => new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const bajar = (blob, nombre) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const aviso = t => (window.toastMinume || console.log)(t);

  async function excel(c) {
    await cargarTodo(LIBS.xlsx);
    const wb = new ExcelJS.Workbook(); wb.creator = 'MINUME XVII'; wb.created = new Date();
    const n = c.columnas.length, ac = c.color || '#2f7bff', sobreAc = esClaro(ac) ? NAVY : '#FFFFFF', numAc = esClaro(ac) ? NAVY : ac;
    const ws = wb.addWorksheet(sinEmoji(c.titulo).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Reporte', {
      views: [{ showGridLines: false }],
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .4, right: .4, top: .5, bottom: .6, header: .2, footer: .3 } },
      headerFooter: { oddFooter: `&L&8MINUME XVII · ${sinEmoji(c.titulo)}&R&8Página &P de &N` },
    });
    ws.columns = c.columnas.map(col => ({ width: col.w || 16 }));
    const fila = (r, alto) => { ws.getRow(r).height = alto; };
    const banda = (r, valor, estilo) => { ws.mergeCells(r, 1, r, n); const x = ws.getCell(r, 1); x.value = valor; Object.assign(x, estilo); return x; };
    banda(1, `MINUME XVII   ·   ${sinEmoji(c.equipo || '')}`, { font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(NAVY) } }, alignment: { vertical: 'middle', indent: 1 } }); fila(1, 26);
    banda(2, '', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(ac) } } }); fila(2, 5);
    banda(3, sinEmoji(c.titulo), { font: { name: 'Calibri', size: 20, bold: true, color: { argb: argb(NAVY) } }, alignment: { vertical: 'middle', indent: 1 } }); fila(3, 36);
    banda(4, `Generado el ${fechaTxt()}${c.autor ? ' · por ' + sinEmoji(c.autor) : ''} · ${c.nota || 'Datos de ejemplo'}`, { font: { name: 'Calibri', size: 9.5, italic: true, color: { argb: argb(SUAVE) } }, alignment: { vertical: 'middle', indent: 1 } }); fila(4, 18);
    let r = 6;
    if (c.subtitulo) { banda(r, sinEmoji(c.subtitulo), { font: { name: 'Calibri', size: 10, color: { argb: argb(TINTA) } }, alignment: { wrapText: true, vertical: 'top', indent: 1 } }); fila(r, 30); r += 2; }
    const k = (c.resumen || []).slice(0, n);
    if (k.length) {
      k.forEach(([v, t], i) => {
        const a = ws.getCell(r, i + 1), b = ws.getCell(r + 1, i + 1), borde = { style: 'thin', color: { argb: 'FFDCE3F2' } };
        a.value = sinEmoji(v); a.font = { name: 'Calibri', size: 18, bold: true, color: { argb: argb(numAc) } };
        b.value = sinEmoji(t); b.font = { name: 'Calibri', size: 9, color: { argb: argb(SUAVE) } };
        [a, b].forEach(x => { x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FC' } }; x.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }; });
        a.border = { top: borde, left: { style: 'medium', color: { argb: argb(ac) } }, right: borde }; b.border = { bottom: borde, left: { style: 'medium', color: { argb: argb(ac) } }, right: borde };
      });
      fila(r, 28); fila(r + 1, 28); r += 3;
    }
    const cab = r, linea = { style: 'thin', color: { argb: 'FFE3E8F2' } };
    c.columnas.forEach((col, i) => { const x = ws.getCell(cab, i + 1); x.value = sinEmoji(col.t); x.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: argb(sobreAc) } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(ac) } }; x.alignment = { vertical: 'middle', wrapText: true, indent: 1 }; x.border = { bottom: { style: 'medium', color: { argb: argb(NAVY) } } }; });
    fila(cab, 28);
    c.filas.forEach((f, j) => {
      const fr = cab + 1 + j;
      f.forEach((v, i) => {
        const x = ws.getCell(fr, i + 1); x.value = typeof v === 'number' ? v : sinEmoji(v);
        x.font = { name: 'Calibri', size: 10, color: { argb: argb(TINTA) } };
        x.alignment = { vertical: 'top', wrapText: true, indent: 1 };
        x.border = { bottom: linea };
        if (j % 2) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F8FC' } };
        if (c.estado && i === c.estadoCol) { const t = c.estado(v); if (t) x.font = { name: 'Calibri', size: 10, bold: true, color: { argb: argb(TONOS[t]) } }; }
      });
    });
    const fin = cab + c.filas.length + 2;
    banda(fin, `${c.filas.length} ${c.filas.length === 1 ? 'registro' : 'registros'} · MINUME XVII · ${sinEmoji(c.equipo || '')}`, { font: { name: 'Calibri', size: 9, italic: true, color: { argb: argb(SUAVE) } }, alignment: { indent: 1 } });
    ws.autoFilter = { from: { row: cab, column: 1 }, to: { row: cab, column: n } };
    ws.views = [{ state: 'frozen', ySplit: cab, showGridLines: false }];
    bajar(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), c.archivo + '.xlsx');
  }

  async function pdf(c) {
    await cargarTodo(LIBS.pdf);
    const { jsPDF } = window.jspdf, doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), ac = rgb(c.color), navy = rgb(NAVY), suave = rgb(SUAVE);
    const cabecera = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 22, 'F');
      doc.setFillColor(...ac); doc.rect(0, 22, W, 1.4, 'F');
      doc.roundedRect(12, 5, 12, 12, 2.6, 2.6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(4, 18, 29); doc.text(c.letra || 'M', 18, 13.5, { align: 'center' });
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.text('MINUME XVII', 28, 10.6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(195, 205, 238); doc.text(paraPdf(c.equipo || ''), 28, 15.8);
      doc.setFontSize(8.5); doc.text(paraPdf(fechaTxt()), W - 12, 10.6, { align: 'right' }); doc.text(paraPdf(c.nota || 'Datos de ejemplo'), W - 12, 15.8, { align: 'right' });
    };
    cabecera();
    doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(21); doc.text(paraPdf(c.titulo), 12, 36);
    let y = 42;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...suave);
    const sub = doc.splitTextToSize(paraPdf((c.subtitulo ? c.subtitulo.replace(/[.\s]*$/, '. ') : '') + (c.autor ? `Generado por ${c.autor}.` : '')), W - 24);
    if (sub.length && sub[0]) { doc.text(sub, 12, y); y += sub.length * 4.3; }
    const k = (c.resumen || []).slice(0, 6);
    if (k.length) {
      y += 2; const gap = 4, bw = (W - 24 - gap * (k.length - 1)) / k.length;
      k.forEach(([v, t], i) => {
        const x = 12 + i * (bw + gap);
        doc.setFillColor(243, 246, 252); doc.setDrawColor(222, 229, 242); doc.roundedRect(x, y, bw, 18, 2.6, 2.6, 'FD');
        doc.setFillColor(...ac); doc.roundedRect(x, y + 3.5, 1.4, 11, .7, .7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...navy); doc.text(paraPdf(String(v)), x + 5.5, y + 9);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...suave); doc.text(doc.splitTextToSize(paraPdf(t), bw - 8)[0] || '', x + 5.5, y + 14.2);
      });
      y += 24;
    }
    doc.autoTable({
      startY: y, head: [c.columnas.map(x => paraPdf(x.t))], body: c.filas.map(f => f.map(v => paraPdf(v))),
      margin: { left: 12, right: 12, top: 30, bottom: 16 }, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.4, cellPadding: 2.5, textColor: rgb(TINTA), lineColor: [227, 232, 242], lineWidth: .2, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: ac, textColor: esClaro(c.color) ? navy : [255, 255, 255], fontStyle: 'bold', fontSize: 8.6, valign: 'middle', lineColor: ac },
      alternateRowStyles: { fillColor: [246, 248, 252] },
      columnStyles: Object.fromEntries(c.columnas.map((x, i) => [i, x.pdf ? { cellWidth: x.pdf } : {}])),
      didParseCell: d => { if (d.section === 'body' && c.estado && d.column.index === c.estadoCol) { const t = c.estado(d.cell.raw); if (t) { d.cell.styles.textColor = rgb(TONOS[t]); d.cell.styles.fontStyle = 'bold'; } } },
      didDrawPage: d => { if (d.pageNumber > 1) cabecera(); },
    });
    const tot = doc.internal.getNumberOfPages();
    for (let p = 1; p <= tot; p++) {
      doc.setPage(p); doc.setDrawColor(222, 229, 242); doc.setLineWidth(.3); doc.line(12, H - 10, W - 12, H - 10);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 132, 160);
      doc.text(paraPdf(`MINUME XVII · ${c.titulo} · ${c.filas.length} ${c.filas.length === 1 ? 'registro' : 'registros'}`), 12, H - 5.5);
      doc.text(`Página ${p} de ${tot}`, W - 12, H - 5.5, { align: 'right' });
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