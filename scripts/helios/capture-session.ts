/**
 * Captures a logged-in browser session for a Helios environment.
 *
 * Opens a headed browser at the environment's base URL, waits for the operator
 * to finish logging in, then PATCHes the resulting storageState to the
 * environment. Cookies and localStorage never leave the machine except into the
 * Helios database.
 *
 * Usage:
 *   npx tsx scripts/helios/capture-session.ts \
 *     --project <projectId> --environment <envId> [--url https://staging.example.com]
 *
 * Requires HELIOS_BASE_URL (defaults to http://localhost:3000).
 */

import { chromium } from "playwright";

type Args = {
  projectId: string;
  environmentId: string;
  url?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--project") {
      args.projectId = value;
      index += 1;
    } else if (flag === "--environment") {
      args.environmentId = value;
      index += 1;
    } else if (flag === "--url") {
      args.url = value;
      index += 1;
    }
  }

  if (!args.projectId || !args.environmentId) {
    throw new Error(
      "Both --project <projectId> and --environment <envId> are required.",
    );
  }

  return args as Args;
}

async function resolveBaseUrl(
  heliosBaseUrl: string,
  projectId: string,
  environmentId: string,
): Promise<string> {
  const response = await fetch(`${heliosBaseUrl}/api/projects/${projectId}`);
  if (!response.ok) {
    throw new Error(`Could not load project ${projectId}: ${response.status}`);
  }

  const project = (await response.json()) as {
    environments?: Array<{ id: string; name: string; baseUrl?: string | null }>;
    storageState?: unknown;
  };

  if (project.storageState !== undefined) {
    throw new Error(
      "Project response exposed storageState. The API projection regressed; fix the route before capturing a session.",
    );
  }

  const environment = project.environments?.find(
    (candidate) => candidate.id === environmentId,
  );

  if (!environment) {
    throw new Error(
      `Environment ${environmentId} is not part of project ${projectId}.`,
    );
  }

  if (!environment.baseUrl) {
    throw new Error(
      `Environment "${environment.name}" has no baseUrl. Set one first or pass --url.`,
    );
  }

  return environment.baseUrl;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const heliosBaseUrl = process.env.HELIOS_BASE_URL ?? "http://localhost:3000";

  const startUrl =
    args.url ?? (await resolveBaseUrl(heliosBaseUrl, args.projectId, args.environmentId));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(startUrl);

  console.log(`Opened ${startUrl}`);
  console.log("Log in, then press Enter here to capture the session.");

  const { promise: loggedIn, resolve: confirmLogin } =
    Promise.withResolvers<void>();
  process.stdin.resume();
  process.stdin.once("data", () => confirmLogin());
  await loggedIn;

  const storageState = await context.storageState();
  await browser.close();

  const response = await fetch(
    `${heliosBaseUrl}/api/projects/${args.projectId}/environments/${args.environmentId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storageState }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to store session (${response.status}): ${body}`);
  }

  const saved = (await response.json()) as { hasStorageState?: boolean };
  console.log(
    `Stored session: ${storageState.cookies.length} cookie(s), ${storageState.origins.length} origin(s). hasStorageState=${saved.hasStorageState}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
