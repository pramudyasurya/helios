export function ProjectsHeader() {
  return (
    <header className="rounded-xs border border-border/80 bg-linear-to-r from-panel/90 via-panel/70 to-card/60 px-6 py-5 sm:py-6 shadow-xs">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
        Projects & Environments
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
        Organize browser QA checks under structured projects and target environments.
      </p>
    </header>
  );
}
