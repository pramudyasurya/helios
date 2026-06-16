type RunTrailStepInput = {
  label: string;
  detail: string;
  timestamp?: string;
};

export function getRunTimestamp(startedAt: Date, offsetMs: number) {
  return new Date(startedAt.getTime() + offsetMs).toISOString();
}

export function createTrailStep({
  label,
  detail,
  timestamp,
}: RunTrailStepInput) {
  return {
    label,
    detail,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}
