"use client";

import { useEffect, useState } from "react";
import type { LatestRun } from "@/lib/helios/shared/types";
import { getRunErrorMessage } from "@/lib/helios/shared/errors";
import { isValidHttpUrl } from "@/lib/helios/shared/validators";
import {
  createRun,
  getRecentRuns,
  clearRecentRuns,
} from "@/lib/helios/client/api";
import { addRecentRun } from "@/lib/helios/client/recent-runs";
import {
  RUNNING_STATE_DELAY_MS,
  createQueuedRunState,
  markRunRunning,
} from "@/lib/helios/client/run-state";
import {
  createCompletedRunState,
  createFailedRunState,
} from "@/lib/helios/client/run-transformer";

export function useRunDashboard() {
  const [latestRun, setLatestRun] = useState<LatestRun | null>(null);
  const [runError, setRunError] = useState<string | undefined>();
  const [recentRuns, setRecentRuns] = useState<LatestRun[]>([]);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const history = await getRecentRuns();
        if (active) {
          setRecentRuns(history);
        }
      } catch (error) {
        console.warn("Failed to load recent runs:", error);
      }
    }

    fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  const isRunActive =
    latestRun?.status === "Queued" || latestRun?.status === "Running";

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (e) => {
    e.preventDefault();
    setRunError(undefined);

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url")?.toString().trim() ?? "";

    if (!isValidHttpUrl(url)) {
      setRunError("Please enter a valid HTTP or HTTPS URL.");
      return;
    }

    const { run } = createQueuedRunState(url);
    const runId = run.id;

    setLatestRun(run);

    setTimeout(() => {
      setLatestRun((prev) => {
        if (!prev || prev.id !== runId || prev.status !== "Queued") return prev;
        return markRunRunning(prev);
      });
    }, RUNNING_STATE_DELAY_MS);

    try {
      const result = await createRun(url);

      const completedRun = createCompletedRunState(run, result);

      setLatestRun(completedRun);
      setRecentRuns((currentRuns) => addRecentRun(currentRuns, completedRun));
    } catch (error) {
      const message = getRunErrorMessage(error);
      console.warn("Failed to call run API", message);

      setRunError(message);

      const failedRun = createFailedRunState(run, message);

      setLatestRun(failedRun);
      setRecentRuns((currentRuns) => addRecentRun(currentRuns, failedRun));
    }
  };

  const handleReset = () => {
    setLatestRun(null);
  };

  const handleClearRecentRuns = async () => {
    try {
      await clearRecentRuns();
    } catch (error) {
      console.error("Failed to clear runs from database:", error);
      return;
    }

    setRecentRuns([]);
    if (!isRunActive) setLatestRun(null);
  };

  return {
    latestRun,
    runError,
    recentRuns,
    isRunActive,
    handleSubmit,
    handleReset,
    handleClearRecentRuns,
  };
}
