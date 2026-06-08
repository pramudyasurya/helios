# Helios

Helios adalah dashboard QA web berbasis agent yang membantu developer mengecek kualitas halaman web dari satu URL.

Ide awalnya sederhana:

1. User memasukkan URL website.
2. Sistem menjalankan browser automation.
3. Argos mengambil screenshot desktop dan mobile.
4. Helios mencatat console error, failed request, dan masalah dasar lain.
5. Hasilnya ditampilkan sebagai report yang mudah dibaca.

Untuk tahap awal, project ini belum fokus ke AI dulu. Core pertamanya adalah automation pipeline yang stabil. Setelah itu baru ditambah AI untuk merangkum temuan dan memberi saran perbaikan.

## MVP

- Input target URL
- Run scan manual
- Screenshot desktop dan mobile
- Capture console error
- Capture failed network request
- Tampilkan report scan di dashboard

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Playwright

## Development

Install dependencies:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka app di browser:

```txt
http://localhost:3000
```

## Status

Masih tahap awal. Fokus sekarang adalah membangun fondasi dashboard dan QA runner sederhana sebelum masuk ke fitur agent atau AI report.
