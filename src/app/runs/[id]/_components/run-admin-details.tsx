import type { LatestRun } from "@/lib/shared/domain/types";
import { formatTimestamp } from "@/lib/shared/domain/format";

type RunAdminDetailsProps = {
  run: LatestRun;
};

export function RunAdminDetails({ run }: RunAdminDetailsProps) {
  return (
    <div className="pt-6 border-t border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Administrative details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs">
        <div>
          <p className="text-muted mb-1">Run ID</p>
          <p className="text-foreground/80 font-mono break-all">{run.id}</p>
        </div>

        <div>
          <p className="text-muted mb-1">Created at</p>
          <p className="text-foreground/80 break-all">
            {formatTimestamp(run.createdAt)}
          </p>
        </div>

        {run.finishedAt && (
          <div>
            <p className="text-muted mb-1">Finished at</p>
            <p className="text-foreground/80 break-all">
              {formatTimestamp(run.finishedAt)}
            </p>
          </div>
        )}

        <div className="md:col-span-2 lg:col-span-3">
          <p className="text-muted mb-1">Starting URL</p>
          <a
            href={run.startingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline break-all"
          >
            {run.startingUrl}
          </a>
        </div>

        {run.finalUrl && run.finalUrl !== run.startingUrl && (
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-muted mb-1">Final URL</p>
            <a
              href={run.finalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline break-all"
            >
              {run.finalUrl}
            </a>
          </div>
        )}

        {run.title && (
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-muted mb-1">Page Title</p>
            <p className="text-foreground/80 break-all">{run.title}</p>
          </div>
        )}

        {run.description && (
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-muted mb-1">Meta Description</p>
            <p className="text-foreground/80 break-all">{run.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
