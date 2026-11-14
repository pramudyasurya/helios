"use client";

import { Plus, Trash2 } from "lucide-react";
import type { JourneyStep, JourneyAction } from "@/lib/shared/domain/journey";

const STEP_ACTIONS: { label: string; value: JourneyAction; needsValue: boolean; valuePlaceholder?: string }[] = [
  { label: "Wait For Selector", value: "waitForSelector", needsValue: false },
  { label: "Assert Visible", value: "assertVisible", needsValue: false },
  { label: "Assert Text", value: "assertText", needsValue: true, valuePlaceholder: "Expected text snippet" },
  { label: "Assert URL", value: "assertUrl", needsValue: true, valuePlaceholder: "Expected URL substring" },
  { label: "Click", value: "click", needsValue: false },
  { label: "Fill Input", value: "fill", needsValue: true, valuePlaceholder: "Text to type" },
  { label: "Select Option", value: "select", needsValue: true, valuePlaceholder: "Option value" },
  { label: "Press Key", value: "pressKey", needsValue: true, valuePlaceholder: "Enter, Tab, Escape..." },
  { label: "Navigate (Goto)", value: "goto", needsValue: false },
];

type JourneyStepBuilderProps = {
  steps: JourneyStep[];
  onChange: (steps: JourneyStep[]) => void;
  isDisabled?: boolean;
};

export function JourneyStepBuilder({
  steps,
  onChange,
  isDisabled = false,
}: JourneyStepBuilderProps) {
  function handleAddStep() {
    const nextId = String(Date.now());
    const newStep: JourneyStep = {
      id: nextId,
      action: "waitForSelector",
      selector: "body",
    };
    onChange([...steps, newStep]);
  }

  function handleRemoveStep(index: number) {
    const next = steps.filter((_, i) => i !== index);
    onChange(next);
  }

  function handleUpdateStep(index: number, updates: Partial<JourneyStep>) {
    const next = steps.map((s, i) => (i === index ? { ...s, ...updates } : s));
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <div className="rounded-xs border border-dashed border-border/80 p-4 text-center">
          <p className="text-xs text-muted">No steps configured yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const actionDef = STEP_ACTIONS.find((a) => a.value === step.action) ?? STEP_ACTIONS[0];
            return (
              <div
                key={step.id || idx}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xs border border-border/70 bg-background/90 p-2 text-xs"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-muted/20 font-mono text-[11px] font-bold text-muted">
                    {idx + 1}
                  </span>
                  <select
                    disabled={isDisabled}
                    value={step.action}
                    aria-label={`Step ${idx + 1} action`}
                    onChange={(e) =>
                      handleUpdateStep(idx, { action: e.target.value as JourneyAction })
                    }
                    className="h-7 rounded-xs border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-accent disabled:opacity-60 cursor-pointer"
                  >
                    {STEP_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    disabled={isDisabled}
                    aria-label={`Step ${idx + 1} selector`}
                    placeholder="Selector (e.g. #submit-btn, input[name='q'])"
                    value={step.selector ?? ""}
                    onChange={(e) => handleUpdateStep(idx, { selector: e.target.value })}
                    className="h-7 rounded-xs border border-border bg-background px-2 font-mono text-[11px] text-foreground placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
                  />

                  {actionDef.needsValue ? (
                    <input
                      type="text"
                      disabled={isDisabled}
                      aria-label={`Step ${idx + 1} value`}
                      placeholder={actionDef.valuePlaceholder ?? "Value"}
                      value={step.value ?? ""}
                      onChange={(e) => handleUpdateStep(idx, { value: e.target.value })}
                      className="h-7 rounded-xs border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
                    />
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>

                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleRemoveStep(idx)}
                  className="h-7 w-7 shrink-0 flex items-center justify-center rounded-xs text-muted hover:text-danger hover:bg-danger/10 transition disabled:opacity-40"
                  aria-label={`Remove step ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={isDisabled}
        onClick={handleAddStep}
        className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-card/80 transition active:scale-95 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Step
      </button>
    </div>
  );
}
