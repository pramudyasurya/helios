-- Additive migration: nullable columns + FK + indexes (expand-only, zero-downtime)
-- Adds pageResultId, severity, viewport to Evidence; checks to PageResult

ALTER TABLE "Evidence" ADD COLUMN "pageResultId" TEXT;
ALTER TABLE "Evidence" ADD COLUMN "severity" TEXT;
ALTER TABLE "Evidence" ADD COLUMN "viewport" TEXT;

ALTER TABLE "PageResult" ADD COLUMN "checks" JSONB;

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_pageResultId_fkey"
  FOREIGN KEY ("pageResultId") REFERENCES "PageResult"("id") ON DELETE CASCADE;

CREATE INDEX "Evidence_pageResultId_idx" ON "Evidence"("pageResultId");
CREATE INDEX "Evidence_runId_idx" ON "Evidence"("runId");
