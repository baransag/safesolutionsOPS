const express = require("express");
const ctrl    = require("../controllers/uploadController");
const { requireAuth } = require("../middleware/auth");
const { uploadEmployeePhoto, uploadSelfie, uploadSitePhoto } = require("../middleware/upload");

const router = express.Router();

router.use(requireAuth);

router.post("/employee-photo", uploadEmployeePhoto.single("photo"),     ctrl.uploadEmployeePhoto);
router.post("/selfie",         uploadSelfie.single("selfie"),           ctrl.uploadSelfie);
router.post("/site-photo",     uploadSitePhoto.single("sitePhoto"),     ctrl.uploadSitePhoto);

module.exports = router;