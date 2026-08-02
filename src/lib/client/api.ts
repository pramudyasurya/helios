import type {
  CreateQueuedRunResponse,
  EvidenceStatus,
  LatestRun,
  PaginatedResponse,
  RunEvidence,
  RunStats,
} from "@/lib/shared/domain/types";
import type { AIReport } from "@/lib/shared/domain/types";

export type ApiErrorResponse = {
  error: string;
  message: string;
};

export type CreateRunOptions = {
  url: string;
  mode?: "single" | "manual" | "crawl";
  routes?: string[];
  maxPages?: number;
  maxDepth?: number;
  projectId?: string;
  environmentId?: string;
  origin?: "manual";
};

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  let data: unknown;

  try {
    const text = await response.text();
    const trimmedText = text.trim();

    if (!trimmedText) {
      if (!response.ok) {
        throw {
          error: `HTTP ${response.status}`,
          message: `Request failed with status ${response.status}`,
        } satisfies ApiErrorResponse;
      }
      throw {
        error: "Invalid Response",
        message: "Server returned an empty response body",
      } satisfies ApiErrorResponse;
    }

    if (
      contentType.includes("application/json") ||
      trimmedText.startsWith("{") ||
      trimmedText.startsWith("[")
    ) {
      data = JSON.parse(trimmedText);
    } else {
      throw {
        error: `HTTP ${response.status}`,
        message: `Request failed with status ${response.status}`,
      } satisfies ApiErrorResponse;
    }
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "error" in err &&
      "message" in err
    ) {
      throw err;
    }
    throw {
      error: response.ok ? "Parse Error" : `HTTP ${response.status}`,
      message: response.ok
        ? "Failed to parse JSON response"
        : `Request failed with status ${response.status}`,
    } satisfies ApiErrorResponse;
  }

  if (!response.ok) {
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      "message" in data
    ) {
      throw data as ApiErrorResponse;
    }
    throw {
      error: `HTTP ${response.status}`,
      message:
        (data as Record<string, string>)?.message ||
        `Request failed with status ${response.status}`,
    } satisfies ApiErrorResponse;
  }

  return data as T;
}

export async function createRun(
  options: string | CreateRunOptions,
): Promise<CreateQueuedRunResponse> {
  const payload = typeof options === "string" ? { url: options } : options;

  const response = await fetch("/api/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<CreateQueuedRunResponse>(response);
}

export async function getRuns(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
}): Promise<PaginatedResponse<LatestRun>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.q) searchParams.set("q", params.q);
  if (params?.status && params.status !== "All") {
    searchParams.set("status", params.status);
  }

  const queryString = searchParams.toString();
  const url = queryString ? `/api/runs?${queryString}` : "/api/runs";

  const response = await fetch(url);
  return parseJsonResponse<PaginatedResponse<LatestRun>>(response);
}

export async function getRunStats(filters?: {
  q?: string;
  status?: string;
}): Promise<RunStats> {
  const searchParams = new URLSearchParams();

  if (filters?.q) {
    searchParams.set("q", filters.q);
  }

  if (filters?.status && filters?.status !== "All") {
    searchParams.set("status", filters?.status);
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/runs/stats?${queryString}`
    : "/api/runs/stats";

  const response = await fetch(url);
  return parseJsonResponse<RunStats>(response);
}

export async function getRunDetail(id: string): Promise<LatestRun> {
  const response = await fetch(`/api/runs/${id}`);
  return parseJsonResponse<LatestRun>(response);
}

export async function deleteRun(id: string): Promise<void> {
  const response = await fetch(`/api/runs/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await parseJsonResponse<ApiErrorResponse>(response).catch(
      (err) => err,
    );
  }
}

export async function clearRecentRuns(): Promise<void> {
  const response = await fetch("/api/runs", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await parseJsonResponse<ApiErrorResponse>(response).catch(
      (err) => err,
    );
  }
}

export async function updateEvidenceStatus(
  runId: string,
  evidenceId: string,
  status: EvidenceStatus,
): Promise<RunEvidence> {
  const response = await fetch(`/api/runs/${runId}/evidence/${evidenceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return parseJsonResponse<RunEvidence>(response);
}

export async function generateReport(runId: string): Promise<AIReport> {
  const response = await fetch(`/api/runs/${runId}/report`, {
    method: "POST",
  });

  return parseJsonResponse<AIReport>(response);
}
