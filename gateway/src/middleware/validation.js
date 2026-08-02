const { z } = require("zod");

/**
 * Factory middleware untuk validasi request body/query/params menggunakan
 * schema zod. Jika validasi gagal, gateway langsung menolak request dengan
 * 400 sebelum menyentuh AI Service / Rule Engine / KB Retrieval — supaya
 * beban tidak diteruskan ke layer belakang untuk payload yang jelas rusak.
 *
 * @param {z.ZodSchema} schema
 * @param {"body"|"query"|"params"} source
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Request tidak valid, periksa kembali field yang dikirim.",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // Ganti dengan data yang sudah di-parse/coerce oleh zod
    req[source] = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// Schemas — Modul F1: Siap Usaha (KBLI)
// ---------------------------------------------------------------------------
const kbliClassifySchema = z.object({
  deskripsi_usaha: z
    .string()
    .trim()
    .min(10, "Deskripsi usaha minimal 10 karakter agar dapat diklasifikasi")
    .max(2000, "Deskripsi usaha maksimal 2000 karakter"),
  session_id: z.string().uuid().optional(),
});

const kbliConfirmSchema = z.object({
  session_id: z.string().uuid(),
  kode_kbli_terpilih: z
    .string()
    .regex(/^\d{2,5}$/, "Kode KBLI harus berupa 2-5 digit angka"),
  sumber: z.enum(["primary_classifier", "rag_fallback"]),
});

// ---------------------------------------------------------------------------
// Schemas — Modul F3: Siap Kirim (Address)
// ---------------------------------------------------------------------------
const addressParseSchema = z.object({
  alamat_bebas: z
    .string()
    .trim()
    .min(5, "Alamat minimal 5 karakter")
    .max(500, "Alamat maksimal 500 karakter"),
  session_id: z.string().uuid().optional(),
});

const addressExportQuerySchema = z.object({
  session_id: z.string().uuid(),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

// ---------------------------------------------------------------------------
// Schemas — Modul F4: Siap Halal
// ---------------------------------------------------------------------------
const halalEligibilitySchema = z.object({
  jawaban: z
    .array(
      z.object({
        kriteria_id: z.string().min(1),
        nilai: z.boolean(),
      })
    )
    .min(1, "Minimal satu jawaban kriteria diperlukan")
    .max(15, "Maksimal 15 kriteria SEHATI"),
  session_id: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Schemas — Modul F5: Kamus Istilah OSS (Glossary)
// ---------------------------------------------------------------------------
const glossaryAskSchema = z.object({
  pertanyaan: z
    .string()
    .trim()
    .min(3, "Pertanyaan terlalu pendek")
    .max(500, "Pertanyaan maksimal 500 karakter"),
  session_id: z.string().uuid().optional(),
});

module.exports = {
  validate,
  kbliClassifySchema,
  kbliConfirmSchema,
  addressParseSchema,
  addressExportQuerySchema,
  halalEligibilitySchema,
  glossaryAskSchema,
};
