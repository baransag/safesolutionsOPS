const express = require("express");
const ctrl    = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/stats",             ctrl.stats);
router.get("/weekly-attendance", ctrl.weeklyAttendance);

module.exports = router;