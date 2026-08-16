"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  CalendarClock,
  Clock,
  Play,
  Pause,
  Edit2,
  Trash2,
} from "lucide-react";
import type { ProjectDetailDto, QaScheduleView } from "@/lib/client/api";
import {
  listSchedules,
  updateSchedule,
  deleteSchedule,
} from "@/lib/client/api";
import { ScheduleModal } from "@/components/features/projects/schedule-modal";
import { DeleteConfirmationModal } from "@/components/features/projects/delete-confirmation-modal";
import { formatTimestamp } from "@/lib/shared/domain/format";

type ProjectSchedulesTabProps = {
  project: ProjectDetailDto;
};

type ScheduleWithEnvName = QaScheduleView & { environmentName: string };

export function ProjectSchedulesTab({ project }: ProjectSchedulesTabProps) {
  const [schedules, setSchedules] = useState<ScheduleWithEnvName[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<QaScheduleView | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<QaScheduleView | null>(null);

  const envNameById = new Map(
    project.environments.map((env) => [env.id, env.name]),
  );

  async function loadSchedules() {
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        project.environments.map((env) => listSchedules(project.id, env.id)),
      );
      const merged = results.flatMap((result) =>
        result.status === "fulfilled"
          ? result.value.map((schedule) => ({
              ...schedule,
              environmentName:
                envNameById.get(schedule.environmentId) ?? "Unknown",
            }))
          : [],
      );
      setSchedules(merged);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedules();
  }, [project.id, project.environments]);

  function openAddSchedule() {
    setScheduleToEdit(null);
    setIsModalOpen(true);
  }

  function openEditSchedule(schedule: QaScheduleView) {
    setScheduleToEdit(schedule);
    setIsModalOpen(true);
  }

  async function toggleActive(schedule: ScheduleWithEnvName) {
    try {
      await updateSchedule(project.id, schedule.environmentId, schedule.id, {
        active: !schedule.active,
      });
      await loadSchedules();
    } catch {
      await loadSchedules();
    }
  }

  async function handleConfirmDelete() {
    if (!scheduleToDelete) return;
    await deleteSchedule(project.id, scheduleToDelete.environmentId, scheduleToDelete.id);
    setScheduleToDelete(null);
    await loadSchedules();
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xs border border-border/80 bg-panel/90 p-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Schedules</h3>
          <p className="text-xs text-muted">
            Recurring QA runs fired automatically on a cron cadence.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddSchedule}
          disabled={project.environments.length === 0}
          className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Add Schedule</span>
        </button>
      </div>

      {/* Schedules Grid */}
      {loading ? (
        <div className="p-8 text-center bg-panel/40 border border-border/60 rounded-xs text-muted text-xs font-mono animate-pulse">
          Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-8 text-center bg-panel/40 border border-border/60 rounded-xs space-y-3">
          <CalendarClock className="h-10 w-10 text-muted/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">No Schedules Yet</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {project.environments.length > 0
              ? "Add a recurring schedule to run Playwright checks automatically."
              : "Add an environment first, then create a recurring schedule."}
          </p>
          {project.environments.length > 0 && (
            <button
              type="button"
              onClick={openAddSchedule}
              className="rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Schedule Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-xs border border-border/80 bg-panel/90 p-5 space-y-4 shadow-xs hover:bg-card/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xs bg-card border border-border/60 text-muted">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {schedule.environmentName}
                    </h4>
                    <p className="text-[11px] text-muted flex items-center space-x-1 mt-0.5 font-mono">
                      <Clock className="h-3 w-3 text-muted shrink-0" />
                      <span>
                        Next:{" "}
                        {schedule.nextRunAt
                          ? formatTimestamp(schedule.nextRunAt)
                          : "—"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(schedule)}
                    className="p-1.5 text-muted hover:text-foreground hover:bg-card rounded-xs transition-colors cursor-pointer"
                    title={schedule.active ? "Pause schedule" : "Resume schedule"}
                  >
                    {schedule.active ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditSchedule(schedule)}
                    className="p-1.5 text-muted hover:text-foreground hover:bg-card rounded-xs transition-colors cursor-pointer"
                    title="Edit schedule"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleToDelete(schedule)}
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-xs transition-colors cursor-pointer"
                    title="Delete schedule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                    Cron
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {schedule.cronExpression}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                    Last Fired
                  </span>
                  <span className="text-xs font-mono text-muted">
                    {schedule.lastFiredAt
                      ? formatTimestamp(schedule.lastFiredAt)
                      : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                    Mode
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {schedule.mode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                    State
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider ${
                      schedule.active
                        ? "border border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                        : "border border-border/60 text-muted bg-card/30"
                    }`}
                  >
                    {schedule.active ? "Active" : "Paused"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadSchedules}
        project={project}
        schedule={scheduleToEdit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(scheduleToDelete)}
        onClose={() => setScheduleToDelete(null)}
        onConfirm={handleConfirmDelete}
        targetName={scheduleToDelete ? envNameById.get(scheduleToDelete.environmentId) ?? scheduleToDelete.id : ""}
        resourceType="Schedule"
      />
    </div>
  );
}
