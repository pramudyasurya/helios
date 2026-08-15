import { describe, expect, it } from "vitest";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";

describe("HELIOS_ROUTES", () => {
  it("returns the dashboard route", () => {
    expect(HELIOS_ROUTES.dashboard).toBe("/");
  });

  it("returns a run detail route", () => {
    expect(HELIOS_ROUTES.runDetail("run_123")).toBe("/runs/run_123");
  });

  it("returns a run comparison route with both run ids", () => {
    expect(HELIOS_ROUTES.compare("run_123", "run_456")).toBe(
      "/runs/compare?a=run_123&b=run_456",
    );
  });
});
