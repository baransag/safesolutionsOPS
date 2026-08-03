const QRCode       = require("qrcode");
const OfficeQrModel = require("../models/officeQrModel");
const AuditModel    = require("../models/auditModel");
const asyncHandler  = require("../utils/asyncHandler");
const { ApiError }  = require("../middleware/errorHandler");

/**
 * ===========================================================================
 * OFFICE QR — Version 1 scope
 * ===========================================================================
 * Exactly ONE permanent QR code exists system-wide, with the fixed value:
 *
 *     SAFE-SOLUTIONS-HQ-001
 *
 * It is generated once by the seeder and stored in PostgreSQL (office_qr
 * table, single row, id = 1). Controllers/Boss can re-render/regenerate the
 * PNG image (e.g. if the printed poster is lost) but the underlying value
 * never changes.
 *
 * Employees never generate anything — they only scan the printed office QR
 * via the client-side camera flow, and this backend verifies the scanned
 * value against the database.
 *
 * Out of scope for v1: per-employee QR codes, vehicle QR codes.
 * ===========================================================================
 */

const OFFICE_QR_CODE = "SAFE-SOLUTIONS-HQ-001";

// GET /api/qr/office  (Controller/Boss only)
// ?format=png  — streams the raw PNG binary
// (default)   — returns JSON with a data URL for use as <img src="…">
const getOfficeQr = asyncHandler(async (req, res) => {
  const record = await OfficeQrModel.get();
  if (!record) {
    throw new ApiError(
      404,
      "Office QR has not been generated yet. Run: npm run seed"
    );
  }

  if (req.query.format === "png") {
    const buffer = Buffer.from(record.image_base64, "base64");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="office-qr.png"');
    return res.send(buffer);
  }

  res.json({
    success:      true,
    code:         record.code,
    imageDataUrl: `data:image/png;base64,${record.image_base64}`,
    updatedAt:    record.updated_at
  });
});

// POST /api/qr/office/regenerate  (Controller/Boss only)
// Re-renders the PNG for the existing fixed code value.
// Does NOT change the code — regenerating never creates a new QR value.
const regenerateOfficeQr = asyncHandler(async (req, res) => {
  const pngBuffer = await QRCode.toBuffer(OFFICE_QR_CODE, {
    type:                 "png",
    errorCorrectionLevel: "H",
    margin: 2,
    scale:  8
  });
  const imageBase64 = pngBuffer.toString("base64");

  const record = await OfficeQrModel.regenerateImage(imageBase64, req.user.userId);
  if (!record) {
    throw new ApiError(
      404,
      "Office QR row not found in database. Run: npm run seed"
    );
  }

  await AuditModel.log(
    req.user.userId, "REGENERATE_OFFICE_QR", "office_qr", null,
    { code: OFFICE_QR_CODE }
  );

  res.json({
    success:      true,
    code:         record.code,
    imageDataUrl: `data:image/png;base64,${record.image_base64}`,
    updatedAt:    record.updated_at
  });
});

// POST /api/qr/verify  (any authenticated user — employees use this when scanning)
// Body: { value: "<scanned QR text>" }
const verifyOfficeQr = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (!value || typeof value !== "string") {
    throw new ApiError(400, "value is required.");
  }

  const record = await OfficeQrModel.get();
  if (!record) {
    throw new ApiError(404, "Office QR has not been generated yet.");
  }

  const valid = value.trim() === record.code;

  await AuditModel.log(
    req.user.userId, "VERIFY_OFFICE_QR", "office_qr", null,
    { scannedValue: value.trim(), valid }
  );

  if (!valid) {
    return res.status(400).json({
      success: false,
      valid:   false,
      message: "Invalid QR code."
    });
  }

  res.json({ success: true, valid: true, code: record.code });
});

module.exports = { getOfficeQr, regenerateOfficeQr, verifyOfficeQr, OFFICE_QR_CODE };