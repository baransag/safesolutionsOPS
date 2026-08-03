require("dotenv").config();

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",

  DB_HOST:     process.env.DB_HOST     || "localhost",
  DB_PORT:     parseInt(process.env.DB_PORT || "5432", 10),
  DB_NAME:     process.env.DB_NAME     || "safe_solutions_ops",
  DB_USER:     process.env.DB_USER     || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",

  JWT_SECRET:              required("JWT_SECRET",              "dev_only_change_me"),
  JWT_EXPIRES_IN:          process.env.JWT_EXPIRES_IN          || "8h",
  JWT_REFRESH_SECRET:      required("JWT_REFRESH_SECRET",      "dev_only_change_me_too"),
  JWT_REFRESH_EXPIRES_IN:  process.env.JWT_REFRESH_EXPIRES_IN  || "7d",

  DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD || "Safe@123",

  OFFICE_LAT:           parseFloat(process.env.OFFICE_LAT           || "31.5497"),
  OFFICE_LNG:           parseFloat(process.env.OFFICE_LNG           || "74.3436"),
  OFFICE_RADIUS_METERS: parseInt(  process.env.OFFICE_RADIUS_METERS  || "500", 10),

  UPLOAD_DIR:    process.env.UPLOAD_DIR    || "uploads",
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || "5", 10)
};