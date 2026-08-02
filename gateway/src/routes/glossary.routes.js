const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { validate, glossaryAskSchema } = require("../middleware/validation");
const { llmSensitiveRateLimiter } = require("../middleware/rateLimiter");
const aiServiceClient = require("../services/aiServiceClient");

const router = express.Router();

/**
 * POST /glossary/ask
 * Modul F5 — Kamus Istilah OSS (Guarded Glossary Assistant).
 * Diteruskan ke KB Retrieval Service, yang melakukan similarity search via
 * pgvector lalu merangkai jawaban dari knowledge base terverifikasi manusia.
 *
 * Guardrail non-negotiable (lihat PRD §4 F5) ditegakkan di KB Retrieval
 * Service, BUKAN di gateway ini:
 *   - Tidak pernah menjawab pasti "ya/tidak" untuk pertanyaan compliance
 *   - Hard-stop + arahkan ke sumber resmi jika di luar cakupan knowledge base
 * Gateway hanya meneruskan response apa adanya agar guardrail tidak bisa
 * ter-bypass atau berubah makna di layer ini.
 */
router.post(
  "/ask",
  llmSensitiveRateLimiter,
  validate(glossaryAskSchema),
  async (req, res) => {
    const session_id = req.body.session_id || uuidv4();

    const result = await aiServiceClient.askGlossary({
      pertanyaan: req.body.pertanyaan,
      session_id,
    });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    return res.status(200).json({
      session_id,
      ...result.data,
    });
  }
);

module.exports = router;
