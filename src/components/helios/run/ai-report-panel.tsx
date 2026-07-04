"use client";

import { useState } from "react";
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { AIReport, AIRiskLevel } from "@/lib/helios/shared/types";
import { getErrorMessage } from "@/lib/helios/shared/errors";
import { generateReport } from "@/lib/helios/client/api";

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

export function AIReportPanel({ runId, initialReport }: AIReportPanelProps) {
  const [report, setReport] = useState<AIReport | undefined>(initialReport);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const generatedReport = await generateReport(runId);
      setReport(generatedReport);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Failed to generate AI report. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section
        role="status"
        aria-busy="true"
        aria-label="Loading AI report"
        className="space-y-6 rounded-lg border border-border bg-panel p-6 animate-pulse"
      >
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-accent animate-pulse" />
          <div className="h-5 w-48 bg-card rounded"></div>
        </div>
        <div className="h-24 bg-card rounded w-full"></div>
        <div className="space-y-4">
          <div className="h-5 w-32 bg-card rounded"></div>
          <div className="h-16 bg-card rounded w-full border-l-4 border-l-border"></div>
          <div className="h-16 bg-card rounded w-full border-l-4 border-l-border"></div>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="rounded-lg border border-border bg-panel p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Brain className="h-7 w-7 text-accent" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          AI-Powered QA Insights
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Let Helios AI analyze your console exceptions, failed network
          endpoints, and screenshots to compile a risk classification and action
          items.
        </p>
        {error && (
          <div
            role="alert"
            className="mx-auto mt-4 max-w-md rounded-md bg-danger/10 p-3 text-xs text-danger border border-danger/20"
          >
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-accent/90"
        >
          <Sparkles className="h-4 w-4" />
          Generate AI Report
        </button>
      </section>
    );
  }

  const risk = riskConfig[report.riskLevel] || riskConfig.low;
  const RiskIcon = risk.icon;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-panel p-5 relative overflow-hidden">
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

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Detailed Findings ({report.findings.length})
        </h3>

        {report.findings.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel p-5 text-center text-sm text-muted">
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
                  className={`rounded-lg border border-border border-l-4 ${borderCol} p-4 transition-all hover:bg-card/40`}
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
                    <div className="mt-3 rounded-md bg-panel border border-border p-3 text-xs">
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

      <section className="rounded-lg border border-border bg-panel p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Suggested Actions
        </h3>
        <ul role="list" className="mt-3 space-y-2">
          {report.suggestedActions.map((action, idx) => (
            <li
              key={`action-${idx}`}
              className="flex items-start gap-2.5 text-sm text-foreground/80"
            >
              <ArrowRight className="h-4 w-4 text-accent shrink-0 mt-0.5 animate-pulse" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
