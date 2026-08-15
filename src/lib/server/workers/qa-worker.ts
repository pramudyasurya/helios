import { prisma } from "@/lib/server/infrastructure/db/prisma";
import {
  startQARunWorker,
  startScheduleTickWorker,
  stopQABoss,
} from "@/lib/server/infrastructure/queue/qa-jobs";
import { reconcileQARunSchedules } from "@/lib/server/infrastructure/queue/qa-schedule-reconciler";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import { processQARun } from "@/lib/server/workers/qa-run-processor";
import { processScheduleTick } from "@/lib/server/workers/schedule-tick-processor";

async function main() {
  const boss = await startQARunWorker(processQARun);
  await startScheduleTickWorker(processScheduleTick);
  await reconcileQARunSchedules(boss);

  console.info("QA worker is listening for queued runs.");

  const shutdown = async () => {
    await boss.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void main().catch(async (error) => {
  const message = getErrorMessage(error, "QA Worker initialization failed.");
  console.error("QA worker failed to start:", message);
  console.error(
    "Please verify PostgreSQL is running, DATABASE_URL is configured, and Playwright dependencies are installed.",
  );
  await stopQABoss().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
