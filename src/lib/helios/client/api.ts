import type { CreateRunResponse, LatestRun } from "@/lib/helios/shared/types";

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

export async function getRecentRuns(): Promise<LatestRun[]> {
  const response = await fetch("/api/runs");
  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result as LatestRun[];
}

export async function getRunDetail(id: string): Promise<LatestRun> {
  const response = await fetch(`/api/runs/${id}`);
  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result as LatestRun;
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
