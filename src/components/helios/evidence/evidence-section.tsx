import { EvidenceItem } from "@/components/helios/evidence/evidence-item";

type EvidenceSectionProps = {
  title: string;
  items: string[];
  totalCount: number;
  copiedEvidence: string | null;
  onCopyEvidence: (value: string) => void;
  itemKeyPrefix: string;
};

export function EvidenceSection({
  title,
  items,
  totalCount,
  copiedEvidence,
  onCopyEvidence,
  itemKeyPrefix,
}: EvidenceSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted">
        {title} - showing {items.length} of {totalCount}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${itemKeyPrefix}-${item}-${index}`}
            className="rounded-md border border-border bg-card p-3 text-xs text-muted"
          >
            <EvidenceItem
              value={item}
              isCopied={copiedEvidence === item}
              onCopy={onCopyEvidence}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
