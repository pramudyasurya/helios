"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, Bell, AlertCircle, Loader2 } from "lucide-react";
import { useModalFocus } from "@/lib/client/use-modal-focus";
import type { EnvironmentDto } from "@/lib/client/api";
import type {
  WebhookConfig,
  WebhookProvider,
  WebhookTrigger,
} from "@/lib/shared/domain/notifications";
import { isValidHttpUrl } from "@/lib/shared/domain/validators";

type WebhookSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (webhooks: WebhookConfig[]) => Promise<void>;
  environment: EnvironmentDto | null;
};

export function WebhookSettingsModal({
  isOpen,
  onClose,
  onSave,
  environment,
}: WebhookSettingsModalProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(
    environment?.webhooks ?? [],
  );
  const [prevEnvId, setPrevEnvId] = useState(environment?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New webhook draft form
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState<WebhookProvider>("discord");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [triggerOnFailure, setTriggerOnFailure] = useState(true);
  const [triggerOnEveryRun, setTriggerOnEveryRun] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (environment?.id !== prevEnvId) {
    setPrevEnvId(environment?.id);
    setWebhooks(environment?.webhooks ?? []);
    setShowAddForm(false);
    setError(null);
    setFormError(null);
  }

  const modalRef = useRef<HTMLDivElement>(null);
  useModalFocus(modalRef, isOpen, onClose);
  if (!isOpen || !environment) return null;

  function handleAddWebhook() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setFormError("Webhook URL is required.");
      return;
    }
    if (!isValidHttpUrl(trimmedUrl)) {
      setFormError("Please enter a valid HTTP/HTTPS URL.");
      return;
    }

    const triggers: WebhookTrigger[] = [];
    if (triggerOnFailure) triggers.push("on_failure");
    if (triggerOnEveryRun) triggers.push("on_every_run");

    if (triggers.length === 0) {
      setFormError("Select at least one event trigger.");
      return;
    }

    const newWebhook: WebhookConfig = {
      id: `wh_${Date.now()}`,
      provider,
      url: trimmedUrl,
      triggers,
      secret: provider === "generic" && secret.trim() ? secret.trim() : undefined,
      enabled: true,
    };

    setWebhooks([...webhooks, newWebhook]);
    setUrl("");
    setSecret("");
    setTriggerOnFailure(true);
    setTriggerOnEveryRun(false);
    setShowAddForm(false);
    setFormError(null);
  }

  function handleRemoveWebhook(id: string) {
    setWebhooks(webhooks.filter((w) => w.id !== id));
  }

  function handleToggleWebhook(id: string) {
    setWebhooks(
      webhooks.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
    );
  }

  async function handleSave() {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(webhooks);
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Failed to update webhooks.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Webhook alerting settings"
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-xs border border-border/70 bg-panel/90 p-5 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-muted hover:text-foreground hover:bg-card rounded-xs transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Webhook Alerting &mdash; {environment.name}
          </h3>
        </div>

        <p className="text-xs text-muted mb-4">
          Configure proactive outbound notifications to Discord, Slack, or generic HTTP endpoints when QA runs finish or fail.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xs border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            {webhooks.length === 0 ? (
              <div className="rounded-xs border border-dashed border-border/80 p-5 text-center">
                <p className="text-xs text-muted">No webhooks configured for this environment.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-xs border border-border/70 bg-card/40 p-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-xs">
                          {w.provider}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs ${
                            w.enabled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-muted/10 text-muted border border-border"
                          }`}
                        >
                          {w.enabled ? "Active" : "Disabled"}
                        </span>
                        <span className="text-[11px] text-muted">
                          [{w.triggers.join(", ")}]
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-muted text-[11px]">
                        {w.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleWebhook(w.id)}
                        className="px-2 py-1 text-[11px] font-medium rounded-xs border border-border bg-card text-foreground hover:bg-card/80 transition cursor-pointer"
                      >
                        {w.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWebhook(w.id)}
                        className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-xs transition cursor-pointer"
                        aria-label={`Remove webhook ${w.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card/80 transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Webhook
            </button>
          ) : (
            <div className="rounded-xs border border-border/80 bg-card/60 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Add New Webhook</h4>

              {formError && (
                <div className="flex items-center gap-2 text-[11px] text-danger">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="webhook-provider" className="block text-[11px] font-medium text-muted mb-1">
                    Provider
                  </label>
                  <select
                    id="webhook-provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as WebhookProvider)}
                    className="w-full h-8 rounded-xs border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="discord">Discord</option>
                    <option value="slack">Slack</option>
                    <option value="generic">Generic HTTP</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="webhook-url" className="block text-[11px] font-medium text-muted mb-1">
                    Webhook URL
                  </label>
                  <input
                    id="webhook-url"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full h-8 rounded-xs border border-border bg-background px-2.5 font-mono text-xs text-foreground placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {provider === "generic" && (
                <div>
                  <label htmlFor="webhook-secret" className="block text-[11px] font-medium text-muted mb-1">
                    Secret Key (Optional HMAC-SHA256 signature)
                  </label>
                  <input
                    id="webhook-secret"
                    type="text"
                    placeholder="Secret for X-Helios-Signature verification"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full h-8 rounded-xs border border-border bg-background px-2.5 font-mono text-xs text-foreground placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              <div>
                <span className="block text-[11px] font-medium text-muted mb-1.5">
                  Trigger Events
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerOnFailure}
                      onChange={(e) => setTriggerOnFailure(e.target.checked)}
                      className="rounded border-border"
                    />
                    On Run Failure
                  </label>
                  <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerOnEveryRun}
                      onChange={(e) => setTriggerOnEveryRun(e.target.checked)}
                      className="rounded border-border"
                    />
                    On Every Run
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 text-xs text-muted hover:text-foreground transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddWebhook}
                  className="px-3 py-1 text-xs font-semibold rounded-xs bg-accent text-background hover:bg-accent/90 transition cursor-pointer"
                >
                  Add Webhook
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xs bg-accent px-4 py-1.5 text-xs font-semibold text-background hover:bg-accent/90 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Webhooks
          </button>
        </div>
      </div>
    </div>
  );
}
