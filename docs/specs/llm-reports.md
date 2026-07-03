# Spec: Local LLM QA Report

## Objective
Menghadirkan tab analisis otomatis berbasis AI ("AI Report") pada halaman detail run (`/runs/[id]`). AI akan mengevaluasi metadata run, log kesalahan konsol, network error, dan evidence, kemudian menyusun laporan terstruktur (JSON) yang disimpan secara permanen di database. 

Sistem menggunakan model LLM lokal via Ollama, dengan fallback otomatis ke *rule-based mock generator* jika layanan Ollama tidak aktif di komputer user.

## Tech Stack
- Next.js (App Router, API Routes)
- Prisma ORM & PostgreSQL
- Tailwind CSS
- Ollama API (Lokal)

## Commands
- Prisma Migration: `npx prisma migrate dev --name add_report_to_run`
- Dev Server: `npm run dev`
- Typecheck: `npx tsc --noEmit`
- Test: `npm run test`

## Project Structure
- `prisma/schema.prisma` -> Update model `Run` dengan `report Json?`.
- `src/lib/helios/server/ollama.ts` -> LLM Wrapper (koneksi Ollama + mock fallback + prompt engineering).
- `src/app/api/runs/[id]/report/route.ts` -> API endpoint untuk men-trigger / mengambil report AI.
- `src/components/helios/run/ai-report-panel.tsx` -> Client UI Component untuk tab "AI Report".
- `src/app/runs/[id]/page.tsx` -> Integrasi tab baru "AI Report" ke navigasi detail run.

## Boundaries
- **Always**: Validasi output JSON dari LLM menggunakan schema parser (Zod) sebelum disimpan ke DB.
- **Ask first**: Model Ollama default yang disarankan (`llama3.2` / `mistral`).
- **Never**: Membiarkan halaman crash jika koneksi ke Ollama gagal. Fallback harus menghasilkan mock report yang relevan dengan logs run yang ada.

## Success Criteria
- [ ] Tab "AI Report" muncul di navigasi halaman `/runs/[id]`.
- [ ] Mengklik tab tersebut untuk pertama kali (atau saat run selesai) akan memicu tombol "Generate AI Report".
- [ ] Proses generation menampilkan state loading skeleton yang rapi.
- [ ] Hasil laporan terstruktur tersimpan di kolom `report` database pada tabel `Run`.
- [ ] Membuka kembali detail run tersebut langsung menampilkan report yang tersimpan secara instan (tanpa re-generate).
- [ ] Tampilan report rapi dengan penunjuk level risiko (Low = hijau, Medium = kuning, High = merah), daftar temuan terperinci, dan tombol "Suggested Actions".
