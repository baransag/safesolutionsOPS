const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const path       = require("path");
const rateLimit  = require("express-rate-limit");

const env    = require("./config/env");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Security headers — disable crossOriginResourcePolicy so uploaded images
// can be loaded directly by the frontend without CORP errors.
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
  ],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Credential-stuffing protection on sensitive auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/auth/login",           authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

// Serve uploaded images (employee photos, selfies, site photos) statically.
// URL pattern: GET /uploads/<subfolder>/<filename>
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", env.UPLOAD_DIR))
);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;