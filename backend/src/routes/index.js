const express = require("express");

const router = express.Router();

router.use("/auth",          require("./authRoutes"));
router.use("/employees",     require("./employeeRoutes"));
router.use("/attendance",    require("./attendanceRoutes"));
router.use("/reports",       require("./reportRoutes"));
router.use("/dashboard",     require("./dashboardRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/settings",      require("./settingsRoutes"));
router.use("/sites",         require("./siteRoutes"));
router.use("/qr",            require("./qrRoutes"));
router.use("/uploads",       require("./uploadRoutes"));

router.get("/health", (req, res) =>
  res.json({ success: true, status: "ok", time: new Date().toISOString() })
);

module.exports = router;