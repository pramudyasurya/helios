"use client";

import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname() || "/";

  const isDashboard = pathname === "/";
  const isEvidence = pathname.startsWith("/evidence");
  const isProjects = pathname.startsWith("/projects");

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link
            href={HELIOS_ROUTES.dashboard}
            className="flex items-center gap-3 hover:opacity-90 transition"
          >
            <Image
              src="/brand/helios-logo.png"
              alt="Helios logo"
              className="rounded-md"
              width={32}
              height={32}
              loading="eager"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Helios</p>
              <p className="text-xs text-muted font-mono">QA Observability</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-xs font-medium border-l border-border pl-5">
            <Link
              href={HELIOS_ROUTES.dashboard}
              aria-current={isDashboard ? "page" : undefined}
              className={`px-2.5 py-1 rounded-md transition ${
                isDashboard
                  ? "text-amber-400 bg-amber-500/10 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href={HELIOS_ROUTES.evidence()}
              aria-current={isEvidence ? "page" : undefined}
              className={`px-2.5 py-1 rounded-md transition ${
                isEvidence
                  ? "text-amber-400 bg-amber-500/10 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Evidence Board
            </Link>
            <Link
              href={HELIOS_ROUTES.projects()}
              aria-current={isProjects ? "page" : undefined}
              className={`px-2.5 py-1 rounded-md transition ${
                isProjects
                  ? "text-amber-400 bg-amber-500/10 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Projects
            </Link>
          </nav>
        </div>

        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-mono text-muted">
          Local prototype
        </span>
      </div>
    </header>
  );
}
