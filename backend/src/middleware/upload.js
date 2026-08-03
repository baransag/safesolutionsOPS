const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const env    = require("../config/env");

function makeStorage(subfolder) {
  const dest = path.join(__dirname, "..", "..", env.UPLOAD_DIR, subfolder);
  fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext    = path.extname(file.originalname) || ".jpg";
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    }
  });
}

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed."));
  }
  cb(null, true);
};

const limits = { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 };

const uploadEmployeePhoto = multer({ storage: makeStorage("employees"), fileFilter: imageFileFilter, limits });
const uploadSelfie        = multer({ storage: makeStorage("selfies"),   fileFilter: imageFileFilter, limits });
const uploadSitePhoto     = multer({ storage: makeStorage("site"),      fileFilter: imageFileFilter, limits });

module.exports = { uploadEmployeePhoto, uploadSelfie, uploadSitePhoto };