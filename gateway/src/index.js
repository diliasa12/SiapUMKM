require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { globalRateLimiter } = require("./middleware/rateLimiter");

const kbliRoutes = require("./routes/kbli.routes");
const addressRoutes = require("./routes/address.routes");
const halalRoutes = require("./routes/halal.routes");
const glossaryRoutes = require("./routes/glossary.routes");

const app = express();
const PORT = process.env.PORT || 8080;

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(globalRateLimiter);

// Session management sederhana tanpa auth penuh (sesuai arsitektur PRD §5):
// setiap request boleh membawa header x-session-id untuk melanjutkan sesi
// yang sudah ada (mis. address/parse -> address/export).
app.use((req, res, next) => {
  req.sessionIdHeader = req.header("x-session-id") || null;
  next();
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "siapumkm-gateway" });
});

// ---------------------------------------------------------------------------
// Routing per modul
// ---------------------------------------------------------------------------
app.use("/kbli", kbliRoutes); // F1 — Siap Usaha
app.use("/address", addressRoutes); // F3 — Siap Kirim
app.use("/halal", halalRoutes); // F4 — Siap Halal
app.use("/glossary", glossaryRoutes); // F5 — Kamus Istilah OSS

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// ---------------------------------------------------------------------------
// Global error handler (safety net terakhir)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Terjadi kesalahan pada server. Silakan coba lagi.",
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SiapUMKM Gateway berjalan di port ${PORT}`);
  });
}

module.exports = app;
