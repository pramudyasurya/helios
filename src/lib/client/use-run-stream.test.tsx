/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useRunStream, type RunStreamState } from "./use-run-stream";
import type { TrailStep, RunStatus } from "@/lib/shared/domain/types";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emitMessage(data: unknown) {
    if (this.onmessage && !this.closed) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  emitError() {
    if (this.onerror && !this.closed) {
      this.onerror(new Event("error"));
    }
  }
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let hookResult: RunStreamState | undefined;

function TestComponent(props: {
  runId: string;
  initialStatus: RunStatus;
  initialTrail: TrailStep[];
  onTerminal?: () => void;
}) {
  const res = useRunStream(props);
  useEffect(() => {
    hookResult = res;
  }, [res]);
  return null;
}

function mountHook(props: {
  runId: string;
  initialStatus: RunStatus;
  initialTrail: TrailStep[];
  onTerminal?: () => void;
}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<TestComponent {...props} />);
  });
}

describe("useRunStream", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    hookResult = undefined;
    vi.unstubAllGlobals();
  });

  it("does not open EventSource when run is already terminal", () => {
    mountHook({
      runId: "run_done",
      initialStatus: "Completed",
      initialTrail: [],
    });

    expect(hookResult?.isStreaming).toBe(false);
    expect(MockEventSource.instances.length).toBe(0);
  });

  it("subscribes to SSE for active run and updates trail and status", () => {
    const initialTrail: TrailStep[] = [
      { label: "Queued", detail: "Waiting to launch", timestamp: "2026-11-12T00:00:00Z" },
    ];

    const onTerminal = vi.fn();
    mountHook({
      runId: "run_live",
      initialStatus: "Running",
      initialTrail,
      onTerminal,
    });

    expect(hookResult?.isStreaming).toBe(true);
    expect(MockEventSource.instances.length).toBe(1);

    const instance = MockEventSource.instances[0];

    // Emit live trail event
    act(() => {
      instance.emitMessage({
        type: "trail",
        step: {
          label: "Crawling page /docs",
          detail: "Loaded page",
          timestamp: "2026-11-12T00:01:00Z",
        },
      });
    });

    expect(hookResult?.trail.length).toBe(2);
    expect(hookResult?.trail[1].label).toBe("Crawling page /docs");

    // Emit terminal status
    act(() => {
      instance.emitMessage({
        type: "status",
        status: "Completed",
      });
    });

    expect(hookResult?.status).toBe("Completed");
    expect(instance.closed).toBe(true);
    expect(hookResult?.isStreaming).toBe(false);
    expect(onTerminal).toHaveBeenCalledTimes(1);
  });
});
