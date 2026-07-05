# Spec: Global Search & Analytics Dashboard

## Objective
Mengubah halaman utama Helios (`/`) menjadi **QA Observability Dashboard** yang interaktif. Menampilkan metrik agregat performa QA (Total Runs, Pass Rate, Avg Duration) dan memberikan kemampuan pencarian global, filter status, serta paginasi pada daftar run. 

## Tech Stack
- Next.js (App Router, API Routes)
- Prisma ORM (Aggregation, Grouping, Pagination)
- Tailwind CSS

## Commands
- Dev Server: `npm run dev`
- Typecheck: `npx tsc --noEmit`
- Test: `npm run test`

## Project Structure
- `src/app/api/runs/stats/route.ts` -> Endpoint agregasi metrik.
- `src/app/api/runs/route.ts` -> Modifikasi untuk mendukung search, filter, pagination.
- `src/components/helios/history/dashboard-metrics.tsx` -> Card presentasi metrik agregat.
- `src/components/helios/history/run-search-bar.tsx` -> Filter input dengan debounce.
- `src/components/helios/history/recent-runs-list.tsx` -> Upgrade menjadi tabel paginasi.
- `src/app/page.tsx` -> Assembly dashboard baru.

## Code Style
```tsx
// URL State synchronization pattern
export function useRunDashboard() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialPage = Number(searchParams.get("page")) || 1;
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("page", page.toString());
    window.history.replaceState({}, "", newUrl.toString());
  }, [page]);
}
```

## Testing Strategy
- Unit test untuk endpoint dan query parser.
- Manual test visual di layar mobile, tablet, dan desktop (Responsive).
- Uji coba debounce filter agar UI tidak freeze.

## Boundaries
- **Always**: Gunakan komponen UI yang aksesibel (focus trap, ARIA labels).
- **Ask first**: Penambahan field baru di database (sejauh ini tidak perlu).
- **Never**: Menaruh state filter sepenuhnya di local memory; harus tersinkronisasi ke URL agar bisa di-share.

## Success Criteria
- [ ] Endpoint statistik aktif dan mengembalikan data akurat (Avg duration dari `durationMs`).
- [ ] Endpoint list mendukung filter status, text search, dan pagination offset.
- [ ] Metrik visual merender angka dengan empty/loading states yang baik.
- [ ] Typing di Search input ter-debounce 300ms.
- [ ] Klik Next/Prev Page mengubah state tabel & memperbarui URL.
- [ ] Komponen tidak crash saat list kosong.

## Open Questions
Semua pertanyaan awal telah terjawab:
- Agregasi load time memakai `durationMs`.
- Paginasi menggunakan _offset-based_.
- Pencarian menggunakan Prisma `contains` (case-insensitive).
