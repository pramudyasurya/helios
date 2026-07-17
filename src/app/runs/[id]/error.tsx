"use client";

import { AppHeader } from "@/components/shared/app-header";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <div className="py-10 px-6 mx-auto max-w-5xl">
        <div className="mt-6 flex flex-col items-center  justify-center rounded-lg border border-dashed border-border py-16 text-center px-4">
          <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
          <h2 className="text-lg font-medium text-foreground">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            We encountered an unexpected error while loading the run details.
          </p>
          <button
            onClick={() => reset()}
            className="mt-8 px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-md hover:bg-accent/90 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
