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

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  })
);


// CORS CONFIG
const allowedOrigins = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:55502",
  "http://localhost:55502",
  "https://safesolutions-attendance.netlify.app",
  env.CLIENT_ORIGIN
].filter(Boolean);


app.use(
  cors({
    origin(origin, callback) {

      // Allow requests without origin (Postman, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      // Allow frontend domains
      if (
        allowedOrigins.includes(origin) ||
        /\.netlify\.app$/.test(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin) ||
        process.env.ALLOW_ALL_CORS === "true"
      ) {
        return callback(null, true);
      }

      console.log("Blocked CORS Origin:", origin);
      return callback(new Error("Not allowed by CORS"));

    },

    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan(
    env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);


// Login protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});


app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);


app.use("/api", routes);

// Uploaded images
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "..", env.UPLOAD_DIR)
  )
);

// Serve frontend static assets (Index.html, script.js, style.css, assets)
const rootDir = path.join(__dirname, "..", "..");
app.use(express.static(rootDir));

app.get(["/", "/index.html", "/Index.html"], (req, res) => {
  res.sendFile(path.join(rootDir, "Index.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;