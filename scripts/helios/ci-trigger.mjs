#!/usr/bin/env node

/**
 * Helios CI/CD Trigger Script
 * 
 * Triggers a browser QA run on Helios and optionally polls for completion.
 * Exits with status 0 on success, or 1 on test failure/timeout.
 *
 * Usage:
 *   node scripts/helios/ci-trigger.mjs [options]
 *
 * Environment Variables / Options:
 *   HELIOS_API_KEY      or --api-key <key>
 *   HELIOS_BASE_URL     or --base-url <url>      (default: http://localhost:3000)
 *   HELIOS_ENVIRONMENT  or --environment <name>  (optional target env)
 *   HELIOS_URL          or --url <url>           (optional target URL override)
 *   --wait                                       (wait and poll for completion)
 *   --timeout <seconds>                          (default: 300)
 */

const args = process.argv.slice(2);

function getArg(flag, envVar, fallback = null) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return process.env[envVar] || fallback;
}

const hasWait = args.includes("--wait");
const apiKey = getArg("--api-key", "HELIOS_API_KEY");
const baseUrl = (getArg("--base-url", "HELIOS_BASE_URL", "http://localhost:3000")).replace(/\/+$/, "");
const environment = getArg("--environment", "HELIOS_ENVIRONMENT");
const targetUrl = getArg("--url", "HELIOS_URL");
const timeoutSeconds = parseInt(getArg("--timeout", "HELIOS_TIMEOUT", "300"), 10);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Helios CI/CD QA Trigger

Options:
  --api-key <key>      Helios Project API Key (or HELIOS_API_KEY)
  --base-url <url>     Helios instance URL (or HELIOS_BASE_URL, default: http://localhost:3000)
  --environment <env>  Target environment name (e.g. staging, production)
  --url <url>          Direct URL override to run QA against
  --wait               Block until the run completes and check pass rate
  --timeout <sec>      Timeout in seconds when waiting (default: 300)
  --help, -h           Show this help message
`);
  process.exit(0);
}

if (!apiKey) {
  console.error("Error: Missing Helios API key. Set HELIOS_API_KEY or pass --api-key <key>.");
  process.exit(1);
}

async function triggerRun() {
  const triggerEndpoint = `${baseUrl}/api/ci/trigger`;
  console.log(`[Helios CI] Submitting QA trigger request to ${triggerEndpoint}...`);

  const payload = {};
  if (environment) payload.environment = environment;
  if (targetUrl) payload.url = targetUrl;

  const res = await fetch(triggerEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Helios CI] Trigger failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`[Helios CI] Run queued successfully!`);
  console.log(`  Run ID:      ${data.runId}`);
  console.log(`  Target:      ${data.targetUrl}`);
  console.log(`  Project:     ${data.projectName}`);
  console.log(`  Environment: ${data.environment ? data.environment.name : "default"}`);
  console.log(`  View URL:    ${data.viewUrl}`);

  if (!hasWait) {
    console.log("[Helios CI] --wait flag not provided. Exiting with success.");
    process.exit(0);
  }

  return pollStatus(data.statusUrl);
}

async function pollStatus(statusUrl) {
  console.log(`[Helios CI] Waiting for run completion (timeout: ${timeoutSeconds}s)...`);
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const res = await fetch(statusUrl, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        console.warn(`[Helios CI] Warning: polling returned status ${res.status}`);
        continue;
      }

      const statusData = await res.json();
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Helios CI] [${elapsedSec}s] Status: ${statusData.status} | Pass Rate: ${statusData.metrics?.passRate ?? 0}%`);

      if (statusData.isTerminal) {
        if (statusData.status.toLowerCase() === "completed") {
          console.log(`\n[Helios CI] QA Run PASSED!`);
          console.log(`  Summary: ${statusData.summary}`);
          console.log(`  Checks:  ${statusData.metrics?.passedChecks} / ${statusData.metrics?.totalChecks} passed`);
          console.log(`  Details: ${statusData.startingUrl}`);
          process.exit(0);
        } else {
          console.error(`\n[Helios CI] QA Run FAILED with status: ${statusData.status}`);
          console.error(`  Summary: ${statusData.summary}`);
          process.exit(1);
        }
      }
    } catch (err) {
      console.warn(`[Helios CI] Warning: poll request failed: ${err.message}`);
    }
  }

  console.error(`\n[Helios CI] Error: Timeout reached (${timeoutSeconds}s) waiting for run.`);
  process.exit(1);
}

triggerRun().catch((err) => {
  console.error(`[Helios CI] Unexpected error:`, err);
  process.exit(1);
});
