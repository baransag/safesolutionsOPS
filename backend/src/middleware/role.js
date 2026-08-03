/**
 * Role-based access guard.
 * Boss always passes (mirrors frontend Auth.can() where BOSS = ["*"]).
 *
 * Usage: requireRole("Controller", "Boss")
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated." });
    }
    if (req.user.role === "Boss" || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res
      .status(403)
      .json({ success: false, message: "You do not have permission to perform this action." });
  };
}

module.exports = { requireRole };