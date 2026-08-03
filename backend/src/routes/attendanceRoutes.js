const express = require("express");
const ctrl    = require("../controllers/attendanceController");
const { requireAuth }               = require("../middleware/auth");
const { requireRole }               = require("../middleware/role");
const { uploadSelfie, uploadSitePhoto } = require("../middleware/upload");

const router = express.Router();

router.use(requireAuth);

// ── Specific sub-routes FIRST (before /:id) ────────────────────────────────
// Prevents Express matching "status", "check-in" etc. as :id values.

router.get("/status/today", ctrl.todayStatus);

router.post("/check-in",  uploadSelfie.single("selfie"),        ctrl.checkIn);
router.post("/check-out", uploadSitePhoto.single("sitePhoto"),  ctrl.checkOut);

router.post("/", requireRole("Manager", "Controller", "Boss"), ctrl.create);

// ── Parameterised routes ────────────────────────────────────────────────────

router.get("/",    ctrl.list);
router.get("/:id", ctrl.getOne);

router.put(   "/:id", requireRole("Manager", "Controller", "Boss"), ctrl.update);
router.delete("/:id", requireRole("Controller", "Boss"),            ctrl.remove);

router.post("/:id/approve", requireRole("Manager", "Controller", "Boss"), ctrl.approve);
router.post("/:id/reject",  requireRole("Manager", "Controller", "Boss"), ctrl.reject);

module.exports = router;