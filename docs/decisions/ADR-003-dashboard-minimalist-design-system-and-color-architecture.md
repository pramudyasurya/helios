# ADR-003: Dashboard Minimalist Design System and Color Architecture

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** Helios Core Team & Frontend Architecture

## Context

Visual reviews of the Helios main dashboard (`src/app/page.tsx`) identified several layout and visual defects:
1. Neon green text overload and amber tint proliferation across telemetry, metrics, and mode cards.
2. Multi-nested card borders and yellow background tints diluting the primary brand identity (`--accent: #f5b544`).
3. Height asymmetry between the left column (Starting URL + Latest Run = ~550px) and right column (Observability Metrics = ~240px), creating a massive ~310px empty black void on the right side next to Latest Run.

## Decision

We adopt a unified **Dashboard Minimalist Design System and Layout Architecture**:

1. **Quiet Zero/Healthy States**: Nominal states (e.g. 0 findings, 0 console errors, 0 failed requests, PostgreSQL connected, Playwright worker ready) must render in neutral monochrome (`text-muted` / `text-foreground`).
2. **Action-Only Amber Accent Policy**: The primary brand amber color (`#f5b544`) is reserved **exclusively for primary action buttons** ("Run QA Check") and active input focus rings. Amber tint backgrounds (`bg-accent/10`, `bg-accent/5`) are removed from mode picker cards and summary blocks.
3. **Selective Signal Colors**: Green, yellow, and red colors are strictly suppressed until an active anomaly or status change occurs (`> 0` errors/findings, degraded database, or active run execution).
4. **Flat Panel Surface Hierarchy**: Multi-nested card borders inside `RunForm` and `LatestRunPanel` are flattened into quiet monochrome sub-panels (`bg-card/40 border-border/70`).
5. **Full-Width Latest Run & Height-Balanced Grid**: On `src/app/page.tsx`, `RunForm` (7 columns) and `Observability Metrics` (5 columns) are paired side-by-side into a height-matched Top Launchpad Row, while `LatestRunPanel` is promoted to a full-width 12-column command center banner directly below, eliminating 100% of the empty black void.
6. **Subtle Status Badges & Desaturated Charts**: Completed run status badges use low-saturation border outlines (`border-emerald-500/30 text-emerald-400 bg-emerald-500/5`), and charts use quiet desaturated strokes (`stroke-foreground/60` / muted tones).

## Consequences

### Positive
- Strips multi-nested card clutter and green/yellow color overload from top to bottom.
- Completely eliminates the ~310px empty black void on the right side of the dashboard.
- Restores the primary "Run QA Check" button as the clear, unmistakable call-to-action anchor.
- Establishes a clear visual hierarchy where alerts (`> 0` errors) immediately draw developer attention.
- Maintains high contrast compliance (WCAG 2.1 AA) while providing a sleek, minimalist dark aesthetic.

### Negative / Trade-offs
- Selected execution mode cards rely on high-contrast monochrome borders and quiet indicator dots rather than full yellow background tinting.
