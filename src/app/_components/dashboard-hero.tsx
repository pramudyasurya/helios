export function DashboardHero() {
  const heroPills = ["Single-Page QA", "Multi-Route Crawl", "Replayable Evidence"];
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
          QA Observability Platform
        </span>
        {heroPills.map((pill) => (
          <span
            key={pill}
            className="rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-xs text-muted backdrop-blur-sm"
          >
            {pill}
          </span>
        ))}
      </div>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
        Run Evidence-Backed QA Checks
      </h1>
      <p className="mt-1 text-sm text-muted max-w-xl">
        Inspect live Playwright browser runs, network failures, console stack traces, and screenshots in real time.
      </p>
    </header>
  );
}
