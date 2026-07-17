import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";

type CaptureRunScreenshotsProps = {
  runId: string;
  desktopPage: Page;
  mobilePage: Page;
};

export async function captureRunScreenshots({
  runId,
  desktopPage,
  mobilePage,
}: CaptureRunScreenshotsProps) {
  const artifactDir = path.join(
    process.cwd(),
    "public",
    "artifacts",
    "runs",
    runId,
  );

  await mkdir(artifactDir, { recursive: true });

  const desktopScreenshotPath = path.join(artifactDir, "desktop.png");
  const mobileScreenshotPath = path.join(artifactDir, "mobile.png");

  await desktopPage.screenshot({
    path: desktopScreenshotPath,
    fullPage: true,
  });

  await mobilePage.screenshot({
    path: mobileScreenshotPath,
    fullPage: true,
  });

  return {
    desktopScreenshot: `/artifacts/runs/${runId}/desktop.png`,
    mobileScreenshot: `/artifacts/runs/${runId}/mobile.png`,
  };
}
