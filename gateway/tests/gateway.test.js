const { test, describe } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

process.env.NODE_ENV = "test";
process.env.PORT = 0; // random free port

const app = require("../src/index");

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        method,
        path,
        port: server.address().port,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

describe("SiapUMKM Gateway", () => {
  test("GET /health returns ok", async () => {
    const server = app.listen(0);
    const res = await request(server, "GET", "/health");
    server.close();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ok");
  });

  test("POST /kbli/classify rejects deskripsi terlalu pendek", async () => {
    const server = app.listen(0);
    const res = await request(server, "POST", "/kbli/classify", {
      deskripsi_usaha: "kecil",
    });
    server.close();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, "VALIDATION_ERROR");
  });

  test("POST /address/parse rejects payload kosong", async () => {
    const server = app.listen(0);
    const res = await request(server, "POST", "/address/parse", {});
    server.close();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, "VALIDATION_ERROR");
  });

  test("POST /halal/check-eligibility menolak lebih dari 15 kriteria", async () => {
    const server = app.listen(0);
    const jawaban = Array.from({ length: 16 }, (_, i) => ({
      kriteria_id: `k${i}`,
      nilai: true,
    }));
    const res = await request(server, "POST", "/halal/check-eligibility", {
      jawaban,
    });
    server.close();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, "VALIDATION_ERROR");
  });

  test("GET /rute-tidak-ada returns 404", async () => {
    const server = app.listen(0);
    const res = await request(server, "GET", "/rute-tidak-ada");
    server.close();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, "NOT_FOUND");
  });
});
