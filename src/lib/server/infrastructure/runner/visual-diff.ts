import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import type { VisualDiffComparison, VisualDiffItem } from "@/lib/shared/domain/types";

export type ComputeDiffResult = {
  diffBuffer: Buffer;
  diffPixelCount: number;
  diffPercentage: number;
  width: number;
  height: number;
  hasDiff: boolean;
};

export type ComputeDiffOptions = {
  threshold?: number;
  includeAA?: boolean;
};

function normalizePngCanvas(sourcePng: PNG, targetWidth: number, targetHeight: number): PNG {
  if (sourcePng.width === targetWidth && sourcePng.height === targetHeight) {
    return sourcePng;
  }

  const canvas = new PNG({ width: targetWidth, height: targetHeight });
  canvas.data.fill(255);

  PNG.bitblt(
    sourcePng,
    canvas,
    0,
    0,
    sourcePng.width,
    sourcePng.height,
    0,
    0,
  );

  return canvas;
}

export function computeVisualDiff(
  imageABuffer: Buffer,
  imageBBuffer: Buffer,
  options: ComputeDiffOptions = {},
): ComputeDiffResult {
  const imgA = PNG.sync.read(imageABuffer);
  const imgB = PNG.sync.read(imageBBuffer);

  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);

  const normA = normalizePngCanvas(imgA, width, height);
  const normB = normalizePngCanvas(imgB, width, height);

  const diffPng = new PNG({ width, height });

  const threshold = options.threshold ?? 0.1;
  const includeAA = options.includeAA ?? false;

  const diffPixelCount = pixelmatch(
    normA.data,
    normB.data,
    diffPng.data,
    width,
    height,
    {
      threshold,
      includeAA,
      diffColor: [255, 0, 128],
    },
  );

  const totalPixels = width * height;
  const diffPercentage = totalPixels > 0
    ? Number(((diffPixelCount / totalPixels) * 100).toFixed(2))
    : 0;

  const diffBuffer = PNG.sync.write(diffPng);

  return {
    diffBuffer,
    diffPixelCount,
    diffPercentage,
    width,
    height,
    hasDiff: diffPixelCount > 0,
  };
}

const VIEWPORTS: ("desktop" | "mobile")[] = ["desktop", "mobile"];

export async function compareRunVisuals(
  runAId: string,
  runBId: string,
  options: ComputeDiffOptions = {},
): Promise<VisualDiffComparison> {
  const artifactsBase = path.join(process.cwd(), "public", "artifacts");
  const diffsBase = path.join(artifactsBase, "diffs", `${runAId}--${runBId}`);

  const items: VisualDiffItem[] = [];

  for (const viewport of VIEWPORTS) {
    const fileName = `${viewport}.png`;
    const runADir = path.join(artifactsBase, "runs", runAId);
    const runBDir = path.join(artifactsBase, "runs", runBId);

    let runAPath = path.join(runADir, fileName);
    let runBPath = path.join(runBDir, fileName);
    let publicPathA = `/artifacts/runs/${runAId}/${fileName}`;
    let publicPathB = `/artifacts/runs/${runBId}/${fileName}`;

    let bufferA: Buffer | null = null;
    let bufferB: Buffer | null = null;

    try {
      bufferA = await readFile(runAPath);
    } catch {
      try {
        const { readdir } = await import("node:fs/promises");
        const subdirs = await readdir(runADir, { withFileTypes: true });
        const pageDir = subdirs.find((d) => d.isDirectory())?.name;
        if (pageDir) {
          runAPath = path.join(runADir, pageDir, fileName);
          publicPathA = `/artifacts/runs/${runAId}/${pageDir}/${fileName}`;
          bufferA = await readFile(runAPath);
        }
      } catch {
        bufferA = null;
      }
    }

    try {
      bufferB = await readFile(runBPath);
    } catch {
      try {
        const { readdir } = await import("node:fs/promises");
        const subdirs = await readdir(runBDir, { withFileTypes: true });
        const pageDir = subdirs.find((d) => d.isDirectory())?.name;
        if (pageDir) {
          runBPath = path.join(runBDir, pageDir, fileName);
          publicPathB = `/artifacts/runs/${runBId}/${pageDir}/${fileName}`;
          bufferB = await readFile(runBPath);
        }
      } catch {
        bufferB = null;
      }
    }
    if (!bufferA || !bufferB) {
      items.push({
        viewport,
        runAImage: bufferA ? publicPathA : null,
        runBImage: bufferB ? publicPathB : null,
        diffImage: null,
        diffPixelCount: 0,
        diffPercentage: 0,
        width: 0,
        height: 0,
        hasDiff: false,
        status: "missing",
      });
      continue;
    }

    const diffResult = computeVisualDiff(bufferA, bufferB, options);
    const diffFileName = `${viewport}-diff.png`;
    const diffFilePath = path.join(diffsBase, diffFileName);
    const publicDiffPath = `/artifacts/diffs/${runAId}--${runBId}/${diffFileName}`;

    await mkdir(diffsBase, { recursive: true });
    await writeFile(diffFilePath, diffResult.diffBuffer);

    items.push({
      viewport,
      runAImage: publicPathA,
      runBImage: publicPathB,
      diffImage: publicDiffPath,
      diffPixelCount: diffResult.diffPixelCount,
      diffPercentage: diffResult.diffPercentage,
      width: diffResult.width,
      height: diffResult.height,
      hasDiff: diffResult.hasDiff,
      status: diffResult.hasDiff ? "diff" : "match",
    });
  }

  const totalDiffPixels = items.reduce((acc, item) => acc + item.diffPixelCount, 0);
  const maxDiffPercentage = items.reduce(
    (max, item) => Math.max(max, item.diffPercentage),
    0,
  );
  const hasVisualDiff = items.some((item) => item.hasDiff);

  return {
    items,
    totalDiffPixels,
    maxDiffPercentage,
    hasVisualDiff,
  };
}
