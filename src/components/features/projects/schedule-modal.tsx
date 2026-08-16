import { useLayoutEffect, useRef, useState } from "react";

import { X, AlertCircle, Loader2, CalendarClock } from "lucide-react";
import { useModalFocus } from "@/lib/client/use-modal-focus";
import type { ProjectDetailDto, QaScheduleView } from "@/lib/client/api";
import {
  createSchedule,
  updateSchedule,
  type ScheduleInput,
} from "@/lib/client/api";
import {
  RunOptionsPicker,
  type RunConfig,
} from "@/components/features/run-options-picker";
import {
  SCHEDULE_PRESETS,
  isValidCron,
  scheduleNextRunAt,
} from "@/lib/shared/domain/cron";
import { resolveRelativeRoute } from "@/lib/shared/domain/validators";
import { formatTimestamp } from "@/lib/shared/domain/format";

type ScheduleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  project: ProjectDetailDto;
  schedule?: QaScheduleView | null;
};

const DEFAULT_CRON = SCHEDULE_PRESETS[1].cron; // every hour

export function ScheduleModal({
  isOpen,
  onClose,
  onSaved,
  project,
  schedule,
}: ScheduleModalProps) {
  const isEditing = Boolean(schedule);
  const [environmentId, setEnvironmentId] = useState(
    schedule?.environmentId ??
      project.environments.find((env) => env.baseUrl)?.id ??
      "",
  );
  const [cron, setCron] = useState(schedule?.cronExpression ?? DEFAULT_CRON);
  const [active, setActive] = useState(schedule?.active ?? true);
  const [runConfig, setRunConfig] = useState<RunConfig>({
    mode: schedule?.mode ?? "single",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocus(modalRef, isOpen, onClose);

  useLayoutEffect(() => {
    if (isOpen) {
      setEnvironmentId(
        schedule?.environmentId ??
          project.environments.find((env) => env.baseUrl)?.id ??
          "",
      );
      setCron(schedule?.cronExpression ?? DEFAULT_CRON);
      setActive(schedule?.active ?? true);
      setRunConfig({
        mode: schedule?.mode ?? "single",
        routes: schedule?.routes,
        maxPages: schedule?.maxPages ?? undefined,
        maxDepth: schedule?.maxDepth ?? undefined,
      });
      setError(null);
    }
  }, [isOpen, schedule, project.environments]);

  if (!isOpen) return null;

  const selectedEnvironment = project.environments.find(
    (env) => env.id === environmentId,
  );
  const previewRunAt =
    active && isValidCron(cron) && environmentId
      ? scheduleNextRunAt(cron, environmentId)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!environmentId) {
      setError("Select an environment to schedule against.");
      return;
    }
    if (!isValidCron(cron)) {
      setError("Invalid 5-field cron expression.");
      return;
    }

    const baseUrl = selectedEnvironment?.baseUrl;
    if (!baseUrl) {
      setError("The selected environment has no base URL configured.");
      return;
    }

    let routes: string[] = [];
    if (runConfig.mode === "manual") {
      const raw = runConfig.routes ?? [];
      routes = raw
        .map((route) => resolveRelativeRoute(route, baseUrl))
        .filter(Boolean);
      if (routes.length === 0) {
        setError("At least one route is required in manual mode.");
        return;
      }
    }

    const payload: ScheduleInput = {
      cronExpression: cron,
      mode: runConfig.mode,
      routes,
      maxPages: runConfig.mode === "crawl" ? runConfig.maxPages : undefined,
      maxDepth: runConfig.mode === "crawl" ? runConfig.maxDepth : undefined,
      active,
    };

    try {
      setIsSubmitting(true);
      setError(null);
      if (isEditing && schedule) {
        await updateSchedule(project.id, schedule.environmentId, schedule.id, payload);
      } else {
        await createSchedule(project.id, environmentId, payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to save schedule.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-panel border border-border/80 rounded-xs shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div>
            <h2
              id="schedule-modal-title"
              className="text-base font-bold text-foreground tracking-tight"
            >
              {isEditing ? "Edit Schedule" : "Add Schedule"}
            </h2>
            <p className="text-[11px] font-mono text-muted">
              Target:{" "}
              <span className="text-foreground">{project.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted hover:text-foreground p-1 rounded-xs transition-colors focus:outline-hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xs bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Environment selector */}
          <div>
            <label
              htmlFor="schedule-env-select"
              className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2"
            >
              Environment
            </label>
            <select
              id="schedule-env-select"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              disabled={isEditing}
              className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground focus:border-accent focus:outline-hidden text-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {project.environments.length === 0 && (
                <option value="">No environments configured</option>
              )}
              {project.environments.map((env) => (
                <option key={env.id} value={env.id} disabled={!env.baseUrl}>
                  {env.name}
                  {!env.baseUrl ? " (no base URL)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">
              Environments without a base URL cannot run scheduled checks.
            </p>
          </div>

          {/* Cadence presets + custom cron */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              Cadence
            </label>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setCron(preset.cron)}
                  className={`rounded-xs border px-2.5 py-1 text-xs transition cursor-pointer ${
                    cron === preset.cron
                      ? "border-foreground/50 bg-card text-foreground ring-1 ring-border/80"
                      : "border-border/50 text-muted hover:border-border hover:bg-card/60"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label
                htmlFor="schedule-cron-input"
                className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-2"
              >
                Custom Cron (5-field)
              </label>
              <input
                id="schedule-cron-input"
                type="text"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="0 * * * *"
                className="w-full px-3 py-2 bg-card border border-border rounded-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-hidden text-xs font-mono transition-all"
              />
              {!isValidCron(cron) && (
                <p className="mt-1 text-[11px] text-danger">
                  Invalid 5-field cron expression (minute hour day month weekday).
                </p>
              )}
            </div>

            {/* Live next-run preview */}
            <div className="mt-3 flex items-center gap-2 rounded-xs border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <CalendarClock className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-xs text-muted">
                Next run:{" "}
                <span className="font-mono text-foreground">
                  {previewRunAt ? formatTimestamp(previewRunAt) : "—"}
                </span>
              </span>
            </div>
          </div>

          {/* Run options */}
          <RunOptionsPicker
            onChange={setRunConfig}
            isDisabled={isSubmitting}
            defaultConfig={{
              mode: schedule?.mode ?? "single",
              routes: schedule?.routes,
              maxPages: schedule?.maxPages ?? undefined,
              maxDepth: schedule?.maxDepth ?? undefined,
            }}
          />

          {/* Active toggle */}
          <label className="flex items-center justify-between rounded-xs border border-border/70 bg-card/40 p-3 cursor-pointer">
            <span className="text-xs font-semibold text-foreground">
              Active
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((prev) => !prev)}
              disabled={isSubmitting}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                active ? "bg-accent/80" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-foreground transition-transform ${
                  active ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !environmentId}
              className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Schedule" : "Add Schedule"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
