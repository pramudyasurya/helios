"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import type { LatestRun } from "@/lib/shared/domain/types";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import { createRun } from "@/lib/client/api";
import { getRunErrorMessage } from "@/lib/shared/domain/errors";

export interface RerunButtonProps {
  run: LatestRun;
  className?: string;
}

export function RerunButton({ run, className }: RerunButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRerun = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        url: run.startingUrl,
        mode: run.mode,
        maxDepth: run.maxDepth,
        maxPages: run.maxPages,
        projectId: run.projectId,
        environmentId: run.environmentId,
        origin: "manual" as const,
      };

      const newRun = await createRun(payload);
      router.push(HELIOS_ROUTES.runDetail(newRun.id));
    } catch (err) {
      console.error("[Rerun Error]:", err);
      const message = getRunErrorMessage(err);
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleRerun}
        disabled={submitting}
        title="Re-run this QA check"
        aria-label="Re-run QA check"
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        }
      >
        {submitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{submitting ? "Re-running..." : "Re-run"}</span>
      </button>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-full left-0 mt-1.5 z-50 whitespace-nowrap rounded-xs border border-danger/40 bg-card px-2.5 py-1 text-[11px] text-danger shadow-md"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
