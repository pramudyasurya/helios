"use client";

import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileSearch, FolderGit2 } from "lucide-react";

export type AppShellProps = {
  children: React.ReactNode;
  activeTab?: string;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || "/";

  const isDashboard = pathname === "/";
  const isEvidence = pathname.startsWith("/evidence");
  const isProjects = pathname.startsWith("/projects");
  const pageTitle = isDashboard
    ? "Dashboard"
    : isEvidence
      ? "Evidence Board"
      : isProjects
        ? "Projects"
        : "Run Detail";

  const navItems = [
    {
      label: "Dashboard",
      href: HELIOS_ROUTES.dashboard,
      active: isDashboard,
      icon: LayoutDashboard,
    },
    {
      label: "Evidence Board",
      href: HELIOS_ROUTES.evidence(),
      active: isEvidence,
      icon: FileSearch,
    },
    {
      label: "Projects",
      href: HELIOS_ROUTES.projects(),
      active: isProjects,
      icon: FolderGit2,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Desktop Sidebar (lg screens) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/80 bg-panel/90 p-5 fixed inset-y-0 z-30 justify-between">
        <div className="space-y-6">
          <Link
            href={HELIOS_ROUTES.dashboard}
            className="flex items-center gap-3 hover:opacity-90 transition px-2"
          >
            <Image
              src="/brand/helios-logo.png"
              alt="Helios logo"
              className="rounded-xs"
              width={32}
              height={32}
              loading="eager"
            />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Helios</p>
              <p className="text-xs text-muted font-mono">QA Observability</p>
            </div>
          </Link>

          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xs text-xs font-medium transition ${
                    item.active
                      ? "bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20"
                      : "text-muted hover:text-foreground hover:bg-card/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.active ? "text-amber-400" : "text-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-border/60 px-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted">
            <span>Status</span>
            <span className="rounded-xs border border-border px-2 py-0.5 text-[10px] text-muted">
              Local prototype
            </span>
          </div>
        </div>
      </aside>

      {/* Compact Top Header (mobile / tablet < lg) */}
      <header className="lg:hidden sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={HELIOS_ROUTES.dashboard}
              className="flex items-center gap-2 hover:opacity-90 transition"
            >
              <Image
                src="/brand/helios-logo.png"
                alt="Helios logo"
                className="rounded-xs"
                width={28}
                height={28}
                loading="eager"
              />
              <span className="text-sm font-bold text-foreground">Helios</span>
            </Link>

            <nav className="flex items-center gap-1.5 text-xs font-medium border-l border-border pl-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`px-2 py-1 rounded-xs transition text-[11px] ${
                    item.active
                      ? "text-amber-400 bg-amber-500/10 font-semibold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <span className="hidden sm:inline-block rounded-xs border border-border px-2 py-0.5 text-[10px] font-mono text-muted">
            Prototype
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 w-full min-w-0 flex flex-col">
        {/* Flat Desktop Utility Bar (lg screens) */}
        <div className="hidden lg:flex items-center justify-between px-6 py-2.5 border-b border-border/80 bg-background/80 backdrop-blur-xs text-xs font-mono text-muted">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-semibold">Helios</span>
            <span className="text-muted/40">/</span>
            <span className="text-amber-400 font-medium">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted font-mono">
                Alt + R
              </kbd>
              <span>Run Check</span>
            </span>
            <span className="text-muted/40">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted font-mono">
                Alt + S
              </kbd>
              <span>Search Runs</span>
            </span>
          </div>
        </div>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
