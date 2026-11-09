"use client";

import { useState, useRef, useEffect } from "react";
import { downloadRunJson, downloadRunHtml } from "@/lib/client/export";
import type { LatestRun } from "@/lib/shared/domain/types";

export function ExportRunButton({ run }: { run: LatestRun }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted transition hover:border-foreground/30 hover:text-foreground"
      >
        <span>Export</span>
        <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-44 rounded-md border border-border bg-panel p-1 shadow-lg shadow-black/40">
          <button
            type="button"
            onClick={() => {
              downloadRunJson(run);
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-muted hover:bg-card hover:text-foreground"
          >
            <span>JSON Payload</span>
          </button>
          <button
            type="button"
            onClick={() => {
              downloadRunHtml(run.id);
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-muted hover:bg-card hover:text-foreground"
          >
            <span>Standalone HTML</span>
          </button>
        </div>
      )}
    </div>
  );
}
