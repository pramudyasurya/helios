# Project Structure

This document explains the main folders used by Helios and what belongs in each area.

## App Routes

```txt
src/app/
  page.tsx
  runs/[id]/page.tsx
  api/runs/route.ts
  api/runs/[id]/route.ts
```

- `src/app/page.tsx` renders the main Helios dashboard.
- `src/app/runs/[id]/page.tsx` renders the run detail page for a stable run URL.
- `src/app/api/runs/route.ts` handles run creation (`POST`) and recent run history (`GET`).
- `src/app/api/runs/[id]/route.ts` returns a single run's full payload by ID.

## Helios Components

```txt
src/components/helios/
  evidence/
  history/
  layout/
  run/
```

UI components for the dashboard live here. These components render forms, latest run details, metadata, screenshots, evidence, checks, browser trail, status badges, and recent runs.

Component groups:

- `layout/`: app shell and dashboard introduction.
- `run/`: run form, latest run panel, metadata, checks, timeline, overview cards, and status badge.
- `evidence/`: artifact viewer, evidence list, grouped evidence sections, and copyable evidence items.
- `history/`: recent run history preview.

Important components:

- `layout/app-header.tsx`: dashboard header.
- `layout/dashboard-hero.tsx`: dashboard hero copy and badges.
- `run/run-form.tsx`: URL input and submit state.
- `run/latest-run-panel.tsx`: main result panel for the selected/latest run.
- `run/run-metadata.tsx`: run metadata, timing, and page metadata.
- `run/export-run-button.tsx`: client-side button for exporting a run as JSON.
- `run/run-checks-list.tsx`: QA check result list.
- `run/browser-trail.tsx`: run timeline.
- `evidence/artifact-viewer.tsx`: desktop/mobile screenshot preview and modal view.
- `evidence/run-evidence-list.tsx`: evidence groups and evidence-level actions.
- `evidence/evidence-section.tsx`: reusable grouped evidence section.
- `evidence/evidence-item.tsx`: reusable evidence item with copy action.
- `history/recent-runs-list.tsx`: recent run history preview.

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
- `errors.ts`: maps Playwright/browser errors into user-friendly messages.

## Helios Shared Library

```txt
src/lib/helios/shared/
```

Shared types and pure helpers live here. These files can be used by both client and server code.

- `types.ts`: core run, check, trail, metric, and response types.
- `constants.ts`: shared limits, timeouts, storage keys, and thresholds.
- `checks.ts`: creates QA checks from run results.
- `performance.ts`: page load metric status and formatting helpers.
- `format.ts`: timestamp, label, and duration formatting.
- `validators.ts`: URL validation helpers.
- `errors.ts`: client-facing API error message helpers.
- `overview-cards.ts`: dashboard overview card data.
## Database Configuration

```txt
prisma/
  schema.prisma
prisma.config.ts
```

Prisma ORM files for database connection and schema configuration.

- `prisma/schema.prisma`: Defines the PostgreSQL connection provider, client generator target (`src/generated/prisma`), and database models (including the `Run` model).
- `prisma.config.ts`: Configures the schema paths, migration paths, and loads database credentials dynamically via environment variables from `.env`.

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
