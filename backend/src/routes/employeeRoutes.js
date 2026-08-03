const express   = require("express");
const { body }  = require("express-validator");
const ctrl      = require("../controllers/employeeController");
const { requireAuth }        = require("../middleware/auth");
const { requireRole }        = require("../middleware/role");
const { validate }           = require("../middleware/validate");
const { uploadEmployeePhoto } = require("../middleware/upload");

const router = express.Router();

router.use(requireAuth);

router.get("/", ctrl.list);

// Self-service profile update — must be before /:id to avoid being swallowed.
router.patch("/me", uploadEmployeePhoto.single("photo"), ctrl.updateOwnProfile);

router.get("/:id", ctrl.getOne);

router.post(
  "/",
  requireRole("Controller", "Boss"),
  uploadEmployeePhoto.single("photo"),
  [body("name").notEmpty().withMessage("Name is required.")],
  validate,
  ctrl.create
);

router.put(
  "/:id",
  requireRole("Controller", "Boss"),
  uploadEmployeePhoto.single("photo"),
  ctrl.update
);

router.delete("/:id", requireRole("Controller", "Boss"), ctrl.remove);

module.exports = router;