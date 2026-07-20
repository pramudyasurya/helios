-- CreateTable
CREATE TABLE "PageResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "finalUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "durationMs" INTEGER,
    "artifacts" JSONB,
    "brokenImages" JSONB,
    "consoleErrors" JSONB,
    "failedRequests" JSONB,
    "loadMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PageResult" ADD CONSTRAINT "PageResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
