import { afterEach, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright";

import { captureBrokenImages } from "@/lib/server/infrastructure/runner/evidence";

// Page cannot be constructed without a browser; captureBrokenImages only calls
// page.evaluate, so the callback runs in-process against a stubbed document.
const pageStub = {
  evaluate: (fn: () => unknown) => Promise.resolve(fn()),
} as unknown as Page;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("captureBrokenImages", () => {
  it("reports images that finished loading with zero intrinsic width", async () => {
    vi.stubGlobal("document", {
      images: [{ complete: true, naturalWidth: 0, src: "https://x/broken.png" }],
    });

    await expect(captureBrokenImages(pageStub)).resolves.toEqual([
      "https://x/broken.png",
    ]);
  });

  it("does not report images that are still loading", async () => {
    vi.stubGlobal("document", {
      images: [{ complete: false, naturalWidth: 0, src: "https://x/loading.png" }],
    });

    await expect(captureBrokenImages(pageStub)).resolves.toEqual([]);
  });

  it("does not report images that loaded with a real intrinsic width", async () => {
    vi.stubGlobal("document", {
      images: [{ complete: true, naturalWidth: 640, src: "https://x/ok.png" }],
    });

    await expect(captureBrokenImages(pageStub)).resolves.toEqual([]);
  });

  it("prefers currentSrc over src when both are present", async () => {
    vi.stubGlobal("document", {
      images: [
        {
          complete: true,
          naturalWidth: 0,
          src: "https://x/original.png",
          currentSrc: "https://x/resolved.png",
        },
      ],
    });

    await expect(captureBrokenImages(pageStub)).resolves.toEqual([
      "https://x/resolved.png",
    ]);
  });

  it("returns only the broken images from a mixed set", async () => {
    vi.stubGlobal("document", {
      images: [
        { complete: true, naturalWidth: 0, src: "https://x/broken.png" },
        { complete: false, naturalWidth: 0, src: "https://x/loading.png" },
        { complete: true, naturalWidth: 640, src: "https://x/ok.png" },
      ],
    });

    await expect(captureBrokenImages(pageStub)).resolves.toEqual([
      "https://x/broken.png",
    ]);
  });
});
