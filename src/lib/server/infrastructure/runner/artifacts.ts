import "server-only";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";

type CaptureRunScreenshotsProps = {
  runId: string;
  pageId?: string;
  desktopPage: Page;
  mobilePage: Page;
};

export async function captureRunScreenshots({
  runId,
  pageId,
  desktopPage,
  mobilePage,
}: CaptureRunScreenshotsProps) {
  const artifactPath = pageId ? [runId, pageId] : [runId];
  const artifactDir = path.join(
    process.cwd(),
    "public",
    "artifacts",
    "runs",
    ...artifactPath,
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

  const publicArtifactPath = artifactPath.join("/");

  return {
    desktopScreenshot: `/artifacts/runs/${publicArtifactPath}/desktop.png`,
    mobileScreenshot: `/artifacts/runs/${publicArtifactPath}/mobile.png`,
  };
}

export async function clearRunArtifacts(runId: string): Promise<void> {
  const artifactDir = path.join(
    process.cwd(),
    "public",
    "artifacts",
    "runs",
    runId,
  );
  await rm(artifactDir, { recursive: true, force: true });
}

export async function clearAllRunArtifacts(): Promise<void> {
  const runsArtifactDir = path.join(
    process.cwd(),
    "public",
    "artifacts",
    "runs",
  );
  await rm(runsArtifactDir, { recursive: true, force: true });
}
