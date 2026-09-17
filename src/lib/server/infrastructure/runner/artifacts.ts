import "server-only";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";

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

  const screenshots: {
    desktopScreenshot: string;
    mobileScreenshot: string;
    trace?: string;
  } = {
    desktopScreenshot: `/artifacts/runs/${publicArtifactPath}/desktop.png`,
    mobileScreenshot: `/artifacts/runs/${publicArtifactPath}/mobile.png`,
  };

  return screenshots;
}

export function getRunTraceArtifactPath(runId: string) {
  const localPath = path.join(
    process.cwd(),
    "public",
    "artifacts",
    "runs",
    runId,
    "trace.zip",
  );
  const publicUrl = `/artifacts/runs/${runId}/trace.zip`;

  return { localPath, publicUrl };
}

type SaveRunTraceProps = {
  context: BrowserContext;
  runId: string;
};

export async function saveRunTrace({
  context,
  runId,
}: SaveRunTraceProps): Promise<string | undefined> {
  const { localPath, publicUrl } = getRunTraceArtifactPath(runId);
  const runDir = path.dirname(localPath);
  await mkdir(runDir, { recursive: true });
  await context.tracing.stop({ path: localPath });
  return publicUrl;
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
