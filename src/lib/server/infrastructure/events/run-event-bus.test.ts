import { describe, expect, it, vi } from "vitest";
import { runEventBus, type RunStreamEvent } from "./run-event-bus";

describe("RunEventBus", () => {
  it("subscribes and receives events for matching runId", () => {
    const runId = "run_test_1";
    const listener = vi.fn();

    const unsubscribe = runEventBus.subscribeToRun(runId, listener);

    const event: RunStreamEvent = {
      type: "status",
      status: "Running",
      summary: "In progress",
    };

    runEventBus.emitRunEvent(runId, event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
  });

  it("does not receive events for different runId", () => {
    const runIdA = "run_test_a";
    const runIdB = "run_test_b";
    const listenerA = vi.fn();

    const unsubscribeA = runEventBus.subscribeToRun(runIdA, listenerA);

    runEventBus.emitRunEvent(runIdB, {
      type: "status",
      status: "Running",
    });

    expect(listenerA).not.toHaveBeenCalled();

    unsubscribeA();
  });

  it("unsubscribes cleanly and decreases listener count", () => {
    const runId = "run_test_cleanup";
    const listener = vi.fn();

    const initialCount = runEventBus.listenerCount(runId);
    const unsubscribe = runEventBus.subscribeToRun(runId, listener);

    expect(runEventBus.listenerCount(runId)).toBe(initialCount + 1);

    unsubscribe();
    expect(runEventBus.listenerCount(runId)).toBe(initialCount);

    runEventBus.emitRunEvent(runId, {
      type: "heartbeat",
      timestamp: new Date().toISOString(),
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
