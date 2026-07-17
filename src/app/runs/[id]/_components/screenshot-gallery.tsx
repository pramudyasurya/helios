"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { LatestRun } from "@/lib/shared/domain/types";
import Image from "next/image";

type ScreenshotGalleryProps = {
  artifacts: LatestRun["artifacts"];
};

export function ScreenshotGallery({ artifacts }: ScreenshotGalleryProps) {
  const [zoomedScreenshot, setZoomedScreenshot] = useState<{
    src: string;
    alt: string;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!zoomedScreenshot) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomedScreenshot(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomedScreenshot]);

  if (!artifacts) return null;

  return (
    <div className="border-t border-border pt-6">
      <h3 className="mb-4 text-sm font-medium text-foreground">Screenshots</h3>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Desktop View</span>
          <div className="overflow-y-auto rounded-md border border-border bg-panel max-h-125">
            <button
              type="button"
              onClick={() =>
                setZoomedScreenshot({
                  src: artifacts.desktopScreenshot,
                  alt: "Desktop screenshot",
                  width: 1920,
                  height: 1080,
                })
              }
              className="block w-full cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <Image
                src={artifacts.desktopScreenshot}
                alt="Desktop screenshot"
                width={1920}
                height={1080}
                unoptimized
                className="w-full h-auto"
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Mobile View</span>
          <div className="overflow-y-auto rounded-md border border-border bg-panel max-h-125 lg:w-3/4 mx-auto">
            <button
              type="button"
              onClick={() =>
                setZoomedScreenshot({
                  src: artifacts.mobileScreenshot,
                  alt: "Mobile screenshot",
                  width: 390,
                  height: 844,
                })
              }
              className="block w-full cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <Image
                src={artifacts.mobileScreenshot}
                alt="Mobile screenshot"
                width={390}
                height={844}
                unoptimized
                className="w-full h-auto"
              />
            </button>
          </div>
        </div>
      </div>

      {zoomedScreenshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm md:p-8"
          onClick={() => setZoomedScreenshot(null)}
        >
          <button
            type="button"
            autoFocus
            className="absolute right-6 top-6 text-muted transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
            onClick={() => setZoomedScreenshot(null)}
          >
            <X className="w-8 h-8" />
            <span className="sr-only">Close</span>
          </button>

          <div
            className="relative h-full w-full max-w-6xl overflow-y-auto rounded-lg border border-border bg-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={zoomedScreenshot.src}
              alt={zoomedScreenshot.alt}
              width={zoomedScreenshot.width}
              height={zoomedScreenshot.height}
              unoptimized
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
