# Helios Roadmap

Helios is being built in evidence-first phases. The goal is to make browser QA runs observable and replayable before adding heavier persistence and AI layers.

## Phase 1: Dashboard Prototype

Goal: prove the dashboard shape and QA run lifecycle without real browser automation.

Completed:

- Dashboard shell
- Target URL form
- Fake run lifecycle: queued, running, completed
- Latest run panel
- Browser trail display
- Basic checks and summary
- Initial evidence/artifact UI placeholders

## Phase 2: Real Browser QA

Goal: replace the fake runner with a real Playwright-powered single-page QA run and improve the evidence experience.

Completed:

- Real Playwright single-page browser runs
- Desktop and mobile screenshots
- Console error capture
- Failed network request capture
- Broken image checks
- Page metadata capture
- Page load metrics
- User-friendly browser-run error handling
- Artifact viewer with screenshot switching and modal preview
- Evidence show all/show less
- Evidence copy item and copy all
- JSON export for run results
- localStorage-backed recent runs
- Runner helper modules for metadata, evidence, artifacts, navigation, and trail steps

Remaining polish:

- Smoke-test Phase 2 edge cases
- Review mobile layout with large evidence payloads
- Confirm artifact paths and screenshots behave consistently after refresh

## Phase 3: Persisted Run History

Goal: move from local prototype state to database-backed run history and stable run detail URLs.

Recommended stack:

- Prisma ORM
- PostgreSQL
- Neon Postgres for hosted development/deployment, or local Postgres for offline development

Initial model direction:

- Start with one `Run` table.
- Store nested data as JSON first: trail, checks, artifacts, evidence, and load metrics.
- Normalize later only when querying/searching nested data becomes important.

Implementation checklist:

- [ ] Install and configure Prisma
- [ ] Add PostgreSQL connection environment variable
- [ ] Create initial `Run` schema
- [ ] Persist completed runs from `POST /api/runs`
- [ ] Persist failed runs from `POST /api/runs`
- [ ] Add `GET /api/runs` for recent run history
- [ ] Add `GET /api/runs/[id]` for a single run detail payload
- [ ] Add `/runs/[id]` detail route
- [ ] Replace localStorage recent runs with database-backed history

Definition of done:

- Runs survive refresh without localStorage.
- Recent run history is loaded from the database.
- Each run has a stable detail URL.
- Completed and failed runs are both persisted.
- Existing Phase 2 evidence, screenshots, checks, and metadata still render correctly.

## Later: AI-Assisted QA Reports

Goal: use the evidence layer to generate summaries, triage suggestions, and next actions.

Possible features:

- AI-generated issue summaries
- Suggested fixes or investigation steps
- Severity classification
- Exportable QA reports
- Replayable evidence bundles for teams
