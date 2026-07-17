# Project Structure

This document explains the main folders used by Helios and what belongs in each area under the Pragmatic-Colocated Hybrid architecture model.

## App Routes

```txt
src/app/
  page.tsx
  _components/            (Colocated dashboard-specific presentation leaf components)
    charts/               (Recharts sparklines and donut charts)
  runs/[id]/
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx
    _components/          (Colocated runs-specific presentation leaf components)
  evidence/
    page.tsx
  api/                    (Backend API Route Handlers)
```

- `src/app/page.tsx` renders the main Helios dashboard.
- `src/app/_components/` colocates elements used only by the homepage dashboard, such as search bars, heroes, and Recharts charts.
- `src/app/runs/[id]/page.tsx` renders the run detail page.
- `src/app/runs/[id]/_components/` colocates leaf components used only by the run detail page, such as screenshot galleries, browser trails, and evidence detail modal popups.
- `src/app/api/` handles all API requests (runs history, stats aggregation, evidence updates, Ollama AI report triggers).

## Reusable & Centralized Components

```txt
src/components/
  ui/                     (Stateless reusable design system controls)
  shared/                 (Global structural layouts e.g. headers/footers)
  features/               (Centralized stateful feature components, RSCs, and form-handlers)
```

- `ui/`: Reusable primitives shared by all components (e.g. [tabs.tsx](file:///C:/College/pprince/main-project/src/components/ui/tabs.tsx), [empty-state.tsx](file:///C:/College/pprince/main-project/src/components/ui/empty-state.tsx)).
- `shared/`: App structural frames like [app-header.tsx](file:///C:/College/pprince/main-project/src/components/shared/app-header.tsx).
- `features/`: Stateful components, form handlers, mutators, and major server-rendered blocks that form clear security-auditable boundaries:
  - [run-form.tsx](file:///C:/College/pprince/main-project/src/components/features/run-form.tsx): Form inputs, SSRF client validation.
  - [latest-run-panel.tsx](file:///C:/College/pprince/main-project/src/components/features/latest-run-panel.tsx): Dashboard latest run coordinator.
  - [ai-report-panel.tsx](file:///C:/College/pprince/main-project/src/components/features/ai-report-panel.tsx): Ollama AI report wrapper.
  - [run-overview.tsx](file:///C:/College/pprince/main-project/src/components/features/run-overview.tsx): Compiles details of a run.
  - [recent-runs-list.tsx](file:///C:/College/pprince/main-project/src/components/features/recent-runs-list.tsx): Handles history listings and deletion triggers.
  - [dashboard-metrics.tsx](file:///C:/College/pprince/main-project/src/components/features/dashboard-metrics.tsx): Displays metrics from the stats API.
  - [global-evidence-board.tsx](file:///C:/College/pprince/main-project/src/components/features/global-evidence-board.tsx): Aggregated evidence view.

## Libraries & Utilities

```txt
src/lib/
  client/                 (React hooks and UI-facing state managers)
  server/                 (Server-only backend services, database connections, and automation)
    infrastructure/
      db/                 (Prisma Client database adapters)
      runner/             (Playwright automation execution engine)
      ai/                 (Ollama AI API connection wrapper)
  shared/
    domain/               (Pure environment-agnostic business logic, validators, and types)
```

- `client/`: Client-side only hooks and API fetch wrappers. Uses `'use client'` where React hooks are bound (e.g. [use-run-dashboard.ts](file:///C:/College/pprince/main-project/src/lib/client/use-run-dashboard.ts)).
- `server/`: Server-only backend infrastructures. Implements `import "server-only";` compile-time checks in all modules to prevent leakage to the browser:
  - `db/`: Database configuration (Prisma client instance).
  - `runner/`: Playwright crawler, screenshot artifacts creator, and page settles.
  - `ai/`: Ollama report generator and prompt formatting.
- `shared/domain/`: Pure, environment-agnostic business models, constants, formats, validators, and helpers (e.g., [types.ts](file:///C:/College/pprince/main-project/src/lib/shared/domain/types.ts), [validators.ts](file:///C:/College/pprince/main-project/src/lib/shared/domain/validators.ts)). Safe to import anywhere.

## Testing Strategy

- Unit tests (`*.test.ts`) are colocated directly next to the files they cover.
- **Vitest Projects (Workspaces)** in [vitest.config.ts](file:///C:/College/pprince/main-project/vitest.config.ts) split the execution environments:
  - **Unit & Runner tests** run in the fast native `node` environment.
  - **Component and page tests** run in `jsdom` (with global resize/responsive mock setups).
