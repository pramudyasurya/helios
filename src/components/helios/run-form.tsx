type RunFormProps = {
  onSubmit: React.ComponentProps<"form">["onSubmit"];
  isDisabled?: boolean;
};

export function RunForm({ onSubmit, isDisabled = false }: RunFormProps) {
  return (
    <section className="mt-10 rounded-lg border border-border bg-panel p-5">
      <form aria-label="Create browser run" onSubmit={onSubmit}>
        <label
          htmlFor="url-target"
          className="text-sm font-medium text-foreground"
        >
          Starting URL
        </label>
        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            name="url"
            id="url-target"
            className="flex-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:ring-1 focus:ring-accent"
            placeholder="https://example.com"
            disabled={isDisabled}
            required
          />
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background sm:w-auto disabled:cursor-not-allowed disabled:opacity-70 transition hover:opacity-90"
            type="submit"
            disabled={isDisabled}
          >
            {isDisabled ? "Running QA Check..." : "Run QA Check"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Currently simulates a single-page QA run. Real browser automation is
          planned for the next milestone.
        </p>
      </form>
    </section>
  );
}
