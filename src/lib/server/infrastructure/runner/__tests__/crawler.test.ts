import { describe, expect, it } from "vitest";

import {
  canonicalizeUrl,
  createCrawlQueue,
  enqueueCrawlLinks,
  extractLinks,
  isSameOrigin,
  shouldBlockRequestUrl,
  takeNextCrawlPage,
} from "../crawler";

describe("canonicalizeUrl", () => {
  it("normalizes HTTP URLs while preserving query strings", () => {
    expect(canonicalizeUrl("https://example.com/docs#installation")).toBe(
      "https://example.com/docs",
    );
    expect(canonicalizeUrl("https://example.com/search?q=helios#results")).toBe(
      "https://example.com/search?q=helios",
    );
  });

  it("resolves relative URLs against the supplied base URL", () => {
    expect(canonicalizeUrl("guides/intro", "https://example.com/docs/")).toBe(
      "https://example.com/docs/guides/intro",
    );
  });

  it("rejects invalid, non-HTTP(S), and static asset URLs", () => {
    expect(canonicalizeUrl("not a URL")).toBeNull();
    expect(canonicalizeUrl("mailto:support@example.com")).toBeNull();
    expect(canonicalizeUrl("https://example.com/logo.PNG")).toBeNull();
    expect(canonicalizeUrl("https://example.com/report.pdf")).toBeNull();
  });
});

describe("isSameOrigin", () => {
  it("accepts URLs with the same protocol, hostname, and port", () => {
    expect(
      isSameOrigin("https://example.com", "https://example.com/docs"),
    ).toBe(true);
  });

  it("rejects different protocols, hostnames, ports, and invalid URLs", () => {
    expect(isSameOrigin("https://example.com", "http://example.com")).toBe(
      false,
    );
    expect(
      isSameOrigin("https://example.com", "https://www.example.com"),
    ).toBe(false);
    expect(
      isSameOrigin("https://example.com", "https://example.com:8443"),
    ).toBe(false);
    expect(isSameOrigin("not a URL", "https://example.com")).toBe(false);
  });
});

describe("extractLinks", () => {
  it("extracts, resolves, canonicalizes, and deduplicates anchor URLs", () => {
    const html = `
      <a href="/about">About</a>
      <a href='/pricing#plans'>Pricing</a>
      <a href=docs/getting-started>Docs</a>
      <a href="/about">Duplicate</a>
    `;

    expect(extractLinks(html, "https://example.com/")).toEqual([
      "https://example.com/about",
      "https://example.com/pricing",
      "https://example.com/docs/getting-started",
    ]);
  });

  it("omits invalid, non-HTTP(S), and static asset links", () => {
    const html = `
      <a href="mailto:team@example.com">Email</a>
      <a href="javascript:void(0)">Action</a>
      <a href="/images/logo.svg">Logo</a>
    `;

    expect(extractLinks(html, "https://example.com/")).toEqual([]);
  });
});

describe("crawl queue", () => {
  it("starts with the canonicalized submitted URL at depth zero", () => {
    const queue = createCrawlQueue("https://example.com/#home");

    expect(queue.pending).toEqual([
      { url: "https://example.com/", depth: 0 },
    ]);
    expect(queue.visited).toEqual(new Set(["https://example.com/"]));
  });

  it("returns an empty queue for an invalid URL or a zero page limit", () => {
    expect(createCrawlQueue("not a URL").pending).toEqual([]);
    expect(createCrawlQueue("https://example.com", { maxPages: 0 }).pending).toEqual(
      [],
    );
  });

  it("processes pages breadth-first and preserves the visited URLs", () => {
    const initial = createCrawlQueue("https://example.com");
    const first = takeNextCrawlPage(initial);

    expect(first.page).toEqual({ url: "https://example.com/", depth: 0 });

    const withFirstLevel = enqueueCrawlLinks({
      state: first.state,
      originUrl: "https://example.com",
      parent: first.page!,
      links: ["/about", "/pricing"],
    });
    const about = takeNextCrawlPage(withFirstLevel);
    const withSecondLevel = enqueueCrawlLinks({
      state: about.state,
      originUrl: "https://example.com",
      parent: about.page!,
      links: ["/team"],
    });

    expect(withSecondLevel.pending).toEqual([
      { url: "https://example.com/pricing", depth: 1 },
      { url: "https://example.com/team", depth: 2 },
    ]);
    expect(withSecondLevel.visited).toEqual(
      new Set([
        "https://example.com/",
        "https://example.com/about",
        "https://example.com/pricing",
        "https://example.com/team",
      ]),
    );
  });

  it("does not enqueue duplicate, external, asset, or over-depth links", () => {
    const initial = createCrawlQueue("https://example.com");
    const first = takeNextCrawlPage(initial);
    const withLinks = enqueueCrawlLinks({
      state: first.state,
      originUrl: "https://example.com",
      parent: first.page!,
      links: [
        "/about",
        "/about#team",
        "https://other.example/about",
        "/logo.png",
      ],
      options: { maxDepth: 1 },
    });
    const about = takeNextCrawlPage(withLinks);
    const afterDepthLimit = enqueueCrawlLinks({
      state: about.state,
      originUrl: "https://example.com",
      parent: about.page!,
      links: ["/team"],
      options: { maxDepth: 1 },
    });

    expect(afterDepthLimit.pending).toEqual([]);
    expect(afterDepthLimit.visited).toEqual(
      new Set(["https://example.com/", "https://example.com/about"]),
    );
  });

  it("honors the maximum total page count", () => {
    const initial = createCrawlQueue("https://example.com", { maxPages: 2 });
    const first = takeNextCrawlPage(initial);
    const limited = enqueueCrawlLinks({
      state: first.state,
      originUrl: "https://example.com",
      parent: first.page!,
      links: ["/about", "/pricing"],
      options: { maxPages: 2 },
    });

    expect(limited.pending).toEqual([
      { url: "https://example.com/about", depth: 1 },
    ]);
    expect(limited.visited.size).toBe(2);
  });
});

describe("shouldBlockRequestUrl", () => {
  it.each([
    "http://127.0.0.1",
    "http://10.0.0.5",
    "http://192.168.1.10",
    "http://169.254.169.254",
  ])("blocks private and metadata IP addresses: %s", (url) => {
    expect(shouldBlockRequestUrl(url)).toBe(true);
  });

  it("allows public HTTP(S) URLs and blocks malformed URLs", () => {
    expect(shouldBlockRequestUrl("https://example.com")).toBe(false);
    expect(shouldBlockRequestUrl("not a URL")).toBe(true);
  });
});
