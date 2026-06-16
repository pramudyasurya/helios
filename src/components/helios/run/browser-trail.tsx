import type { TrailStep } from "@/lib/helios/shared/types";
import { formatTimestamp } from "@/lib/helios/shared/format";

type BrowserTrailProps = {
  trail: TrailStep[];
};

export function BrowserTrail({ trail }: BrowserTrailProps) {
  if (trail.length === 0) return null;
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-foreground">Browser trail</h3>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border bg-card p-3">
        <ol className="space-y-3 text-sm">
          {trail.map((step, index) => (
            <li
              key={`${step.label}-${index}`}
              className="border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-foreground">{step.label}</p>
                <time className="text-xs text-muted" dateTime={step.timestamp}>
                  {formatTimestamp(step.timestamp)}
                </time>
              </div>
              <p className="text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
