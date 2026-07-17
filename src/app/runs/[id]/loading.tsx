import { AppHeader } from "@/components/shared/app-header";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-card ${className}`} />;
}

const tabSkeletonWidths = ["w-24", "w-24", "w-28", "w-28", "w-20"];

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <div className="py-10 px-6 mx-auto max-w-5xl">
        <div
          className="space-y-6"
          aria-label="Loading run details"
          aria-busy="true"
        >
          <SkeletonBlock className="h-20 w-full" />
          <div className="rounded-lg border border-border bg-panel p-5">
            <div className="mb-5 flex gap-2 overflow-hidden">
              {tabSkeletonWidths.map((width, index) => (
                <SkeletonBlock
                  key={index}
                  className={`h-9 ${width} rounded-full`}
                />
              ))}
            </div>
            <SkeletonBlock className="h-10 w-64" />
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-24" />
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <SkeletonBlock className="aspect-video" />
              <SkeletonBlock className="aspect-video" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
