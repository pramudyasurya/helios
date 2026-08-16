import { CalendarClock } from "lucide-react";

export function ScheduledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-xs border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      <CalendarClock className="h-3 w-3" aria-hidden="true" />
      <span>Scheduled</span>
    </span>
  );
}
