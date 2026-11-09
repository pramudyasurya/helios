import path from "node:path";
import { readFile } from "node:fs/promises";
import type { LatestRun } from "@/lib/shared/domain/types";

export type HtmlReportOptions = {
  embedScreenshotsBase64?: boolean;
};

async function artifactToDataUri(publicPath?: string): Promise<string | null> {
  if (!publicPath || !publicPath.startsWith("/artifacts/")) return null;
  const relative = publicPath.replace(/^\/artifacts\//, "");
  const diskPath = path.join(process.cwd(), "public", "artifacts", relative);
  try {
    const buffer = await readFile(diskPath);
    const mime = publicPath.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function escapeHtml(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function generateStandaloneHtmlReport(
  run: LatestRun,
  options: HtmlReportOptions = { embedScreenshotsBase64: true },
): Promise<string> {
  let desktopUri = run.artifacts?.desktopScreenshot ?? "";
  let mobileUri = run.artifacts?.mobileScreenshot ?? "";

  if (options.embedScreenshotsBase64) {
    const embeddedDesktop = await artifactToDataUri(run.artifacts?.desktopScreenshot);
    if (embeddedDesktop) desktopUri = embeddedDesktop;
    const embeddedMobile = await artifactToDataUri(run.artifacts?.mobileScreenshot);
    if (embeddedMobile) mobileUri = embeddedMobile;
  }

  const passedChecks = run.checks.filter((c) => c.status === "passed").length;
  const warningChecks = run.checks.filter((c) => c.status === "warning").length;
  const failedChecks = run.checks.filter((c) => c.status === "failed").length;

  const statusColor =
    run.status === "Completed"
      ? "#10b981"
      : run.status === "Failed"
        ? "#f43f5e"
        : "#d99b36";

  const loadMetrics = run.loadMetrics;
  const cwvCards = loadMetrics
    ? `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Largest Contentful Paint (LCP)</div>
          <div class="metric-value">${loadMetrics.lcpMs !== undefined ? `${loadMetrics.lcpMs}ms` : "N/A"}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Cumulative Layout Shift (CLS)</div>
          <div class="metric-value">${loadMetrics.cls !== undefined ? loadMetrics.cls.toFixed(3) : "N/A"}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Time to First Byte (TTFB)</div>
          <div class="metric-value">${loadMetrics.ttfbMs !== undefined ? `${loadMetrics.ttfbMs}ms` : "N/A"}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">DOM Content Loaded</div>
          <div class="metric-value">${loadMetrics.domContentLoadedMs !== undefined ? `${loadMetrics.domContentLoadedMs}ms` : "N/A"}</div>
        </div>
      </div>
    `
    : "";

  const checksRows = run.checks
    .map((check) => {
      const badgeClass = `badge-${check.status}`;
      return `
        <tr>
          <td><span class="badge ${badgeClass}">${check.status.toUpperCase()}</span></td>
          <td><strong>${escapeHtml(check.title)}</strong></td>
          <td>${escapeHtml(check.detail)}</td>
          <td><span class="badge badge-subtle">${check.severity}</span></td>
        </tr>
      `;
    })
    .join("\n");

  const trailRows = run.trail
    .map((step) => {
      return `
        <div class="trail-item">
          <div class="trail-dot"></div>
          <div class="trail-content">
            <div class="trail-header">
              <span class="trail-label">${escapeHtml(step.label)}</span>
              <span class="trail-time">${new Date(step.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="trail-detail">${escapeHtml(step.detail)}</div>
          </div>
        </div>
      `;
    })
    .join("\n");

  const aiSection = run.report
    ? `
      <section class="card">
        <h2>AI QA Executive Summary</h2>
        <div class="ai-summary">
          <p>${escapeHtml(run.report.summary)}</p>
          <div class="badge badge-${run.report.riskLevel.toLowerCase()}">Risk: ${escapeHtml(run.report.riskLevel)}</div>
        </div>
      </section>
    `
    : "";

  const screenshotsSection =
    desktopUri || mobileUri
      ? `
      <section class="card">
        <h2>Visual Artifacts</h2>
        <div class="screenshots-grid">
          ${
            desktopUri
              ? `
            <div class="screenshot-box">
              <h3>Desktop Viewport (1440x900)</h3>
              <img src="${desktopUri}" alt="Desktop Screenshot" />
            </div>
          `
              : ""
          }
          ${
            mobileUri
              ? `
            <div class="screenshot-box mobile">
              <h3>Mobile Viewport (390x844)</h3>
              <img src="${mobileUri}" alt="Mobile Screenshot" />
            </div>
          `
              : ""
          }
        </div>
      </section>
    `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Helios QA Audit Report - ${escapeHtml(run.id)}</title>
  <style>
    :root {
      --bg: #0d0f12;
      --panel: #14171b;
      --card: #1a1e23;
      --border: #2a2f36;
      --text: #eceef1;
      --muted: #9aa3ae;
      --accent: #d99b36;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #f43f5e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 32px 24px;
      line-height: 1.5;
    }
    .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    header {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-main h1 { font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
    .header-main p { color: var(--muted); font-size: 14px; margin-top: 4px; }
    .status-badge {
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: ${statusColor};
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
    }
    .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
    .summary-stats { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
    .stat-pill {
      background: var(--card);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
    }
    .stat-pill strong { color: #fff; margin-right: 4px; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 8px;
    }
    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
    }
    .metric-label { font-size: 12px; color: var(--muted); text-transform: uppercase; }
    .metric-value { font-size: 22px; font-weight: 600; margin-top: 4px; color: var(--text); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--muted); font-weight: 500; }
    td { padding: 12px; border-bottom: 1px solid var(--border); }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-passed { background: rgba(16, 185, 129, 0.15); color: var(--success); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .badge-failed { background: rgba(244, 63, 94, 0.15); color: var(--danger); }
    .badge-subtle { background: var(--card); color: var(--muted); border: 1px solid var(--border); }
    .trail-timeline { display: flex; flex-direction: column; gap: 12px; }
    .trail-item { display: flex; gap: 16px; position: relative; }
    .trail-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      margin-top: 6px;
      flex-shrink: 0;
    }
    .trail-content { flex: 1; background: var(--card); border: 1px solid var(--border); padding: 12px; border-radius: 6px; }
    .trail-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; }
    .trail-time { color: var(--muted); font-size: 11px; }
    .trail-detail { color: var(--muted); font-size: 12px; margin-top: 4px; }
    .screenshots-grid { display: flex; gap: 24px; flex-wrap: wrap; }
    .screenshot-box { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 8px; }
    .screenshot-box.mobile { max-width: 320px; }
    .screenshot-box h3 { font-size: 13px; color: var(--muted); }
    .screenshot-box img {
      width: 100%;
      height: auto;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: #000;
    }
    footer { text-align: center; color: var(--muted); font-size: 12px; padding: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-main">
        <h1>Helios QA Audit Report</h1>
        <p>Target: <strong>${escapeHtml(run.finalUrl ?? "N/A")}</strong> &bull; Run ID: ${escapeHtml(run.id)} &bull; ${new Date(run.createdAt).toLocaleString()}</p>
      </div>
      <div class="status-badge" style="border-color: ${statusColor};">
        ${escapeHtml(run.status)}
      </div>
    </header>

    <section class="card">
      <h2>Executive Summary</h2>
      <p>${escapeHtml(run.summary)}</p>
      <div class="summary-stats">
        <div class="stat-pill"><strong>${passedChecks}</strong> Passed</div>
        <div class="stat-pill"><strong>${warningChecks}</strong> Warnings</div>
        <div class="stat-pill"><strong>${failedChecks}</strong> Failed</div>
        <div class="stat-pill"><strong>${run.durationMs ?? 0}ms</strong> Duration</div>
      </div>
    </section>

    ${cwvCards ? `<section class="card"><h2>Core Web Vitals & Load Performance</h2>${cwvCards}</section>` : ""}

    ${aiSection}

    <section class="card">
      <h2>Automated QA Checks (${run.checks.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Check</th>
            <th>Detail</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          ${checksRows}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Execution Trail (${run.trail.length} steps)</h2>
      <div class="trail-timeline">
        ${trailRows}
      </div>
    </section>

    ${screenshotsSection}

    <footer>
      Generated autonomously by Helios QA Platform &bull; Offline Portable Report
    </footer>
  </div>
</body>
</html>`;
}
