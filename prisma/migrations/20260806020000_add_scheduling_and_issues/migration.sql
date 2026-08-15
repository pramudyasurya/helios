-- Additive migration: QaSchedule, Issue, RunIssue models + Run.scheduleId
-- Note: tables created FIRST, then the Run.scheduleId FK (ordering matters)

ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "scheduleId" TEXT;

CREATE TABLE IF NOT EXISTS "QaSchedule" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT NOT NULL,
  "cronExpression" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "mode" TEXT NOT NULL DEFAULT 'single',
  "routes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "maxPages" INTEGER,
  "maxDepth" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastFiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QaSchedule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QaSchedule_environmentId_idx" ON "QaSchedule"("environmentId");
CREATE INDEX IF NOT EXISTS "QaSchedule_active_idx" ON "QaSchedule"("active");
ALTER TABLE "QaSchedule" ADD CONSTRAINT "QaSchedule_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "Issue" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "normalizedMessage" TEXT NOT NULL,
  "firstSeenRunId" TEXT NOT NULL,
  "lastSeenRunId" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolvedBy" TEXT,
  "resolvedAtRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Issue_fingerprint_key" ON "Issue"("fingerprint");
CREATE INDEX IF NOT EXISTS "Issue_environmentId_lastSeenRunId_idx" ON "Issue"("environmentId", "lastSeenRunId");
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "RunIssue" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RunIssue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RunIssue_runId_issueId_key" ON "RunIssue"("runId", "issueId");
CREATE INDEX IF NOT EXISTS "RunIssue_issueId_idx" ON "RunIssue"("issueId");
ALTER TABLE "RunIssue" ADD CONSTRAINT "RunIssue_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE;
ALTER TABLE "RunIssue" ADD CONSTRAINT "RunIssue_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE;

-- Run.scheduleId FK (tables now exist)
ALTER TABLE "Run" ADD CONSTRAINT "Run_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "QaSchedule"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Run_scheduleId_idx" ON "Run"("scheduleId");
