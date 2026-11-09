import type { Page } from "playwright";
import type { JourneyStep, JourneyStepOutcome, JourneyExecutionResult } from "@/lib/shared/domain/journey";
import { isPrivateHostOrIp } from "@/lib/server/infrastructure/runner/runner";
import { allowLocalTargets } from "@/lib/shared/domain/validators";

export type ExecuteJourneyOptions = {
  dnsCache?: Map<string, boolean>;
  defaultStepTimeoutMs?: number;
};

export async function executeJourney(
  page: Page,
  steps: JourneyStep[],
  options: ExecuteJourneyOptions = {},
): Promise<JourneyExecutionResult> {
  const defaultTimeout = options.defaultStepTimeoutMs ?? 8000;
  const outcomes: JourneyStepOutcome[] = [];
  let overallPassed = true;
  let failureError: string | undefined;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const timeout = step.timeoutMs ?? defaultTimeout;
    const start = Date.now();

    try {
      switch (step.action) {
        case "goto": {
          if (!step.url) {
            throw new Error(`Step ${step.id} (goto) requires a 'url' parameter.`);
          }
          const parsed = new URL(step.url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error(`Unsupported protocol ${parsed.protocol} in journey goto step.`);
          }
          if (!allowLocalTargets() && (await isPrivateHostOrIp(parsed.hostname, options.dnsCache ?? new Map()))) {
            throw new Error(`Journey goto target ${step.url} is blocked by SSRF protection.`);
          }
          await page.goto(step.url, {
            waitUntil: "domcontentloaded",
            timeout,
          });
          break;
        }

        case "click": {
          if (!step.selector) {
            throw new Error(`Step ${step.id} (click) requires a 'selector' parameter.`);
          }
          await page.waitForSelector(step.selector, { state: "visible", timeout });
          await page.click(step.selector, { timeout });
          break;
        }

        case "fill": {
          if (!step.selector) {
            throw new Error(`Step ${step.id} (fill) requires a 'selector' parameter.`);
          }
          await page.waitForSelector(step.selector, { state: "visible", timeout });
          await page.fill(step.selector, step.value ?? "", { timeout });
          break;
        }

        case "select": {
          if (!step.selector) {
            throw new Error(`Step ${step.id} (select) requires a 'selector' parameter.`);
          }
          await page.waitForSelector(step.selector, { state: "visible", timeout });
          await page.selectOption(step.selector, step.value ?? "", { timeout });
          break;
        }

        case "pressKey": {
          const key = step.value ?? "Enter";
          if (step.selector) {
            await page.waitForSelector(step.selector, { state: "visible", timeout });
            await page.press(step.selector, key, { timeout });
          } else {
            await page.keyboard.press(key);
          }
          break;
        }

        case "waitForSelector": {
          if (!step.selector) {
            throw new Error(`Step ${step.id} (waitForSelector) requires a 'selector' parameter.`);
          }
          await page.waitForSelector(step.selector, { state: "visible", timeout });
          break;
        }

        case "assertVisible": {
          if (!step.selector) {
            throw new Error(`Step ${step.id} (assertVisible) requires a 'selector' parameter.`);
          }
          await page.waitForSelector(step.selector, { state: "visible", timeout });
          const isVisible = await page.isVisible(step.selector);
          if (!isVisible) {
            throw new Error(`Element matching selector '${step.selector}' was not visible.`);
          }
          break;
        }

        case "assertText": {
          if (!step.selector) {
            throw new Error(`Step ${step.id} (assertText) requires a 'selector' parameter.`);
          }
          await page.waitForSelector(step.selector, { state: "visible", timeout });
          const text = (await page.textContent(step.selector)) ?? "";
          const expected = step.value ?? "";
          if (!text.includes(expected)) {
            throw new Error(
              `Expected text '${expected}' not found in selector '${step.selector}'. Found: '${text.slice(0, 100)}'`,
            );
          }
          break;
        }

        case "assertUrl": {
          if (!step.url && !step.value) {
            throw new Error(`Step ${step.id} (assertUrl) requires 'url' or 'value' pattern.`);
          }
          const currentUrl = page.url();
          const pattern = step.url ?? step.value ?? "";
          if (!currentUrl.includes(pattern)) {
            throw new Error(`Current page URL '${currentUrl}' does not match expected pattern '${pattern}'.`);
          }
          break;
        }

        default:
          throw new Error(`Unknown journey action '${(step as { action: string }).action}'.`);
      }

      outcomes.push({
        stepId: step.id,
        action: step.action,
        status: "passed",
        durationMs: Date.now() - start,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      outcomes.push({
        stepId: step.id,
        action: step.action,
        status: "failed",
        durationMs: Date.now() - start,
        error: errorMsg,
      });

      if (!step.optional) {
        overallPassed = false;
        failureError = `Step ${step.id} (${step.action}) failed: ${errorMsg}`;

        for (let j = i + 1; j < steps.length; j++) {
          outcomes.push({
            stepId: steps[j].id,
            action: steps[j].action,
            status: "skipped",
            durationMs: 0,
          });
        }
        break;
      }
    }
  }

  const stepsPassed = outcomes.filter((o) => o.status === "passed").length;
  const stepsFailed = outcomes.filter((o) => o.status === "failed").length;

  return {
    outcomes,
    passed: overallPassed,
    error: failureError,
    stepsTotal: steps.length,
    stepsPassed,
    stepsFailed,
  };
}
