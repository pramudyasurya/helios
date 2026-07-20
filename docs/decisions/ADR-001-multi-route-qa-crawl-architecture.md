# ADR-001: Multi-Route QA Crawl Architecture (Option A Pragmatic Hybrid)

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: User, AI Assistant (Pair Programming), Critic Panel (Sentinel, Profiler, Auditor)

## Context & Problem Statement

Helios is expanding from single-page browser QA evaluation to multi-route QA crawling (Phase 6). We need a strategy to crawl internal links up to a hard cap (max 5 pages, max depth 2), store per-page findings (screenshots, console logs, network errors), and display aggregated results while maintaining performance, security, and codebase simplicity.

## Decision Drivers

1. **Security (SSRF Protection)**: Playwright must not be used to probe internal/private IP addresses (`127.0.0.1`, AWS metadata `169.254.169.254`, private LANs).
2. **Performance (Serverless Timeouts)**: A 5-page crawl with desktop & mobile viewports takes ~15-20 seconds. Running synchronously in Next.js API routes risks HTTP 504 Gateway Timeouts.
3. **Memory Management**: Playwright page instances must be disposed of immediately (`page.close()`) after processing to avoid V8 heap memory accumulation.
4. **Codebase Simplicity (YAGNI)**: Avoid splitting a 5-page crawl into unnecessary class hierarchies or complex graph tree APIs when a single pure-function helper module suffices.

## Considered Options

- **Option A (Pragmatic Hybrid - Selected)**: Single helper module `crawler.ts` for BFS queue management and link extraction; relational `PageResult` model in Prisma; flat route list UI; async task execution (`202 Accepted` + polling); Playwright network egress filtering for SSRF; bulk database persistence with `createMany()`.
- **Option B (Modular & Extensible Tree Model)**: 4-class OOP structure (`CrawlEngine`, `CrawlQueue`, `DomainBoundaryGuard`, `LinkExtractor`); self-referential graph node tree in Prisma; dedicated `GET /api/runs/[id]/tree` API route; custom visual tree component (`crawl-tree-view.tsx`).

## Decision Outcome

**Chosen Option**: **Option A (Pragmatic Hybrid)**.

### Key Architectural Choices:

1. **Async Runner Execution (`202 Accepted`)**: `POST /api/runs` accepts the crawl configuration and immediately returns HTTP `202 Accepted` with `{ id, status: "queued" }`. The crawl runs out-of-band while the frontend polls `GET /api/runs/[id]`.
2. **Prisma Relational Schema**: Introduce `PageResult` model linked 1-to-N to `Run`. Bulk insert per-page findings and evidence using `prisma.pageResult.createMany()` upon completion.
3. **Playwright SSRF Egress Filter**: Intercept Playwright requests (`page.route('**/*', ...)`) to validate target IPs against RFC 1918 private CIDR blocks, loopback addresses, and cloud metadata endpoints.
4. **Resource Disposal**: Execute strict per-route page disposal (`await page.close()`) to keep memory footprint minimal.
5. **Flat Route List UI**: Display per-page results in a clean table/accordion layout inside the existing run detail view rather than introducing custom graph tree APIs.

## Positive Consequences

- Low codebase complexity: 1 helper file (`crawler.ts`) instead of 4 separate class files.
- Immune to serverless HTTP 504 Gateway Timeouts via async task dispatching.
- Secure against SSRF, open redirect boundary escapes, and uncontrolled recursive loops.
- Pure-function queue and URL normalizer logic are 100% testable in Vitest.

## Negative Consequences & Trade-offs

- The frontend must handle polling or status updates while a run is in `queued` or `running` state.
