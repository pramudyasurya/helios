import { EventEmitter } from "node:events";
import type { RunStatus, TrailStep } from "@/lib/shared/domain/types";

export type RunStreamEvent =
  | { type: "trail"; step: TrailStep }
  | { type: "status"; status: RunStatus; summary?: string }
  | { type: "evidence"; evidenceCount: number }
  | { type: "heartbeat"; timestamp: string };

type RunEventListener = (event: RunStreamEvent) => void;

class RunEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emitRunEvent(runId: string, event: RunStreamEvent): void {
    this.emitter.emit(`run:${runId}`, event);
  }

  subscribeToRun(runId: string, listener: RunEventListener): () => void {
    const eventName = `run:${runId}`;
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  listenerCount(runId: string): number {
    return this.emitter.listenerCount(`run:${runId}`);
  }
}

const globalForEvents = globalThis as unknown as {
  runEventBus?: RunEventBus;
};

export const runEventBus = globalForEvents.runEventBus ?? new RunEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.runEventBus = runEventBus;
}
