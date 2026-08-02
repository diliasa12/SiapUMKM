const rateLimit = require("express-rate-limit");

/**
 * Rate limiter global untuk seluruh endpoint gateway.
 * SiapUMKM tidak memakai auth penuh (lihat arsitektur di PRD), jadi
 * pembatasan berbasis IP menjadi lapisan pertahanan utama terhadap abuse,
 * khususnya untuk endpoint yang memanggil model AI / LLM fallback yang mahal.
 */
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);

const globalRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Terlalu banyak permintaan. Silakan coba lagi sebentar lagi.",
  },
});

/**
 * Rate limiter lebih ketat khusus untuk endpoint yang berpotensi memicu
 * fallback LLM (RAG fallback pada klasifikasi KBLI & chatbot glossary),
 * karena biaya per-request lebih tinggi dibanding rule-based endpoints.
 */
const llmSensitiveRateLimiter = rateLimit({
  windowMs,
  max: Math.max(5, Math.floor(max / 2)),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message:
      "Terlalu banyak permintaan ke fitur AI. Silakan coba lagi sebentar lagi.",
  },
});

module.exports = { globalRateLimiter, llmSensitiveRateLimiter };
