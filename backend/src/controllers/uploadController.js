const { ApiError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Generic upload handler.
 * Returns the filename and the URL the frontend can use with the static server.
 * subfolder must match the directory under /uploads/  (employees | selfies | site)
 */
function respondWithFile(subfolder) {
  return asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file uploaded.");
    res.status(201).json({
      success:  true,
      filename: req.file.filename,
      url:      `/uploads/${subfolder}/${req.file.filename}`
    });
  });
}

const uploadEmployeePhoto = respondWithFile("employees");
const uploadSelfie        = respondWithFile("selfies");
const uploadSitePhoto     = respondWithFile("site");

module.exports = { uploadEmployeePhoto, uploadSelfie, uploadSitePhoto };