export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="py-10 px-6 mx-auto max-w-5xl">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">Helios</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Observe browser runs with screenshots, evidence, and replayable
            trails.
          </p>
        </header>

        <section className="mt-10 rounded-lg border border-border bg-panel p-5">
          <form aria-label="Create browser run">
            <label
              htmlFor="url-target"
              className="text-sm font-medium text-foreground"
            >
              Starting URL
            </label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                id="url-target"
                className="flex-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                placeholder="https://example.com"
                required
              />
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background sm:w-auto"
                type="submit"
              >
                Run Agent
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-panel p-5">
          <header className="text-base font-medium flex items-center justify-between">
            <h2>Latest run</h2>
            <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
              Idle
            </span>
          </header>
          <div className="mt-4 text-sm text-muted">
            <p>No runs yet</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-md border border-border bg-background p-4">
              <h3 className="text-sm font-medium text-foreground">Evidence</h3>
              <p className="mt-2 text-sm text-muted">No evidence</p>
            </article>
            <article className="rounded-md border border-border bg-background p-4">
              <h3 className="text-sm font-medium text-foreground">Trail</h3>
              <p className="mt-2 text-sm text-muted">No steps</p>
            </article>
            <article className="rounded-md border border-border bg-background p-4">
              <h3 className="text-sm font-medium text-foreground">Artifacts</h3>
              <p className="mt-2 text-sm text-muted">No artifacts</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
