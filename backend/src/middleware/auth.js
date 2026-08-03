const { verifyAccessToken } = require("../utils/jwt");

/**
 * Requires a valid Bearer JWT.
 * Populates req.user = { userId, employeeId, username, role }.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication token missing." });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Session expired. Please log in again." });
    }
    return res
      .status(401)
      .json({ success: false, message: "Invalid authentication token." });
  }
}

module.exports = { requireAuth };