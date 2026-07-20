import { isIpPrivate } from "@/lib/shared/domain/validators";

export type CrawlQueueItem = {
  url: string;
  depth: number;
};

export type CrawlOptions = {
  maxDepth?: number;
  maxPages?: number;
};

export type CrawlQueueState = {
  pending: CrawlQueueItem[];
  visited: Set<string>;
};

export const DEFAULT_MAX_DEPTH = 2;
export const DEFAULT_MAX_PAGES = 5;

const ASSET_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".map",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".svg",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const HREF_PATTERN = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

export function canonicalizeUrl(value: string, baseUrl?: string): string | null {
  try {
    const url = new URL(value, baseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.hash = "";

    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    ) {
      url.port = "";
    }

    return hasAssetExtension(url.pathname) ? null : url.toString();
  } catch {
    return null;
  }
}

export function isSameOrigin(firstUrl: string, secondUrl: string): boolean {
  try {
    const first = new URL(firstUrl);
    const second = new URL(secondUrl);

    return first.origin === second.origin;
  } catch {
    return false;
  }
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();

  for (const match of html.matchAll(HREF_PATTERN)) {
    const href = match[1] ?? match[2] ?? match[3];
    if (!href) continue;

    const url = canonicalizeUrl(href, baseUrl);
    if (url) links.add(url);
  }

  return [...links];
}

export function createCrawlQueue(
  startingUrl: string,
  options: CrawlOptions = {},
): CrawlQueueState {
  const url = canonicalizeUrl(startingUrl);
  const { maxPages } = resolveCrawlOptions(options);

  if (!url || maxPages === 0) {
    return { pending: [], visited: new Set() };
  }

  return {
    pending: [{ url, depth: 0 }],
    visited: new Set([url]),
  };
}

export function takeNextCrawlPage(state: CrawlQueueState): {
  page: CrawlQueueItem | undefined;
  state: CrawlQueueState;
} {
  const [page, ...pending] = state.pending;

  return {
    page,
    state: { pending, visited: new Set(state.visited) },
  };
}

export function enqueueCrawlLinks({
  state,
  originUrl,
  parent,
  links,
  options = {},
}: {
  state: CrawlQueueState;
  originUrl: string;
  parent: CrawlQueueItem;
  links: string[];
  options?: CrawlOptions;
}): CrawlQueueState {
  const { maxDepth, maxPages } = resolveCrawlOptions(options);
  const pending = [...state.pending];
  const visited = new Set(state.visited);

  if (parent.depth >= maxDepth) return { pending, visited };

  for (const link of links) {
    if (visited.size >= maxPages) break;

    const url = canonicalizeUrl(link, parent.url);
    if (!url || visited.has(url) || !isSameOrigin(originUrl, url)) continue;

    visited.add(url);
    pending.push({ url, depth: parent.depth + 1 });
  }

  return { pending, visited };
}

export function shouldBlockRequestUrl(requestUrl: string): boolean {
  try {
    const url = new URL(requestUrl);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      isIpPrivate(url.hostname)
    );
  } catch {
    return true;
  }
}

function hasAssetExtension(pathname: string): boolean {
  const normalizedPathname = pathname.toLowerCase();

  return [...ASSET_EXTENSIONS].some((extension) =>
    normalizedPathname.endsWith(extension),
  );
}

function resolveCrawlOptions(options: CrawlOptions): {
  maxDepth: number;
  maxPages: number;
} {
  return {
    maxDepth: resolveLimit(options.maxDepth, DEFAULT_MAX_DEPTH, 0),
    maxPages: resolveLimit(options.maxPages, DEFAULT_MAX_PAGES, 0),
  };
}

function resolveLimit(
  value: number | undefined,
  fallback: number,
  minimum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum
  ) {
    return fallback;
  }

  return value;
}
