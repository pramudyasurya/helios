-- Add index on PageResult.runId for cleanup deleteMany performance
CREATE INDEX "PageResult_runId_idx" ON "PageResult"("runId");
