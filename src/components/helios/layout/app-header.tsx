import { HELIOS_ROUTES } from "@/lib/helios/shared/routes";
import Image from "next/image";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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
              className="text-muted hover:text-foreground transition"
            >
              Dashboard
            </Link>
            <Link
              href={HELIOS_ROUTES.evidence()}
              className="text-muted hover:text-foreground transition"
            >
              Evidence Board
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
