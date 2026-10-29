import { afterEach, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright";

import {
  attachPageEvidenceListeners,
  captureBrokenImages,
  createBrowserEvidenceCollector,
} from "@/lib/server/infrastructure/runner/evidence";
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

describe("attachPageEvidenceListeners", () => {
  it("captures mixed content requests when page URL is HTTPS and request URL is HTTP", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const pageMock = {
      url: () => "https://example.com/secure-page",
      on: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
      },
    } as unknown as Page;

    const collector = createBrowserEvidenceCollector();
    attachPageEvidenceListeners({
      page: pageMock,
      viewportLabel: "Desktop",
      collector,
    });

    const requestHandler = handlers.get("request");
    expect(requestHandler).toBeDefined();

    // Subresource over HTTP on HTTPS page
    requestHandler!({
      url: () => "http://insecure.example.com/script.js",
      resourceType: () => "script",
    });

    // Subresource over HTTPS on HTTPS page (should not be captured)
    requestHandler!({
      url: () => "https://secure.example.com/style.css",
      resourceType: () => "stylesheet",
    });

    expect(collector.insecureResources).toEqual([
      "[Desktop] script: http://insecure.example.com/script.js",
    ]);
  });

  it("does not capture HTTP requests when page itself is HTTP", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const pageMock = {
      url: () => "http://example.com/plain-page",
      on: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
      },
    } as unknown as Page;

    const collector = createBrowserEvidenceCollector();
    attachPageEvidenceListeners({
      page: pageMock,
      viewportLabel: "Mobile",
      collector,
    });

    const requestHandler = handlers.get("request");
    requestHandler!({
      url: () => "http://example.com/image.png",
      resourceType: () => "image",
    });

    expect(collector.insecureResources).toEqual([]);
  });
});
