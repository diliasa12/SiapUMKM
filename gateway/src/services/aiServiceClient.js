const axios = require("axios");

const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 15_000);

/**
 * Client generik dengan timeout & error normalization, dipakai untuk
 * memanggil ketiga service internal: AI Service (FastAPI), Rule Engine
 * (Node.js, non-ML), dan KB Retrieval Service (FastAPI + pgvector).
 */
function createClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: UPSTREAM_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });
}

const aiServiceClient = createClient(
  process.env.AI_SERVICE_URL || "http://localhost:8001"
);
const ruleEngineClient = createClient(
  process.env.RULE_ENGINE_URL || "http://localhost:8002"
);
const kbRetrievalClient = createClient(
  process.env.KB_RETRIEVAL_URL || "http://localhost:8003"
);

/**
 * Membungkus error axios menjadi bentuk konsisten agar route handler
 * tidak perlu tahu detail transport (timeout vs 5xx vs connection refused).
 */
function normalizeUpstreamError(err, serviceName) {
  if (err.code === "ECONNABORTED") {
    return {
      status: 504,
      body: {
        error: "UPSTREAM_TIMEOUT",
        message: `${serviceName} tidak merespons dalam batas waktu.`,
      },
    };
  }
  if (err.response) {
    return {
      status: err.response.status,
      body: err.response.data || {
        error: "UPSTREAM_ERROR",
        message: `${serviceName} mengembalikan error.`,
      },
    };
  }
  return {
    status: 503,
    body: {
      error: "UPSTREAM_UNAVAILABLE",
      message: `${serviceName} sedang tidak dapat dihubungi.`,
    },
  };
}

// ---------------------------------------------------------------------------
// F1 — Siap Usaha: KBLI Classifier (AI Service)
// ---------------------------------------------------------------------------
async function classifyKbli({ deskripsi_usaha, session_id }) {
  try {
    const { data } = await aiServiceClient.post("/classify/kbli", {
      deskripsi_usaha,
      session_id,
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, ...normalizeUpstreamError(err, "AI Service") };
  }
}

async function confirmKbli(payload) {
  try {
    const { data } = await aiServiceClient.post("/classify/kbli/confirm", payload);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, ...normalizeUpstreamError(err, "AI Service") };
  }
}

// ---------------------------------------------------------------------------
// F3 — Siap Kirim: Address Standardization (AI Service)
// ---------------------------------------------------------------------------
async function parseAddress({ alamat_bebas, session_id }) {
  try {
    const { data } = await aiServiceClient.post("/parse/address", {
      alamat_bebas,
      session_id,
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, ...normalizeUpstreamError(err, "AI Service") };
  }
}

async function exportAddress({ session_id, format }) {
  try {
    const { data } = await aiServiceClient.get("/parse/address/export", {
      params: { session_id, format },
      responseType: format === "xlsx" ? "arraybuffer" : "text",
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, ...normalizeUpstreamError(err, "AI Service") };
  }
}

// ---------------------------------------------------------------------------
// F4 — Siap Halal: Eligibility Checker (Rule Engine, non-ML)
// ---------------------------------------------------------------------------
async function checkHalalEligibility(payload) {
  try {
    const { data } = await ruleEngineClient.post("/halal/check-eligibility", payload);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, ...normalizeUpstreamError(err, "Rule Engine") };
  }
}

// ---------------------------------------------------------------------------
// F5 — Kamus Istilah OSS (KB Retrieval Service)
// ---------------------------------------------------------------------------
async function askGlossary(payload) {
  try {
    const { data } = await kbRetrievalClient.post("/glossary/ask", payload);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, ...normalizeUpstreamError(err, "KB Retrieval Service") };
  }
}

module.exports = {
  classifyKbli,
  confirmKbli,
  parseAddress,
  exportAddress,
  checkHalalEligibility,
  askGlossary,
};
