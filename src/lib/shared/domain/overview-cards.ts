import type { LatestRun, OverviewCardData } from "@/lib/shared/domain/types";

function getEvidenceCount(run: LatestRun) {
  return (
    (run.brokenImages?.length ?? 0) +
    (run.consoleErrors?.length ?? 0) +
    (run.failedRequests?.length ?? 0)
  );
}

function getArtifactCount(run: LatestRun) {
  if (!run.artifacts) return 0;

  return [
    run.artifacts.desktopScreenshot,
    run.artifacts.mobileScreenshot,
  ].filter(Boolean).length;
}

export function getOverviewCardDescription(
  run: LatestRun | null,
  card: OverviewCardData,
) {
  if (!run) return card.emptyText;

  if (run.status === "Completed" || run.status === "Failed") {
    return card.completedText;
  }

  return card.activeText;
}

export function getOverviewCards(run: LatestRun | null): OverviewCardData[] {
  if (!run) {
    return [
      {
        title: "Evidence",
        emptyText: "No evidence",
        activeText: "No evidence",
        completedText: "No evidence",
      },
      {
        title: "Trail",
        emptyText: "No trail",
        activeText: "No trail",
        completedText: "No trail",
      },
      {
        title: "Artifacts",
        emptyText: "No artifacts",
        activeText: "No artifacts",
        completedText: "No artifacts",
      },
      {
        title: "Findings",
        emptyText: "No findings",
        activeText: "No findings",
        completedText: "No findings",
      },
    ];
  }

  const evidenceCount = getEvidenceCount(run);
  const artifactCount = getArtifactCount(run);

  return [
    {
      title: "Evidence",
      emptyText: "No evidence",
      activeText: "Evidence pending",
      completedText: `${evidenceCount} evidence item(s) collected`,
    },
    {
      title: "Trail",
      emptyText: "No trail",
      activeText: `${run.trail.length} trail step(s) recorded`,
      completedText: `${run.trail.length} trail step(s) recorded`,
    },
    {
      title: "Artifacts",
      emptyText: "No artifacts",
      activeText: "Screenshot pending",
      completedText: `${artifactCount} artifact(s) captured`,
    },
    {
      title: "Findings",
      emptyText: "No findings",
      activeText: "QA checks pending",
      completedText: `${run.checks.length} check(s) generated`,
    },
  ];
}
