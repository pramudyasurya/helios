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

const PRESET_URLS = [
  "https://example.com",
  "https://httpbin.org/html",
];

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
    <section className="rounded-xl border border-border/80 bg-panel/90 p-5 shadow-sm">
      <form aria-label="Create browser run" onSubmit={handleFormSubmit}>
        <div className="flex items-center justify-between">
          <label
            htmlFor="url-target"
            className="text-sm font-semibold text-foreground flex items-center gap-2"
          >
            <span>Starting URL</span>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted">
              Alt + R
            </kbd>
          </label>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
            <span>Presets:</span>
            {PRESET_URLS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setUrl(preset)}
                disabled={isDisabled}
                className="rounded border border-border/60 bg-card px-2 py-0.5 text-[11px] text-muted hover:text-foreground hover:border-border transition disabled:opacity-50"
              >
                {preset.replace("https://", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            name="url"
            id="url-target"
            ref={urlInputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-accent focus:ring-1 focus:ring-accent"
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
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background sm:w-auto disabled:cursor-not-allowed disabled:opacity-70 transition hover:opacity-95 active:scale-[0.99] shadow-sm"
            type="submit"
            disabled={isDisabled}
          >
            {isDisabled ? "Running QA Check..." : "Run QA Check"}
          </button>
        </div>

        <RunOptionsPicker onChange={setRunConfig} isDisabled={isDisabled} />

        <p id="run-form-description" className="mt-3 text-xs text-muted">
          Launches a Playwright browser check capturing screenshots, network egress, console logs, and QA metrics.
        </p>
      </form>

      {error ? (
        <div
          id="run-form-error"
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3.5"
        >
          <p className="text-sm font-semibold text-danger">Run failed</p>
          <p className="mt-0.5 text-xs text-muted">{error}</p>
        </div>
      ) : null}
    </section>
  );
}
