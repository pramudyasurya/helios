"use client";

import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Loader2,
  Search,
  Cpu,
  FileText,
} from "lucide-react";
import type { AIReport, AIRiskLevel } from "@/lib/shared/domain/types";
import { getErrorMessage } from "@/lib/shared/domain/errors";
import { generateReport } from "@/lib/client/api";

type AIReportPanelProps = {
  runId: string;
  initialReport?: AIReport;
};

const riskConfig: Record<
  AIRiskLevel,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: typeof CheckCircle;
  }
> = {
  low: {
    label: "Low Risk",
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
    icon: CheckCircle,
  },
  medium: {
    label: "Medium Risk",
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/20",
    icon: AlertTriangle,
  },
  high: {
    label: "High Risk",
    bg: "bg-danger/10",
    text: "text-danger",
    border: "border-danger/20",
    icon: ShieldAlert,
  },
};

const severityColors: Record<AIRiskLevel, string> = {
  low: "border-l-success bg-success/5",
  medium: "border-l-accent bg-accent/5",
  high: "border-l-danger bg-danger/5",
};

/**
 * Staged progress steps shown during AI generation.
 * The stages advance on a timer — stages 1 and 3 are near-instant in the
 * real pipeline, so we pace the animation to match the ~30-60s LLM call.
 */
const PROGRESS_STEPS = [
  { id: 0, label: "Analyzing run data", icon: Search, duration: 2000 },
  { id: 1, label: "Querying AI model", icon: Cpu, duration: 50000 },
  { id: 2, label: "Generating report", icon: FileText, duration: 8000 },
] as const;

export function AIReportPanel({ runId, initialReport }: AIReportPanelProps) {
  const [report, setReport] = useState<AIReport | undefined>(initialReport);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef<number>(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Elapsed timer — ticks every 1s during generation
  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = undefined;
    }
    return () => clearInterval(elapsedTimerRef.current);
  }, [isLoading]);

  // Progress step advancement — walks through staged steps on a timer
  useEffect(() => {
    if (!isLoading) {
      setProgressStep(0);
      return;
    }

    setProgressStep(0);
    let currentStep = 0;

    const advanceStep = () => {
      if (currentStep < PROGRESS_STEPS.length - 1) {
        currentStep++;
        setProgressStep(currentStep);
        stepTimerRef.current = setTimeout(
          advanceStep,
          PROGRESS_STEPS[currentStep].duration,
        );
      }
    };

    stepTimerRef.current = setTimeout(
      advanceStep,
      PROGRESS_STEPS[0].duration,
    );

    return () => clearTimeout(stepTimerRef.current);
  }, [isLoading]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const generatedReport = await generateReport(runId);
      setReport(generatedReport);
    } catch (error) {
      const isAbort =
        error instanceof DOMException && error.name === "AbortError";
      setError(
        isAbort
          ? "AI report generation timed out (120s). The report may still be generating on the server — try again in a moment to load the cached result."
          : getErrorMessage(
              error,
              "Failed to generate AI report. Please try again.",
            ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // --- Loading state: staged progress card ---
  if (isLoading) {
    const currentStepData = PROGRESS_STEPS[progressStep];
    const CurrentIcon = currentStepData.icon;
    return (
      <section
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label={`Generating AI report: ${currentStepData.label}`}
        className="space-y-5 rounded-xs border border-border bg-panel p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground">
                Generating AI Report
              </h2>
              <p className="text-xs text-muted">
                Evidence-grounded QA analysis in progress
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            {formatElapsed(elapsed)}
          </div>
        </div>

        {/* Stepper */}
        <div className="space-y-1">
          {PROGRESS_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isDone = idx < progressStep;
            const isActive = idx === progressStep;
            const isPending = idx > progressStep;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-xs px-3 py-2.5 transition-all ${
                  isActive
                    ? "bg-accent/5 border border-accent/20"
                    : "border border-transparent"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-all ${
                    isDone
                      ? "bg-success/10 text-success"
                      : isActive
                        ? "bg-accent/10 text-accent"
                        : "bg-card text-muted"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isPending
                      ? "text-muted"
                      : isActive
                        ? "text-foreground font-medium"
                        : "text-foreground/70"
                  }`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <span className="ml-auto flex gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
                      style={{ animationDelay: "200ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
                      style={{ animationDelay: "400ms" }}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Status line */}
        <p className="text-xs text-muted border-t border-border pt-3">
          {currentStepData.label}… This may take 30-60s depending on the model.
        </p>
      </section>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <section className="rounded-xs border border-border bg-panel p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-7 w-7 text-danger" />
        </div>
        <h2 className="mt-4 text-base font-medium text-foreground">
          Report Generation Failed
        </h2>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={handleGenerate}
          className="mt-5 inline-flex items-center gap-2 rounded-xs border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      </section>
    );
  }

  // --- Empty state (no report yet) ---
  if (!report) {
    return (
      <section className="rounded-xs border border-border bg-panel p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Sparkles className="h-7 w-7 text-accent" />
        </div>
        <h2 className="mt-4 text-base font-medium text-foreground">
          AI Report Analysis
        </h2>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">
          Generate an evidence-grounded QA analysis of this run using AI. The
          report includes a risk assessment, detailed findings linked to
          evidence, and suggested actions.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          className="mt-5 inline-flex items-center gap-2 rounded-xs border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
        >
          <Brain className="h-4 w-4" />
          Generate AI Report
        </button>
      </section>
    );
  }

  // --- Report loaded ---
  const risk = riskConfig[report.riskLevel] || riskConfig.low;
  const RiskIcon = risk.icon;

  return (
    <div className="space-y-6">
      <section className="rounded-xs border border-border bg-panel p-5 relative overflow-hidden">
        <div className="absolute top-5 right-5">
          <button
            type="button"
            onClick={handleGenerate}
            title="Re-generate Report"
            className="rounded-full border border-border p-1.5 text-muted transition hover:text-foreground hover:bg-card"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
            <Brain className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-medium text-foreground">
              AI Report Analysis
            </h2>
            <p className="text-xs text-muted">Evidence-grounded QA summary</p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-4">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${risk.bg} ${risk.text} ${risk.border} shrink-0`}
          >
            <RiskIcon className="h-3.5 w-3.5" />
            {risk.label}
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {report.summary}
          </p>
        </div>
      </section>

      {/* AI Thinking — collapsible reasoning display */}
      {report.reasoningContent && (
        <details className="group rounded-xs border border-border bg-panel">
          <summary className="flex cursor-pointer items-center gap-2.5 px-5 py-3 text-sm font-medium text-foreground select-none">
            <Brain className="h-4 w-4 text-accent shrink-0" />
            AI Thinking
            <ChevronDown className="h-4 w-4 text-muted ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-5 py-4">
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted font-mono">
              {report.reasoningContent}
            </pre>
          </div>
        </details>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Detailed Findings ({report.findings.length})
        </h3>

        {report.findings.length === 0 ? (
          <div className="rounded-xs border border-border bg-panel p-5 text-center text-sm text-muted">
            No specific issues were identified in this report.
          </div>
        ) : (
          <ul role="list" className="space-y-3">
            {report.findings.map((finding, idx) => {
              const borderCol =
                severityColors[finding.severity] || severityColors.low;
              return (
                <li
                  key={`${finding.title}-${idx}`}
                  className={`rounded-xs border border-border border-l-4 ${borderCol} p-4 transition-all hover:bg-card/40`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium text-foreground">
                      {finding.title}
                    </h4>
                    <span className="text-[10px] uppercase tracking-wider font-semibold rounded-full border px-2 py-0.5 border-border bg-card text-muted">
                      {finding.severity}
                    </span>
                  </div>

                  {finding.suggestedFix && (
                    <div className="mt-3 rounded-xs bg-panel border border-border p-3 text-xs">
                      <p className="font-semibold text-foreground">
                        Suggested Fix:
                      </p>
                      <p className="mt-1 text-muted leading-relaxed">
                        {finding.suggestedFix}
                      </p>
                    </div>
                  )}

                  {finding.evidenceIds.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-muted font-medium">
                        Evidence IDs:
                      </span>
                      {finding.evidenceIds.map((evId) => (
                        <code
                          key={evId}
                          className="rounded bg-card px-1.5 py-0.5 text-[9px] font-mono border border-border text-foreground"
                        >
                          {evId.substring(0, 8)}
                        </code>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xs border border-border bg-panel p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Suggested Actions
        </h3>
        <ul role="list" className="mt-3 space-y-2">
          {report.suggestedActions.map((action, idx) => (
            <li
              key={`action-${idx}`}
              className="flex items-start gap-2.5 text-sm text-foreground/80"
            >
              <ArrowRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
