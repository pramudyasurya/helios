import React from "react";

type LiveStreamBadgeProps = {
  isStreaming: boolean;
};

export function LiveStreamBadge({ isStreaming }: LiveStreamBadgeProps) {
  if (!isStreaming) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xs border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      Live Stream
    </span>
  );
}
