"use client";

import { useEffect, useState } from "react";
import type { RunStatus, TrailStep } from "@/lib/shared/domain/types";
import { normalizeRunStatus } from "@/lib/shared/domain/format";

type UseRunStreamOptions = {
  runId: string;
  initialStatus: RunStatus;
  initialTrail: TrailStep[];
  onTerminal?: () => void;
};

export type RunStreamState = {
  status: RunStatus;
  trail: TrailStep[];
  isStreaming: boolean;
  evidenceCount: number;
};

export function useRunStream({
  runId,
  initialStatus,
  initialTrail,
  onTerminal,
}: UseRunStreamOptions): RunStreamState {
  const [status, setStatus] = useState<RunStatus>(initialStatus);
  const [trail, setTrail] = useState<TrailStep[]>(initialTrail);
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus);
  const [prevInitialTrail, setPrevInitialTrail] = useState(initialTrail);
  const isTerminalInitial = (() => {
    const n = normalizeRunStatus(initialStatus);
    return n === "Completed" || n === "Failed";
  })();
  const [isStreaming, setIsStreaming] = useState(!isTerminalInitial);
  const [evidenceCount, setEvidenceCount] = useState(0);

  if (prevInitialStatus !== initialStatus) {
    setPrevInitialStatus(initialStatus);
    setStatus(initialStatus);
  }

  if (prevInitialTrail !== initialTrail) {
    setPrevInitialTrail(initialTrail);
    setTrail(initialTrail);
  }
  useEffect(() => {
    const normalized = normalizeRunStatus(status);
    const isTerminal = normalized === "Completed" || normalized === "Failed";

    if (isTerminal || typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const eventSource = new EventSource(`/api/runs/${runId}/stream`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "init") {
          if (data.status) setStatus(data.status);
          if (Array.isArray(data.trail)) setTrail(data.trail);
          if (typeof data.evidenceCount === "number") {
            setEvidenceCount(data.evidenceCount);
          }
          if (data.status === "Completed" || data.status === "Failed") {
            eventSource.close();
            setIsStreaming(false);
            onTerminal?.();
          }
        } else if (data.type === "trail" && data.step) {
          setTrail((prev) => {
            const exists = prev.some(
              (s) => s.label === data.step.label && s.timestamp === data.step.timestamp,
            );
            return exists ? prev : [...prev, data.step];
          });
        } else if (data.type === "status" && data.status) {
          setStatus(data.status);
          if (data.status === "Completed" || data.status === "Failed") {
            eventSource.close();
            setIsStreaming(false);
            onTerminal?.();
          }
        } else if (data.type === "evidence" && typeof data.evidenceCount === "number") {
          setEvidenceCount((prev) => prev + data.evidenceCount);
        }
      } catch {
        // Safe fall-through on unparseable SSE frame
      }
    };

    eventSource.onerror = () => {
      // EventSource automatically retries or closes
      setIsStreaming(false);
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [runId, status, onTerminal]);

  return {
    status,
    trail,
    isStreaming,
    evidenceCount,
  };
}
