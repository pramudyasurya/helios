# ADR-002: PostgreSQL-Backed QA Job Queue

- **Status**: Accepted
- **Date**: 2026-07-21
- **Deciders**: User, AI Assistant (Pair Programming)

## Context

Helios currently executes Playwright QA work inside the `POST /api/runs`
request. A multi-page crawl can exceed the request timeout and prevent the
client from receiving a timely response.

Starting an unawaited promise in the API route would return `202 Accepted`, but
it is not durable. A container restart, deployment, or request-runtime shutdown
could abandon work after the client has been told that a run was queued.

Helios is expected to be deployed on a Docker server and already uses
PostgreSQL for application data.

## Decision

Use `pg-boss` as the durable job queue, backed by the existing PostgreSQL
database.

Deploy the application as separate Docker services:

- An API service that creates `Run` records and publishes jobs.
- A worker service that consumes QA jobs and executes Playwright.
- A PostgreSQL service that stores application data and `pg-boss` job state.

The API creates a `Run` with status `Queued`, publishes a job containing the
run ID and validated crawl configuration, and returns `202 Accepted`.

The worker transitions the same run through this lifecycle:

```text
Queued → Running → Completed
                 ↘ Failed
```

Initial worker concurrency is one QA job at a time. This limits Chromium's CPU
and memory use on the initial Docker server.

Transient job failures may be retried a small, fixed number of times. Retries
must reuse the original run ID and must leave the run in a terminal `Failed`
state once all attempts are exhausted.

## Consequences

### Positive

- Jobs survive API-container restarts and deployments.
- The API returns promptly without holding an HTTP request open for Playwright.
- PostgreSQL is the only queue infrastructure required; Redis and managed job
  service credentials are unnecessary.
- Worker concurrency can be controlled independently from API traffic.
- Queue state, retries, and failures are durable and observable.

### Negative

- The deployment requires an additional worker container.
- The worker image must contain Playwright browser dependencies.
- Application code must make job processing idempotent because retries can
  occur.
- The database requires `pg-boss` queue tables in addition to Prisma-managed
  application tables.

## Follow-up Work

1. Add `pg-boss` and implement a queue adapter.
2. Add a worker entrypoint and Docker service.
3. Change `POST /api/runs` to enqueue durable QA jobs and return `202`.
4. Update run polling to expose queued, running, completed, and failed states.
5. Add operational logging and retry/failure tests.
