import type { RunEvidence } from "@/lib/shared/domain/types";
import { EvidenceItem } from "@/app/runs/[id]/_components/evidence/evidence-item";

type EvidenceSectionProps = {
  title: string;
  items: RunEvidence[];
  totalCount: number;
  copiedEvidence: string | null;
  onCopyEvidence: (value: string) => void;
  onSelectEvidence: (evidence: RunEvidence) => void;
  highlightedEvidenceId?: string | null;
};

export function EvidenceSection({
  title,
  items,
  totalCount,
  copiedEvidence,
  onCopyEvidence,
  onSelectEvidence,
  highlightedEvidenceId,
}: EvidenceSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted">
        {title} - showing {items.length} of {totalCount}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((evidence) => (
          <li
            key={evidence.id}
            id={`evidence-item-${evidence.id}`}
            className={`rounded-xs border border-border bg-card p-3 text-xs text-muted transition-all duration-1000 ${
              highlightedEvidenceId === evidence.id
                ? "ring-2 ring-accent/40 bg-accent/5"
                : "ring-0 ring-transparent"
            }`}
          >
            <EvidenceItem
              evidence={evidence}
              isCopied={copiedEvidence === evidence.content}
              onCopy={onCopyEvidence}
              onSelect={onSelectEvidence}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
