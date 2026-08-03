const ExcelJS = require("exceljs");

/**
 * Streams an attendance/report dataset as an .xlsx workbook to the response.
 *
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {{ header: string, key: string, width?: number }[]} columns
 * @param {object[]} rows
 */
async function sendExcel(res, filename, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Safe Solutions Smart Attendance System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Report");
  sheet.columns = columns;

  // Style header row
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type:    "pattern",
    pattern: "solid",
    fgColor: { argb: "FF021C4F" }
  };

  rows.forEach((r) => sheet.addRow(r));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { sendExcel };