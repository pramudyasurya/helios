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
    <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Agent Summary</h2>
      </div>
      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {summary}
      </p>
    </div>
  );
}
