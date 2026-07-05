import type {
  CreateRunResponse,
  EvidenceStatus,
  LatestRun,
  PaginatedResponse,
  RunEvidence,
} from "@/lib/helios/shared/types";
import type { AIReport } from "@/lib/helios/shared/types";

export type ApiErrorResponse = {
  error: string;
  message: string;
};

export async function createRun(url: string): Promise<CreateRunResponse> {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const result = (await response.json()) as
    | CreateRunResponse
    | ApiErrorResponse;

  if (!response.ok) {
    throw result;
  }

  return result as CreateRunResponse;
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
  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result as PaginatedResponse<LatestRun>;
}

export async function getRunDetail(id: string): Promise<LatestRun> {
  const response = await fetch(`/api/runs/${id}`);
  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result as LatestRun;
}

export async function deleteRun(id: string): Promise<void> {
  const response = await fetch(`/api/runs/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const result = await response.json();
    throw result;
  }
}

export async function clearRecentRuns(): Promise<void> {
  const response = await fetch("/api/runs", {
    method: "DELETE",
  });

  if (!response.ok) {
    const result = await response.json();
    throw result;
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

  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result as RunEvidence;
}

export async function generateReport(runId: string): Promise<AIReport> {
  const response = await fetch(`/api/runs/${runId}/report`, {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result as AIReport;
}
