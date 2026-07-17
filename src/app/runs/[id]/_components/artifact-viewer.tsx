"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Artifacts = {
  desktopScreenshot?: string;
  mobileScreenshot?: string;
};

type ArtifactViewerProps = {
  artifacts: Artifacts;
};

type TabId = "desktop" | "mobile";

export function ArtifactViewer({ artifacts }: ArtifactViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("desktop");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const screenshotUrl =
    activeTab === "desktop"
      ? artifacts.desktopScreenshot
      : artifacts.mobileScreenshot;

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  if (!screenshotUrl) {
    return <p className="text-sm text-muted">No screenshot available.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["desktop", "mobile"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer transition " +
              (activeTab === tab
                ? "bg-accent text-background"
                : "bg-card text-muted hover:text-foreground")
            }
          >
            {tab === "desktop" ? "Desktop" : "Mobile"}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-card cursor-pointer hover:border-accent transition"
      >
        <Image
          src={screenshotUrl}
          alt={`${activeTab} screenshot`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 600px"
        />
      </button>

      {isModalOpen ? (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="absolute right-4 top-4 rounded-md border border-border px-3 py-1 text-sm text-foreground cursor-pointer hover:text-muted transition"
            aria-label="Close artifact preview"
          >
            Close
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-[85vh] w-full max-w-6xl"
          >
            <Image
              src={screenshotUrl}
              alt={`${activeTab} screenshot`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
