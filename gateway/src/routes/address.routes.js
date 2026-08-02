const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  validate,
  addressParseSchema,
  addressExportQuerySchema,
} = require("../middleware/validation");
const aiServiceClient = require("../services/aiServiceClient");

const router = express.Router();

/**
 * POST /address/parse
 * Modul F3 — Siap Kirim.
 * Menerima alamat bahasa bebas, diteruskan ke AI Service untuk ekstraksi
 * entitas (NER: jalan, RT/RW, desa, kecamatan, kabupaten, provinsi) dan
 * validasi silang ke basis data wilayah resmi (Kepmendagri 300.2.2-2138/2025).
 */
router.post("/parse", validate(addressParseSchema), async (req, res) => {
  const session_id = req.body.session_id || uuidv4();

  const result = await aiServiceClient.parseAddress({
    alamat_bebas: req.body.alamat_bebas,
    session_id,
  });

  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }

  return res.status(200).json({
    session_id,
    ...result.data,
  });
});

/**
 * GET /address/export
 * Export data koordinat (latitude/longitude) & alamat terstruktur dalam
 * format CSV/Excel, berdasarkan session_id dari hasil /address/parse.
 */
router.get(
  "/export",
  validate(addressExportQuerySchema, "query"),
  async (req, res) => {
    const { session_id, format } = req.query;

    const result = await aiServiceClient.exportAddress({ session_id, format });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const filename = `alamat_${session_id}.${format}`;
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(result.data);
  }
);

module.exports = router;
