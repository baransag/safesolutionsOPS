const express = require("express");
const ctrl    = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/",                ctrl.list);
router.get("/unread-count",    ctrl.unreadCount);
router.post("/mark-all-read",  ctrl.markAllRead);

module.exports = router;