const express = require("express");
const ctrl    = require("../controllers/settingsController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(requireAuth);

router.get("/",  ctrl.getSettings);
router.put("/", requireRole("Controller", "Boss"), ctrl.updateSettings);

module.exports = router;