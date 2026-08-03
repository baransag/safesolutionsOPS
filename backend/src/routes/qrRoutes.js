const express = require("express");
const ctrl    = require("../controllers/qrController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(requireAuth);

// Controller/Boss: view the permanent office QR image
// GET  /api/qr/office           — JSON with imageDataUrl
// GET  /api/qr/office?format=png — raw PNG binary
router.get("/office", requireRole("Controller", "Boss"), ctrl.getOfficeQr);

// Controller/Boss: re-render the PNG (the QR value itself never changes)
router.post("/office/regenerate", requireRole("Controller", "Boss"), ctrl.regenerateOfficeQr);

// All authenticated users: verify a scanned QR value
// Body: { value: "SAFE-SOLUTIONS-HQ-001" }
router.post("/verify", ctrl.verifyOfficeQr);

module.exports = router;