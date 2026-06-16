type EvidenceItemProps = {
  value: string;
  isCopied: boolean;
  onCopy: (value: string) => void;
};

export function EvidenceItem({ value, isCopied, onCopy }: EvidenceItemProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <span className="break-all">{value}</span>
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="shrink-0 whitespace-nowrap self-start rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
      >
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
