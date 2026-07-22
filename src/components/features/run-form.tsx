import { useState, type RefObject } from "react";
import {
  RunOptionsPicker,
  type RunConfig,
} from "@/app/_components/run-options-picker";

type RunFormProps = {
  onSubmit: (url: string, config: RunConfig) => void;
  isDisabled?: boolean;
  error?: string;
  urlInputRef?: RefObject<HTMLInputElement | null>;
};

export function RunForm({
  onSubmit,
  isDisabled = false,
  error,
  urlInputRef,
}: RunFormProps) {
  const [url, setUrl] = useState("");
  const [runConfig, setRunConfig] = useState<RunConfig>({ mode: "single" });

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), runConfig);
  };

  return (
    <section className="mt-10 rounded-lg border border-border bg-panel p-5">
      <form aria-label="Create browser run" onSubmit={handleFormSubmit}>
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
            ref={urlInputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:ring-1 focus:ring-accent"
            placeholder="https://example.com"
            disabled={isDisabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? "run-form-description run-form-error"
                : "run-form-description"
            }
            aria-keyshortcuts="Alt+R"
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

        <RunOptionsPicker onChange={setRunConfig} isDisabled={isDisabled} />

        <p id="run-form-description" className="mt-3 text-xs text-muted">
          Runs a real browser QA check with screenshots, console errors, and
          network request evidence. Press Alt + R to focus URL.
        </p>
      </form>

      {error ? (
        <div
          id="run-form-error"
          role="alert"
          className="mt-4 rounded-md border border-danger bg-card p-3"
        >
          <p className="text-sm font-medium text-danger">Run failed</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      ) : null}
    </section>
  );
}
