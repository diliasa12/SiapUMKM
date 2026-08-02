# SiapUMKM

Platform AI yang menerjemahkan bahasa awam pelaku UMKM menjadi bahasa
administratif resmi yang dibutuhkan sistem negara (KBLI, OSS, skema
sertifikasi halal). Dibuat untuk AIC COMPFEST 2026 — "AI for the Backbone
of the Economy".

## Struktur Repositori

```
siapumkm/
├── gateway/        # API Gateway (Node.js/Express) — routing, validasi, rate limiting
├── frontend/        # React (Next.js) + Tailwind CSS — belum dibuat
├── ai-service/       # FastAPI (Python) — Modul F1 & F3 — belum dibuat
├── rule-engine/      # Node.js — Modul F4 (non-ML) — belum dibuat
├── kb-retrieval/     # FastAPI (Python) — Modul F5 — belum dibuat
└── db/               # Migrasi & seed database — belum dibuat
```

Lihat `gateway/README.md` untuk dokumentasi API Gateway.
