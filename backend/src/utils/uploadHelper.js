const fs = require("fs");
const path = require("path");
const env = require("../config/env");

/**
 * Saves a base64 encoded image to the uploads directory.
 * @param {string} base64String The data URL (e.g. data:image/jpeg;base64,...)
 * @param {string} subfolder The target subfolder (e.g. "employees", "selfies", "site")
 * @returns {string|null} The relative path of the saved file, or null if invalid
 */
function saveBase64Image(base64String, subfolder) {
  if (!base64String || typeof base64String !== "string" || !base64String.startsWith("data:image/")) {
    return null;
  }
  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const type = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const extension = type.split("/")[1] || "jpg";
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const destDir = path.join(__dirname, "..", "..", env.UPLOAD_DIR, subfolder);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, filename), buffer);
    return `${subfolder}/${filename}`;
  } catch (error) {
    console.error("Failed to save base64 image:", error);
    return null;
  }
}

module.exports = { saveBase64Image };
