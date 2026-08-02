"use client";

import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();

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
              <p className="text-xs text-muted">Web QA Dashboard</p>
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-xs font-medium border-l border-border pl-6">
            <Link
              href={HELIOS_ROUTES.dashboard}
              className={`transition ${
                pathname === "/"
                  ? "text-amber-400 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href={HELIOS_ROUTES.evidence()}
              className={`transition ${
                pathname.startsWith("/evidence")
                  ? "text-amber-400 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Evidence Board
            </Link>
            <Link
              href={HELIOS_ROUTES.projects()}
              className={`transition ${
                pathname.startsWith("/projects")
                  ? "text-amber-400 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Projects
            </Link>
          </nav>
        </div>

        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
          Local prototype
        </span>
      </div>
    </header>
  );
}
