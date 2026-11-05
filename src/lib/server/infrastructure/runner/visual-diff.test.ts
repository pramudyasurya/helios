import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { computeVisualDiff } from "./visual-diff";

function createSolidPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe("visual-diff engine", () => {
  it("detects zero diff on identical images", () => {
    const imgA = createSolidPng(20, 20, 100, 150, 200);
    const imgB = createSolidPng(20, 20, 100, 150, 200);

    const result = computeVisualDiff(imgA, imgB);

    expect(result.hasDiff).toBe(false);
    expect(result.diffPixelCount).toBe(0);
    expect(result.diffPercentage).toBe(0);
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
    expect(result.diffBuffer).toBeInstanceOf(Buffer);
  });

  it("detects pixel differences and calculates diff percentage", () => {
    const imgA = createSolidPng(10, 10, 255, 255, 255);
    const imgB = createSolidPng(10, 10, 0, 0, 0);

    const result = computeVisualDiff(imgA, imgB);

    expect(result.hasDiff).toBe(true);
    expect(result.diffPixelCount).toBe(100);
    expect(result.diffPercentage).toBe(100);
  });

  it("handles mismatched dimensions by normalizing canvas", () => {
    const imgA = createSolidPng(10, 10, 255, 255, 255);
    const imgB = createSolidPng(20, 15, 255, 255, 255);

    const result = computeVisualDiff(imgA, imgB);

    expect(result.width).toBe(20);
    expect(result.height).toBe(15);
    expect(result.diffBuffer).toBeInstanceOf(Buffer);
  });
});
