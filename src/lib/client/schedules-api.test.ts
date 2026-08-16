import { describe, expect, it, vi } from "vitest";
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  type ScheduleInput,
} from "@/lib/client/api";

const base = {
  id: "sched-1",
  environmentId: "env-1",
  cronExpression: "42 * * * *",
  timezone: "UTC",
  mode: "single",
  routes: [],
  maxPages: null,
  maxDepth: null,
  active: true,
  lastFiredAt: null,
  nextRunAt: "2026-08-17T00:42:00.000Z",
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
} as const;

describe("Schedules Client SDK API", () => {
  it("listSchedules unwraps the { data: [...] } envelope", async () => {
    const envelope = { data: [base] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listSchedules("p1", "env-1");
    expect(result).toEqual([base]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/projects/p1/environments/env-1/schedules",
    );
  });

  it("createSchedule POSTs the payload and unwraps .data", async () => {
    const payload: ScheduleInput = { cronExpression: "0 * * * *" };
    const envelope = { data: base };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(envelope), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createSchedule("p1", "env-1", payload);
    expect(result).toEqual(base);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/projects/p1/environments/env-1/schedules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("updateSchedule PATCHes to the schedule route and unwraps .data", async () => {
    const envelope = { data: { ...base, active: false } };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await updateSchedule("p1", "env-1", "sched-1", {
      active: false,
    });
    expect(result.active).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/projects/p1/environments/env-1/schedules/sched-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deleteSchedule DELETEs and returns the success envelope", async () => {
    const envelope = { success: true, deletedId: "sched-1" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await deleteSchedule("p1", "env-1", "sched-1");
    expect(result).toEqual(envelope);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/projects/p1/environments/env-1/schedules/sched-1",
      { method: "DELETE" },
    );
  });
});
