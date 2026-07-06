"use client";

import { useEffect, useState, useCallback } from "react";
import type { LatestRun, RunStats } from "@/lib/helios/shared/types";
import { getRunErrorMessage } from "@/lib/helios/shared/errors";
import { isValidHttpUrl } from "@/lib/helios/shared/validators";
import {
  createRun,
  getRuns,
  getRunStats,
  clearRecentRuns,
  deleteRun,
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

export function useRunDashboard(onRunComplete?: () => void) {
  const [latestRun, setLatestRun] = useState<LatestRun | null>(null);
  const [runError, setRunError] = useState<string | undefined>();

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

      onRunComplete?.();
    } catch (error) {
      const message = getRunErrorMessage(error);
      console.warn("Failed to call run API", message);
      setRunError(message);

      const failedRun = createFailedRunState(run, message);
      setLatestRun(failedRun);

      onRunComplete?.();
    }
  };

  const handleReset = () => {
    setLatestRun(null);
  };

  return {
    latestRun,
    runError,
    isRunActive,
    handleSubmit,
    handleReset,
  };
}

export function useRunHistory(refreshTrigger?: number) {
  const [recentRuns, setRecentRuns] = useState<LatestRun[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | undefined>();

  const [stats, setStats] = useState<RunStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    return params?.get("q") || "";
  });

  const [statusFilter, setStatusFilter] = useState(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    return params?.get("status") || "All";
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    return Number(params?.get("page")) || 1;
  });

  const [totalPages, setTotalPages] = useState(1);

  const refreshStats = useCallback(async () => {
    try {
      const fetchedStats = await getRunStats();
      setStats(fetchedStats);
    } catch (error) {
      console.warn("Failed to refresh stats:", error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const fetchedStats = await getRunStats();
        if (active) {
          setStats(fetchedStats);
        }
      } catch (error) {
        console.warn("Failed to load stats:", error);
      } finally {
        if (active) {
          setIsStatsLoading(false);
        }
      }
    }
    loadStats();
    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        setIsHistoryLoading(true);
        const response = await getRuns({
          page: currentPage,
          q: searchQuery,
          status: statusFilter,
        });
        if (active) {
          setRecentRuns(response.data);
          setTotalPages(response.meta.totalPages);
          setHistoryError(undefined);
          const newUrl = new URL(window.location.href);
          if (searchQuery) newUrl.searchParams.set("q", searchQuery);
          else newUrl.searchParams.delete("q");
          if (statusFilter !== "All")
            newUrl.searchParams.set("status", statusFilter);
          else newUrl.searchParams.delete("status");
          if (currentPage > 1)
            newUrl.searchParams.set("page", currentPage.toString());
          else newUrl.searchParams.delete("page");
          window.history.replaceState({}, "", newUrl.toString());
        }
      } catch (error) {
        if (active) {
          console.warn("Failed to load recent runs:", error);
          setHistoryError("Failed to load recent runs.");
        }
      } finally {
        if (active) setIsHistoryLoading(false);
      }
    }
    fetchHistory();
    return () => {
      active = false;
    };
  }, [currentPage, searchQuery, statusFilter, refreshTrigger]);

  const handleDeleteRun = useCallback(
    async (id: string) => {
      try {
        await deleteRun(id);
        setRecentRuns((current) => current.filter((r) => r.id !== id));
        refreshStats();

        const res = await getRuns({
          page: currentPage,
          q: searchQuery,
          status: statusFilter,
        });
        setRecentRuns(res.data);
        setTotalPages(res.meta.totalPages);
      } catch (error) {
        console.error("Failed to delete run:", error);
        throw error;
      }
    },
    [currentPage, searchQuery, statusFilter, refreshStats],
  );

  const handleClearRecentRuns = useCallback(async () => {
    try {
      await clearRecentRuns();
      setRecentRuns([]);
      setTotalPages(1);
      setCurrentPage(1);
      refreshStats();
    } catch (error) {
      console.error("Failed to clear runs from database:", error);
      throw error;
    }
  }, [refreshStats]);
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);
  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  return {
    recentRuns,
    isHistoryLoading,
    historyError,
    stats,
    isStatsLoading,
    searchQuery,
    statusFilter,
    currentPage,
    totalPages,
    handleSearch,
    handleStatusChange,
    handlePageChange,
    handleClearRecentRuns,
    handleDeleteRun,
  };
}
