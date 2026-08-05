import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type RunSummaryCardProps = {
  summary?: string;
};

export function RunSummaryCard({ summary }: RunSummaryCardProps) {
  if (!summary) {
    return (
      <div>
        <EmptyState
          title="No Agent Summary Available"
          description="The QA agent did not generate a summary for this run."
          icon={Sparkles}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xs border border-border/70 bg-card/40 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-muted/80" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Agent Summary
        </h3>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {summary}
      </p>
    </div>
  );
}
