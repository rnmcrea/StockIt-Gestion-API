const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarPDF(usos) {
  const rutaArchivo = path.join(__dirname, '../tmp/reporte.pdf');
  const doc = new PDFDocument({ margin: 40 });
  const tableTop = 100;

  doc.pipe(fs.createWriteStream(rutaArchivo));

  doc.fontSize(18).text('📄 Reporte Semanal de Repuestos Usados', { align: 'center' });
  doc.moveDown(2);

  // Encabezados de columna
  const headers = ['Código Repuesto', 'Cliente', 'Cantidad'];
  const colX = [50, 250, 450];

  doc.fontSize(12).font('Helvetica-Bold');
  headers.forEach((titulo, i) => {
    doc.text(titulo, colX[i], tableTop);
  });

  // Filas de datos
  doc.font('Helvetica');
  if (!usos || usos.length === 0) {
    doc.text('No se encontraron registros esta semana.', 50, tableTop + 30);
  } else {
    let y = tableTop + 30;
    usos.forEach((uso) => {
      doc.text(uso.repuesto || 'N/A', colX[0], y);
      doc.text(uso.cliente || 'N/A', colX[1], y);
      doc.text(uso.cantidad?.toString() || '0', colX[2], y);
      y += 20;
    });
  }

  doc.end();
  return rutaArchivo;
}

module.exports = generarPDF;
