"use client";

import { downloadRunJson } from "@/lib/helios/client/export";
import type { LatestRun } from "@/lib/helios/shared/types";

export function ExportRunButton({ run }: { run: LatestRun }) {
  return (
    <button
      type="button"
      onClick={() => downloadRunJson(run)}
      className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground"
    >
      Export JSON
    </button>
  );
}
