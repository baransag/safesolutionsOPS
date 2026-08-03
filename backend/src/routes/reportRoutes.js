const express = require("express");
const ctrl    = require("../controllers/reportController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(requireAuth, requireRole("Manager", "Controller", "Boss"));

router.get("/",                      ctrl.getReports);
router.get("/export/pdf",            ctrl.exportPdf);
router.get("/export/excel",          ctrl.exportExcel);
router.get("/export/history/excel",  ctrl.exportHistoryExcel);

module.exports = router;