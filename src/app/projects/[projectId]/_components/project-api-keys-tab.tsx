"use client";

import { useEffect, useState, useCallback } from "react";
import { Key, Plus, Trash2, Copy, Check, AlertCircle, Terminal } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ProjectApiKeysTabProps {
  projectId: string;
  projectSlug?: string;
}

export function ProjectApiKeysTab({ projectId }: ProjectApiKeysTabProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New key creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  // Created key display modal/card
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/api-keys`);
      if (!res.ok) throw new Error("Failed to load API keys.");
      const data = await res.json();
      setKeys(data.apiKeys || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/api-keys`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load API keys.");
        return res.json();
      })
      .then((data) => {
        if (active) setKeys(data.apiKeys || []);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load API keys.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays: Number(expiresInDays) || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create API key.");
      }

      const data = await res.json();
      setGeneratedRawKey(data.rawKey);
      setNewKeyName("");
      setIsCreating(false);
      fetchKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create API key.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm("Are you sure you want to revoke this API key? Pipelines using it will fail.")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke API key.");
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to revoke API key.");
    }
  }

  async function copyKeyToClipboard() {
    if (!generatedRawKey) return;
    try {
      await navigator.clipboard.writeText(generatedRawKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-xs border border-border/80 bg-panel shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-accent" />
            <h3 className="text-base font-bold text-foreground">CI/CD API Keys</h3>
          </div>
          <p className="text-xs text-muted mt-1">
            Generate scoped API keys to trigger and gate QA runs directly from GitHub Actions, GitLab CI, or custom webhooks.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold rounded-xs bg-accent text-accent-foreground hover:bg-accent/90 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Generate New Key</span>
          </button>
        )}
      </div>

      {/* Generated Key Alert Banner */}
      {generatedRawKey && (
        <div className="p-4 rounded-xs border border-success/40 bg-success/10 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-success uppercase tracking-wider">
                API Key Generated Successfully
              </span>
              <p className="text-xs text-foreground">
                Copy this key now. For security, it will never be displayed again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeneratedRawKey(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              Dismiss
            </button>
          </div>

          <div className="flex items-center space-x-2 bg-background/80 p-2 rounded-xs border border-border">
            <code className="text-xs font-mono text-accent flex-1 select-all break-all">
              {generatedRawKey}
            </code>
            <button
              type="button"
              onClick={copyKeyToClipboard}
              aria-label="Copy API Key"
              className="p-1.5 rounded-xs bg-panel hover:bg-card border border-border text-foreground transition-colors"
            >
              {copiedKey ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Creation Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateKey}
          className="p-5 rounded-xs border border-accent/40 bg-card space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h4 className="text-sm font-semibold text-foreground">Generate New API Key</h4>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="key-name-input" className="text-xs font-medium text-foreground">
                Key Label / Name
              </label>
              <input
                id="key-name-input"
                type="text"
                placeholder="e.g. GitHub Actions - Staging Gate"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-panel border border-border rounded-xs text-foreground focus:outline-hidden focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="key-expires-input" className="text-xs font-medium text-foreground">
                Expiration
              </label>
              <select
                id="key-expires-input"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-panel border border-border rounded-xs text-foreground focus:outline-hidden focus:border-accent"
              >
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={365}>1 Year</option>
                <option value={0}>Never Expire</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs rounded-xs border border-border text-muted hover:text-foreground hover:bg-panel transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newKeyName.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-xs bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Generating..." : "Generate Key"}
            </button>
          </div>
        </form>
      )}

      {/* Keys List */}
      <div className="rounded-xs border border-border/80 bg-panel overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-border/80 bg-card/60 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Active Project Keys ({keys.length})
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading API keys...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-danger flex items-center justify-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Key className="h-8 w-8 text-muted/40 mx-auto" />
            <p className="text-xs text-muted">No API keys generated for this project yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {keys.map((k) => (
              <div
                key={k.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-card/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-foreground">{k.name}</span>
                    <code className="text-xs px-2 py-0.5 rounded-xs bg-background text-muted font-mono border border-border/60">
                      {k.keyPrefix}...
                    </code>
                  </div>
                  <div className="text-[11px] text-muted flex items-center space-x-3">
                    <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>
                      {k.lastUsedAt
                        ? `Last used: ${new Date(k.lastUsedAt).toLocaleDateString()}`
                        : "Never used"}
                    </span>
                    {k.expiresAt && (
                      <>
                        <span>•</span>
                        <span>Expires: {new Date(k.expiresAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(k.id)}
                    aria-label={`Revoke API key ${k.name}`}
                    className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-xs border border-transparent hover:border-danger/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CI/CD Quickstart Snippet */}
      <div className="p-5 rounded-xs border border-border/80 bg-panel space-y-3 shadow-xs">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-accent" />
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            CI/CD Pipeline Integration (GitHub Actions)
          </h4>
        </div>
        <p className="text-xs text-muted">
          Add <code className="text-accent font-mono">HELIOS_API_KEY</code> to your repository secrets and trigger runs via cURL or the Helios trigger script:
        </p>

        <pre className="p-3 rounded-xs bg-background/90 border border-border text-[11px] font-mono text-foreground overflow-x-auto">
{`# .github/workflows/helios-qa.yml
- name: Trigger Helios QA Run
  env:
    HELIOS_API_KEY: \${{ secrets.HELIOS_API_KEY }}
  run: |
    curl -X POST https://helios.internal/api/ci/trigger \\
      -H "Authorization: Bearer $HELIOS_API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"environment": "staging", "waitForCompletion": true}'`}
        </pre>
      </div>
    </div>
  );
}
