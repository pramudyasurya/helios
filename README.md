# Project Codename: Helios

![Helios Web QA Dashboard](./public/brand/helios-banner.png)

Helios is a QA observability dashboard for browser-based website checks. Its goal is not only to find issues, but to make every QA run inspectable through browser trails, screenshots, logs, artifacts, and evidence.

> Evidence-based website QA powered by replayable browser runs.

## Core Loop

1. The user submits a starting URL.
2. Helios persists a queued QA run and publishes a background job.
3. The QA worker opens the target page in a browser.
4. The system collects screenshots, console logs, network failures, and trail steps.
5. The dashboard polls the run status and displays the summary, findings, artifacts, and inspectable evidence.

Helios is not AI-first at this stage. The first core is a stable dashboard and automation pipeline. Once the evidence layer is strong, AI can be added to generate reports and suggested next actions.

## MVP

- Target URL input
- QA run lifecycle: queued, running, completed, failed
- Browser trail/timeline
- Basic QA summary
- Desktop and mobile screenshots
- Capture console errors
- Capture failed network requests
- Capture broken images and page load metrics
- Display QA reports in the dashboard
- Preview artifacts and export run results as JSON
- Database-backed run history with stable run detail URLs
- Evidence interactions: show all, copy item, and copy all
- Filterable evidence with structured detail inspection and page/resource URL context
- QA checks that link directly to their supporting evidence category with scroll and highlight feedback
- Findings summary for checks that need review
- Screenshot lightbox with keyboard close support
- Run detail loading, error, and not-found states
- QA Observability Dashboard with aggregate metrics (total runs, pass rate, avg duration)
- Global Search, status filtering, and offset pagination on historical runs

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Playwright
- Prisma
- PostgreSQL
- pg-boss for durable background QA jobs
- Vitest

## Project Structure

```txt
src/
├── app/                  Next.js pages, api routes, and colocated leaf components
├── components/
│   ├── ui/               Stateless reusable UI primitives (tabs, empty states)
│   ├── shared/           Global structural templates (app headers)
│   └── features/         Centralized stateful features (run forms, stats charts)
└── lib/
    ├── client/           React state hooks and API callers
    ├── server/           Server-only infrastructure modules (Playwright runner, AI)
    └── shared/domain/    Pure business models, checks engine, and validators
```

More detail:

- [Project structure](./docs/project-structure.md)
- [Roadmap](./docs/roadmap.md)

## Development

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment:
   ```bash
   cp .env.example .env
   ```
3. Initialize the database and run migrations:
   ```bash
   npx prisma db push
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. In a separate terminal, start the QA worker:
   ```bash
   npm run worker:qa
   ```

### Background QA Worker

Helios uses [pg-boss](https://github.com/timgit/pg-boss), backed by the same
PostgreSQL database as the application, to run browser QA outside the API
request lifecycle. This lets `POST /api/runs` return quickly while the worker
processes queued Playwright jobs.

The worker requires a reachable `DATABASE_URL` and must run alongside the
Next.js development server. On first startup, pg-boss creates its own queue
tables in PostgreSQL.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at `http://localhost:3000` |
| `npm test` | Run Vitest unit tests |
| `npm run build` | Build Next.js production bundle |
| `npm run lint` | Run ESLint linter |
| `npm run worker:qa` | Start the pg-boss QA worker |
| `npx prisma studio` | Open Prisma Studio GUI |