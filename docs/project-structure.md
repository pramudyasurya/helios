# Project Structure

This document explains the main folders used by Helios and what belongs in each area.

## App Routes

```txt
src/app/
  page.tsx
  runs/[id]/page.tsx
  runs/[id]/loading.tsx
  runs/[id]/error.tsx
  runs/[id]/not-found.tsx
  api/runs/route.ts
  api/runs/[id]/route.ts
  api/runs/[id]/report/route.ts
```

- `src/app/page.tsx` renders the main Helios dashboard.
- `src/app/runs/[id]/page.tsx` renders the run detail page for a stable run URL.
- `src/app/runs/[id]/loading.tsx`, `error.tsx`, and `not-found.tsx` provide route-level loading, failure, and missing-run states.
- `src/app/api/runs/route.ts` handles run creation (`POST`) and recent run history (`GET`).
- `src/app/api/runs/[id]/route.ts` returns a single run's full payload by ID.
- `src/app/api/runs/[id]/report/route.ts` triggers and retrieves AI-assisted QA reports.

## Helios Components

```txt
src/components/helios/
  evidence/
  history/
  layout/
  run/
  ui/
```

UI components for the dashboard live here. These components render forms, latest run details, metadata, screenshots, evidence, checks, browser trail, status badges, and recent runs.

Component groups:

- `layout/`: app shell and dashboard introduction.
- `run/`: run form, latest run panel, overview, screenshots, checks, timeline, status badge, and AI reports.
- `evidence/`: filterable evidence lists, detail inspection, grouped evidence sections, and copy actions.
- `history/`: recent run history preview.
- `ui/`: small reusable UI primitives shared by Helios components.

Important components:

- `layout/app-header.tsx`: dashboard header.
- `layout/dashboard-hero.tsx`: dashboard hero copy and badges.
- `run/run-form.tsx`: URL input and submit state.
- `run/latest-run-panel.tsx`: main result panel for the selected/latest run.
- `run/summary-header.tsx`: run detail header with status, export, timing, and navigation.
- `run/run-overview.tsx`: composes the summary, metrics, screenshots, and administrative details for a run.
- `run/run-detail-tabs.tsx`: client-side coordinator for detail tabs, check-to-evidence navigation, and evidence highlight targets.
- `run/ai-report-panel.tsx`: AI-generated QA report panel with risk badges and findings.
- `run/run-summary-card.tsx`: prominent run summary panel.
- `run/run-findings-summary.tsx`: compact findings summary for checks that need review, with optional evidence navigation.
- `run/run-metrics-grid.tsx`: compact duration, load, console, and network metrics.
- `run/run-admin-details.tsx`: secondary run identifiers and page metadata.
- `run/screenshot-gallery.tsx`: interactive screenshot gallery with a lightbox preview.
- `run/export-run-button.tsx`: client-side button for exporting a run as JSON.
- `run/run-checks-list.tsx`: QA check result list with optional evidence navigation actions.
- `run/browser-trail.tsx`: run timeline.
- `evidence/artifact-viewer.tsx`: desktop/mobile screenshot preview and modal view.
- `evidence/run-evidence-list.tsx`: evidence filters, grouped evidence rendering, selection state, and scroll/highlight targets from linked checks.
- `evidence/evidence-section.tsx`: reusable grouped evidence section.
- `evidence/evidence-item.tsx`: selectable evidence item with copy and detail affordances.
- `evidence/evidence-detail-modal.tsx`: modal for inspecting structured evidence content, timestamps, and page/resource URL context.
- `history/recent-runs-list.tsx`: responsive recent run history with clear and individual delete actions.
- `ui/tabs.tsx`: controlled or uncontrolled tabbed section layout used by run detail pages.
- `ui/empty-state.tsx`: shared empty-state block for sections without data.

## Helios Client Library

```txt
src/lib/helios/client/
```

Client-side state, API calls, and UI-facing transformations live here.

- `api.ts`: calls `/api/runs` and `/api/runs/[id]`.
- `recent-runs.ts`: pure helper for deduplicating and capping the recent runs list.
- `run-state.ts`: queued/running state helpers.
- `run-transformer.ts`: transforms API responses into dashboard run state.
- `use-run-dashboard.ts`: dashboard orchestration hook used by `page.tsx`.
- `export.ts`: JSON export helper.

## Helios Server Library

```txt
src/lib/helios/server/
```

Server-only Playwright runner code lives here. These modules should not be imported by client components.

- `runner.ts`: main single-page QA runner orchestration.
- `run-record.ts`: maps Prisma `Run` records to `LatestRun` shape for API responses.
- `metadata.ts`: captures title, final URL, meta description, and load metrics.
- `evidence.ts`: captures broken images and attaches console/network evidence listeners.
- `artifacts.ts`: creates screenshot artifact paths and captures screenshots.
- `navigation.ts`: page settle helper.
- `trail.ts`: run trail timestamp and trail step helpers.
- `ollama.ts`: Local LLM wrapper with deterministic mock fallback for AI reports.
- `errors.ts`: maps Playwright/browser errors into user-friendly messages.

## Helios Shared Library

```txt
src/lib/helios/shared/
```

Shared types and pure helpers live here. These files can be used by both client and server code.

- `types.ts`: core run, check, trail, metric, evidence, and response types.
- `constants.ts`: shared limits, timeouts, storage keys, and thresholds.
- `checks.ts`: creates QA checks from run results.
- `findings.ts`: derives reviewable findings from warning and failed checks.
- `performance.ts`: page load metric status and formatting helpers.
- `format.ts`: timestamp, label, and duration formatting.
- `routes.ts`: shared app route helpers for dashboard and run detail links.
- `validators.ts`: URL validation and AI report schema validation helpers.
- `errors.ts`: client-facing API error message helpers.
- `evidence-transformer.ts`: transforms persisted raw evidence strings into structured UI evidence records and extracts related resource URLs when available.
- `overview-cards.ts`: dashboard overview card data.

Unit tests for shared helpers live next to the files they cover using the `*.test.ts` naming pattern, for example `checks.test.ts`, `performance.test.ts`, and `validators.test.ts`.
## Database Configuration

```txt
prisma/
  schema.prisma
prisma.config.ts
```

Prisma ORM files for database connection and schema configuration.

- `prisma/schema.prisma`: Defines the PostgreSQL connection provider, client generator target (`src/generated/prisma`), and database models (including the `Run` model).
- `prisma.config.ts`: Configures the schema paths, migration paths, and loads database credentials dynamically via environment variables from `.env`.

Structured `RunEvidence` records are currently derived for the UI from evidence arrays stored on a `Run`. Each record carries its observed page URL and may include a parsed related resource URL. A normalized database `Evidence` model can be added later when evidence needs independent querying or relationships.

## Public Artifacts

```txt
public/artifacts/runs/
```

Playwright screenshots are written here during local runs.

This directory is generated runtime output and should not be committed.

## Docs

```txt
docs/
```

Project documentation lives here.

- `roadmap.md`: phase-by-phase product and engineering roadmap.
- `project-structure.md`: folder and module guide.
