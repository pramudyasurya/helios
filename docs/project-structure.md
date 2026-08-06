# Project Structure

This document explains the main folders used by Helios and what belongs in each area under the Pragmatic-Colocated Hybrid architecture model.

## App Routes

```txt
src/app/
  _components/            (Colocated dashboard-specific presentation leaf components)
    dashboard/           (Dashboard hero and metrics summary)
    runs/                 (Run history, search bar, and recent runs skeleton)
    charts/               (Recharts sparklines and donut charts)
  runs/[id]/
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx
    _components/          (Colocated runs-specific presentation leaf components)
      overview/          (Run overview, admin details, summary header, screenshots, artifacts)
      evidence/          (Evidence list, sections, items)
      findings/          (Findings summary, checks list, browser trail, page results)
      navigation/        (Detail tabs, sidebar, export button)
  projects/
    page.tsx
    _components/
      header/            (Projects header and stats bar)
      cards/             (Project cards, create forms)
    [projectId]/
      page.tsx
      _components/        (Project detail tabs: settings, runs, environments)
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

- `ui/`: Reusable primitives shared by all components (e.g. [tabs.tsx](file:///C:/College/pprince/main-project/src/components/ui/tabs.tsx), [empty-state.tsx](file:///C:/College/pprince/main-project/src/components/ui/empty-state.tsx), [status-badge.tsx](file:///C:/College/pprince/main-project/src/components/ui/status-badge.tsx)).
- `shared/`: App structural frames like [app-header.tsx](file:///C:/College/pprince/main-project/src/components/shared/app-header.tsx).
- `features/`: Stateful components, form handlers, mutators, and major server-rendered blocks that form clear security-auditable boundaries:
  - [run-form.tsx](file:///C:/College/pprince/main-project/src/components/features/run-form.tsx): Form inputs, SSRF client validation.
  - [latest-run-panel.tsx](file:///C:/College/pprince/main-project/src/components/features/latest-run-panel.tsx): Dashboard latest run coordinator.
  - [ai-report-panel.tsx](file:///C:/College/pprince/main-project/src/components/features/ai-report-panel.tsx): Ollama AI report wrapper.
  - [recent-runs-list.tsx](file:///C:/College/pprince/main-project/src/components/features/recent-runs-list.tsx): Handles history listings and deletion triggers.
  - [global-evidence-board.tsx](file:///C:/College/pprince/main-project/src/components/features/global-evidence-board.tsx): Aggregated evidence view.
  - [run-options-picker.tsx](file:///C:/College/pprince/main-project/src/components/features/run-options-picker.tsx): Run mode, routes, and crawl options picker.
  - [run-summary-card.tsx](file:///C:/College/pprince/main-project/src/components/features/run-summary-card.tsx): Agent summary display card.
  - [run-metrics-grid.tsx](file:///C:/College/pprince/main-project/src/components/features/run-metrics-grid.tsx): Run metrics display grid.
  - [evidence-detail-modal.tsx](file:///C:/College/pprince/main-project/src/components/features/evidence-detail-modal.tsx): Evidence detail modal dialog.

## Libraries & Utilities

```txt
src/lib/
  client/                 (React hooks and UI-facing state managers)
  server/                 (Server-only backend services, database connections, and automation)
    infrastructure/
      db/                 (Prisma Client database adapters)
      runner/             (Playwright automation execution engine)
      queue/              (Job queue setup — pg-boss queue configuration)
      ai/                 (AI provider abstraction — Ollama, OpenAI-compat, Anthropic, Gemini)
      utils/              (Shared server infrastructure utilities)
    workers/              (Background job processors — QA worker, run processor)
  shared/
    domain/               (Pure environment-agnostic business logic, validators, and types)
```

- `client/`: Client-side only hooks and API fetch wrappers. Uses `'use client'` where React hooks are bound (e.g. [use-run-dashboard.ts](file:///C:/College/pprince/main-project/src/lib/client/use-run-dashboard.ts)).
- `db/`: Database configuration (Prisma client instance).
- `runner/`: Playwright crawler, screenshot artifacts creator, and page settles.
- `queue/`: Job queue setup using pg-boss for background QA run processing.
- `ai/`: AI report generation via env-var-driven provider abstraction. Supports native Ollama (default), OpenAI-compatible (OpenAI/Groq/Together/vLLM/LM Studio), native Anthropic, and native Gemini. Config resolved from `AI_PROVIDER`/`AI_BASE_URL`/`AI_API_KEY`/`AI_MODEL`/`AI_TIMEOUT` env vars with `OLLAMA_*` backward-compat fallbacks. Files: `ai-config.ts` (env resolution), `ai-provider.ts` (interface + factory), `report-generator.ts` (orchestrator — `generateAIReport`, `generateMockReport`, `buildSystemPrompt`), `providers/` (4 provider implementations: `ollama-provider.ts`, `openai-compat-provider.ts`, `anthropic-provider.ts`, `gemini-provider.ts`).
- `utils/`: Shared server infrastructure utilities. `fetch-with-timeout.ts` — AbortController-based fetch wrapper with timeout, used by all AI providers.
- `workers/`: Background job processors — `qa-worker.ts` starts the worker process, `qa-run-processor.ts` handles individual QA run execution.
- `shared/domain/`: Pure, environment-agnostic business models, constants, formats, validators, and helpers (e.g., [types.ts](file:///C:/College/pprince/main-project/src/lib/shared/domain/types.ts), [validators.ts](file:///C:/College/pprince/main-project/src/lib/shared/domain/validators.ts)). Safe to import anywhere.

## Testing Strategy

- Unit tests (`*.test.ts`) are colocated directly next to the files they cover.
- **Vitest Projects (Workspaces)** in [vitest.config.ts](file:///C:/College/pprince/main-project/vitest.config.ts) split the execution environments:
  - **Unit & Runner tests** run in the fast native `node` environment.
  - **Component and page tests** run in `jsdom` (with global resize/responsive mock setups).
