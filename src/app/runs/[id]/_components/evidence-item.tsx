import type { RunEvidence } from "@/lib/shared/domain/types";
import { ArrowUpRight } from "lucide-react";
import { STATUS_STYLES } from "@/lib/shared/domain/evidence-sections";

type EvidenceItemProps = {
  evidence: RunEvidence;
  isCopied: boolean;
  onCopy: (value: string) => void;
  onSelect: (evidence: RunEvidence) => void;
};

export function EvidenceItem({
  evidence,
  isCopied,
  onCopy,
  onSelect,
}: EvidenceItemProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <button
        type="button"
        onClick={() => onSelect(evidence)}
        className="group min-w-0 text-left break-all hover:text-foreground transition"
      >
        <span className="block break-all">{evidence.content}</span>
        <span className="mt-2 flex w-fit items-center gap-2 text-xs font-medium text-accent">
          <span className="flex items-center gap-1 transition-colors group-hover:underline">
            View details
            <ArrowUpRight
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold capitalize transition-all ${STATUS_STYLES[evidence.status]}`}
          >
            {evidence.status}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onCopy(evidence.content)}
        className="shrink-0 whitespace-nowrap self-start rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
      >
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
