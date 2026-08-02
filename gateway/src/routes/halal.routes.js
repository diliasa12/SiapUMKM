const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { validate, halalEligibilitySchema } = require("../middleware/validation");
const aiServiceClient = require("../services/aiServiceClient");

const router = express.Router();

/**
 * POST /halal/check-eligibility
 * Modul F4 — Siap Halal.
 * Diteruskan ke Rule Engine (Node.js, non-ML, decision tree berbasis 15
 * kriteria SEHATI yang telah diverifikasi ke sumber resmi BPJPH). Gateway
 * TIDAK melakukan logic eligibility sendiri — murni passthrough+validasi,
 * supaya satu-satunya sumber kebenaran kriteria tetap di rule-engine/.
 */
router.post(
  "/check-eligibility",
  validate(halalEligibilitySchema),
  async (req, res) => {
    const session_id = req.body.session_id || uuidv4();

    const result = await aiServiceClient.checkHalalEligibility({
      jawaban: req.body.jawaban,
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
