export type RunStatus = "Idle" | "Queued";

export type LatestRun = {
  id: string;
  startingUrl: string;
  status: RunStatus;
  createdAt: string;
};
