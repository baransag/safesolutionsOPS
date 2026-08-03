const express = require("express");
const ctrl    = require("../controllers/siteController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(requireAuth);

router.get("/",  ctrl.list);
router.post("/", requireRole("Controller", "Boss"), ctrl.create);

module.exports = router;