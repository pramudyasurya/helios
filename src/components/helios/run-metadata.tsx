import type { LatestRun } from "@/lib/helios/types";
import { formatTimestamp } from "@/lib/helios/format";

type RunMetadataProps = {
  run: LatestRun;
};

export function RunMetadata({ run }: RunMetadataProps) {
  return (
    <div className="text-sm grid gap-4 md:grid-cols-3">
      <div>
        <p className="text-sm text-muted">Run ID</p>
        <p className="text-foreground break-all">{run.id}</p>
      </div>

      <div>
        <p className="text-sm text-muted">Queued at</p>
        <p className="text-foreground break-all">
          {formatTimestamp(run.createdAt)}
        </p>
      </div>

      <div>
        <p className="text-sm text-muted">Starting URL</p>
        <p className="text-foreground break-all">{run.startingUrl}</p>
      </div>

      {run.finishedAt ? (
        <div>
          <p className="text-sm text-muted">Finished at</p>
          <p className="text-foreground break-all">
            {formatTimestamp(run.finishedAt)}
          </p>
        </div>
      ) : null}

      {run.durationMs !== undefined ? (
        <div>
          <p className="text-sm text-muted">Duration</p>
          <p className="text-foreground break-all">
            {(run.durationMs / 1000).toFixed(2)} s
          </p>
        </div>
      ) : null}

      <div className="md:col-span-3">
        <p className="text-sm text-muted">Summary</p>
        <p className="text-foreground break-all">{run.summary}</p>
      </div>
    </div>
  );
}
