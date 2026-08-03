const PDFDocument = require("pdfkit");

/**
 * Streams a simple tabular PDF report directly to the Express response.
 *
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {string} title
 * @param {{ header: string, key: string }[]} columns
 * @param {object[]} rows
 */
function sendPdf(res, filename, title, columns, rows) {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Title
  doc.fontSize(18).fillColor("#021C4F").text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#555").text(`Generated ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1);

  const startX   = doc.page.margins.left;
  let   y        = doc.y;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;

  // Header row
  doc.rect(startX, y, colWidth * columns.length, 20).fill("#021C4F");
  doc.fillColor("#fff").fontSize(10);
  columns.forEach((c, i) => {
    doc.text(c.header, startX + i * colWidth + 4, y + 5, { width: colWidth - 8 });
  });
  y += 22;

  // Data rows
  doc.fillColor("#000").fontSize(9);
  rows.forEach((row, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage({ margin: 40, size: "A4", layout: "landscape" });
      y = doc.page.margins.top;
    }
    if (idx % 2 === 0) {
      doc.rect(startX, y, colWidth * columns.length, 18).fill("#F2F4FA");
      doc.fillColor("#000");
    }
    columns.forEach((c, i) => {
      const val = row[c.key] == null ? "-" : String(row[c.key]);
      doc.text(val, startX + i * colWidth + 4, y + 4, { width: colWidth - 8 });
    });
    y += 18;
  });

  doc.end();
}

module.exports = { sendPdf };