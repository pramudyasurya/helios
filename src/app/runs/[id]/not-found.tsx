import Link from "next/link";
import { SearchX } from "lucide-react";
import { HELIOS_ROUTES } from "@/lib/shared/domain/routes";
import { AppHeader } from "@/components/shared/app-header";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex min-h-[50vh] max-w-5xl flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-full bg-muted/50 p-4 mb-4">
          <SearchX className="h-8 w-8 text-muted" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-medium text-foreground mb-2">
          Run Not Found
        </h1>
        <p className="text-sm text-muted mb-6">
          This QA run no longer exists or might have been deleted.
        </p>
        <Link
          href={HELIOS_ROUTES.dashboard}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium transition hover:bg-foreground/90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
