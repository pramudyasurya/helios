import Image from "next/image";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/helios-logo.png"
            alt="Helios logo"
            className="rounded-md"
            width={32}
            height={32}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">Helios</p>
            <p className="text-xs text-muted">Web QA Dashboard</p>
          </div>
        </div>

        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
          Local prototype
        </span>
      </div>
    </header>
  );
}
