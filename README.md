# Project Codename: Helios

![Helios Web QA Dashboard](./public/brand/helios-banner.png)

Helios is a QA observability dashboard for browser-based website checks. Its goal is not only to find issues, but to make every QA run inspectable through browser trails, screenshots, logs, artifacts, and evidence.

> Evidence-based website QA powered by replayable browser runs.

## Core Loop

1. The user submits a starting URL.
2. Helios creates a QA run.
3. The browser runner opens the target page.
4. The system collects screenshots, console logs, network failures, and trail steps.
5. The dashboard displays the summary, findings, artifacts, and inspectable evidence.

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
- QA checks that link directly to their supporting evidence category
- Screenshot lightbox with keyboard close support
- Run detail loading, error, and not-found states

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Playwright
- Prisma
- PostgreSQL

## Project Structure

```txt
src/lib/helios/
  client/   Browser/client-side run state, API calls, export, and transforms
  server/   Playwright runner used by the API route
  shared/   Types, checks, validators, formatting, constants, and shared helpers

src/components/helios/
  Dashboard UI components for forms, run metadata, artifacts, evidence,
  checks, browser trail, status badges, tabs, empty states, and recent runs.
```

More detail:

- [Project structure](./docs/project-structure.md)
- [Roadmap](./docs/roadmap.md)

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the app in your browser:

```txt
http://localhost:3000
```

## Status

Phase 3 is complete, and Phase 4 evidence-board work is in progress. Helios uses a real Playwright runner with database-backed run persistence.

Completed:

- Real Playwright single-page browser runs
- Desktop and mobile screenshot artifacts
- Console error and failed request evidence
- Broken image checks
- Page metadata and load metrics
- User-friendly browser-run error handling
- Evidence copy, copy all, and show all interactions
- Runner helper modules for metadata, evidence, artifacts, navigation, and trail steps
- Prisma ORM with PostgreSQL for run persistence
- Completed and failed runs persisted to database
- `GET /api/runs` for recent run history from database
- `GET /api/runs/[id]` for stable run detail payload
- `DELETE /api/runs` and `DELETE /api/runs/[id]` for run history cleanup
- `/runs/[id]` detail page with stable URL per run
- Detail page tabs for overview, evidence, checks, and browser trail
- Recent runs list sourced from database, localStorage removed
- Responsive, scannable recent run history with clear/delete action feedback
- Screenshot lightbox and route-level loading, error, and not-found states
- Evidence filters, structured evidence view models, and detail inspection with page/resource URL context
- QA checks can navigate directly to their relevant evidence filter

Next:

- Evidence-to-finding links, evidence statuses, and stronger evidence-board relationships
- AI-assisted QA reports: summaries, triage suggestions, severity classification, and exportable reports
