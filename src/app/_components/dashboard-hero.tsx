export function DashboardHero() {
  const heroPills = ["Single-page QA", "Replayable Trail", "Evidence-first"];
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-medium text-accent">
        QA observability prototype
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Run evidence-backed QA checks
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Submit a URL to inspect browser trails, screenshots, logs, and QA
        findings.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {heroPills.map((pill) => (
          <span
            key={pill}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted"
          >
            {pill}
          </span>
        ))}
      </div>
    </header>
  );
}
