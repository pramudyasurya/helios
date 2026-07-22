"use client";

import { useEffect, useState, useCallback } from "react";
import type { LatestRun, RunStats } from "@/lib/shared/domain/types";
import { getRunErrorMessage } from "@/lib/shared/domain/errors";
import { isValidHttpUrl } from "@/lib/shared/domain/validators";
import {
  createRun,
  getRuns,
  getRunStats,
  getRunDetail,
  clearRecentRuns,
  deleteRun,
} from "@/lib/client/api";
import { createQueuedRunState } from "@/lib/client/run-state";
import { createFailedRunState } from "@/lib/client/run-transformer";

export function useRunDashboard(onRunComplete?: () => void) {
  const [latestRun, setLatestRun] = useState<LatestRun | null>(null);
  const [runError, setRunError] = useState<string | undefined>();

  const isRunActive =
    latestRun?.status === "Queued" || latestRun?.status === "Running";
  const activeRunId = isRunActive ? latestRun?.id : undefined;

  useEffect(() => {
    if (!activeRunId) return;

    let active = true;

    const pollRun = async () => {
      try {
        const run = await getRunDetail(activeRunId);
        if (!active) return;

        setLatestRun(run);

        if (run.status === "Completed" || run.status === "Failed") {
          onRunComplete?.();
        }
      } catch (error) {
        if (!active) return;

        const message = getRunErrorMessage(error);
        setRunError(message);
        setLatestRun((currentRun) =>
          currentRun ? createFailedRunState(currentRun, message) : currentRun,
        );
        onRunComplete?.();
      }
    };

    void pollRun();
    const intervalId = window.setInterval(() => void pollRun(), 2_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [activeRunId, onRunComplete]);

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (e) => {
    e.preventDefault();
    setRunError(undefined);

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url")?.toString().trim() ?? "";

    if (!isValidHttpUrl(url)) {
      setRunError("Please enter a valid HTTP or HTTPS URL.");
      return;
    }

    try {
      const result = await createRun(url);
      const { run } = createQueuedRunState(url);

      setLatestRun({ ...run, id: result.id });
      onRunComplete?.();
    } catch (error) {
      const message = getRunErrorMessage(error);
      console.warn("Failed to call run API", message);
      setRunError(message);

      const { run } = createQueuedRunState(url);
      setLatestRun(createFailedRunState(run, message));

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
      const fetchedStats = await getRunStats({
        q: searchQuery,
        status: statusFilter,
      });
      setStats(fetchedStats);
    } catch (error) {
      console.warn("Failed to refresh stats:", error);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const fetchedStats = await getRunStats({
          q: searchQuery,
          status: statusFilter,
        });
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
  }, [refreshTrigger, searchQuery, statusFilter]);

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
