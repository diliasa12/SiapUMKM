const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  validate,
  kbliClassifySchema,
  kbliConfirmSchema,
} = require("../middleware/validation");
const { llmSensitiveRateLimiter } = require("../middleware/rateLimiter");
const aiServiceClient = require("../services/aiServiceClient");

const router = express.Router();

/**
 * POST /kbli/classify
 * Modul F1 — Siap Usaha.
 * Menerima deskripsi bisnis bahasa bebas, meneruskan ke AI Service untuk
 * klasifikasi top-3 kandidat KBLI 2025. AI Service yang menangani gating
 * primary classifier (IndoBERT) vs fallback (RAG + LLM), gateway hanya
 * meneruskan dan menstandarkan response.
 */
router.post(
  "/classify",
  llmSensitiveRateLimiter, // fallback bisa memicu panggilan LLM API
  validate(kbliClassifySchema),
  async (req, res) => {
    const session_id = req.body.session_id || uuidv4();

    const result = await aiServiceClient.classifyKbli({
      deskripsi_usaha: req.body.deskripsi_usaha,
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

/**
 * POST /kbli/confirm
 * Konfirmasi user atas satu kode KBLI dari top-3 kandidat yang ditampilkan.
 * Dipakai untuk menyimpan histori (classification_history) dan menentukan
 * checklist dokumen pra-OSS pada langkah berikutnya.
 */
router.post("/confirm", validate(kbliConfirmSchema), async (req, res) => {
  const result = await aiServiceClient.confirmKbli(req.body);

  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }

  return res.status(200).json(result.data);
});

module.exports = router;
