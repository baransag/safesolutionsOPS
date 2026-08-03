const { validationResult } = require("express-validator");

/**
 * Run after an array of express-validator checks.
 * Short-circuits with HTTP 422 on any validation failure.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

module.exports = { validate };