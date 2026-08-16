import { CronExpressionParser } from "cron-parser";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function stableHash(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  const bytes = new TextEncoder().encode(input);

  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
}

export function jitterMinute(environmentId: string): number {
  return stableHash(`qa-jitter:${environmentId}`) % 60;
}

export function applyCronJitter(cron: string, environmentId: string): string {
  const fields = cron.trim().split(/\s+/);

  if (fields.length !== 5 || fields[0] !== "0") return cron;

  fields[0] = String(jitterMinute(environmentId));
  return fields.join(" ");
}

export function isValidCron(cron: string, tz = "UTC"): boolean {
  try {
    CronExpressionParser.parse(cron, { tz, strict: false });
    return cron.trim().split(/\s+/).length === 5;
  } catch {
    return false;
  }
}

export function nextRunAt(cron: string, tz = "UTC", after = new Date()): string | null {
  try {
    return CronExpressionParser.parse(cron, { tz, strict: false, currentDate: after })
      .next()
      .toDate()
      .toISOString();
  } catch {
    return null;
  }
}

export const SCHEDULE_PRESETS = [
  { label: "Every 15 minutes", cron: "*/15 * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily", cron: "0 0 * * *" },
  { label: "Weekly", cron: "0 0 * * 1" },
] as const;

export function scheduleNextRunAt(
  cron: string,
  environmentId: string,
  timezone = "UTC",
): string | null {
  const effective = applyCronJitter(cron, environmentId);
  return nextRunAt(effective, timezone);
}
