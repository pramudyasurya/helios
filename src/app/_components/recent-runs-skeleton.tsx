function RecentRunSkeletonRow() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-md bg-card p-3 sm:flex-row sm:items-center">
      <div className="h-5 w-20 rounded-full bg-panel" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-48 rounded bg-panel" />
        <div className="h-3 w-32 rounded bg-panel" />
      </div>
      <div className="h-3 w-28 rounded bg-panel" />
    </div>
  );
}

export function RecentRunsSkeleton() {
  return (
    <section
      className="mt-6 rounded-lg border border-border bg-panel p-5"
      aria-label="Loading recent runs"
      aria-busy="true"
    >
      <div className="h-5 w-28 animate-pulse rounded bg-card" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <RecentRunSkeletonRow key={index} />
        ))}
      </div>
    </section>
  );
}
