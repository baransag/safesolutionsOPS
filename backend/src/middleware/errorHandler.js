function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === "23505") {
    return res
      .status(409)
      .json({ success: false, message: "A record with this value already exists." });
  }
  if (err.code === "23503") {
    return res
      .status(409)
      .json({ success: false, message: "This record is referenced elsewhere and cannot be modified." });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ success: false, message: err.message });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error.",
    error: err.message || String(err),
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {})
  });
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { notFound, errorHandler, ApiError };