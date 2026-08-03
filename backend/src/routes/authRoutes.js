const express   = require("express");
const { body }  = require("express-validator");
const ctrl      = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validate }    = require("../middleware/validate");

const router = express.Router();

router.post(
  "/login",
  [body("username").notEmpty(), body("password").notEmpty()],
  validate,
  ctrl.login
);

router.post("/refresh", ctrl.refresh);

router.post("/logout", requireAuth, ctrl.logout);

router.get("/me", requireAuth, ctrl.me);

router.post(
  "/change-password",
  requireAuth,
  [body("newPassword").isLength({ min: 6 })],
  validate,
  ctrl.changePassword
);

router.post(
  "/forgot-password",
  [body("username").notEmpty()],
  validate,
  ctrl.forgotPassword
);

router.post(
  "/reset-password",
  [body("token").notEmpty(), body("newPassword").isLength({ min: 6 })],
  validate,
  ctrl.resetPassword
);

module.exports = router;