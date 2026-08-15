import { describe, expect, it } from "vitest";
import {
  applyCronJitter,
  isValidCron,
  jitterMinute,
  nextRunAt,
  stableHash,
} from "@/lib/shared/domain/cron";

describe("stableHash", () => {
  it("is deterministic across calls", () => {
    expect(stableHash("qa-jitter:env-1")).toBe(stableHash("qa-jitter:env-1"));
  });

  it("produces different hashes for different inputs", () => {
    expect(stableHash("qa-jitter:env-1")).not.toBe(stableHash("qa-jitter:env-2"));
  });
});

describe("jitterMinute", () => {
  it("returns a value in [0, 59]", () => {
    for (const id of ["env-a", "env-b", "env-c", "env-d", "env-e"]) {
      expect(jitterMinute(id)).toBeGreaterThanOrEqual(0);
      expect(jitterMinute(id)).toBeLessThanOrEqual(59);
    }
  });

  it("is stable for the same environment id", () => {
    expect(jitterMinute("env-stable")).toBe(jitterMinute("env-stable"));
  });
});

describe("applyCronJitter", () => {
  it("rewrites a literal 0 minute to the jittered minute", () => {
    const id = "env-jitter";
    expect(applyCronJitter("0 * * * *", id)).toBe(`${jitterMinute(id)} * * * *`);
  });

  it("leaves a wildcard minute unchanged", () => {
    expect(applyCronJitter("* * * * *", "env-jitter")).toBe("* * * * *");
  });

  it("leaves a fixed non-zero minute unchanged", () => {
    expect(applyCronJitter("30 * * * *", "env-jitter")).toBe("30 * * * *");
  });

  it("leaves a step minute unchanged", () => {
    expect(applyCronJitter("*/5 * * * *", "env-jitter")).toBe("*/5 * * * *");
  });

  it("leaves a 4-field cron unchanged", () => {
    expect(applyCronJitter("0 * * *", "env-jitter")).toBe("0 * * *");
  });
});

describe("isValidCron", () => {
  it("accepts a valid 5-field cron", () => {
    expect(isValidCron("* * * * *")).toBe(true);
  });

  it("rejects an invalid cron", () => {
    expect(isValidCron("not a cron")).toBe(false);
  });

  it("rejects a 6-field cron with seconds", () => {
    expect(isValidCron("0 17 2 * * *")).toBe(false);
  });
});

describe("nextRunAt", () => {
  it("returns an ISO string for a valid cron", () => {
    const result = nextRunAt("* * * * *");
    expect(result).not.toBeNull();
    expect(new Date(result!).toISOString()).toBe(result);
  });

  it("returns null for an invalid cron", () => {
    expect(nextRunAt("not a cron")).toBeNull();
  });
});
