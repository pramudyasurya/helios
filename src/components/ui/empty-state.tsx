import type { ReactNode } from "react";
import { CircleDashed, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: ReactNode;
  icon?: LucideIcon;
};

export function EmptyState({
  title,
  description,
  icon: Icon = CircleDashed,
}: EmptyStateProps) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5 py-12 text-center px-4 transition-all hover:bg-muted/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/10 text-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>
    </div>
  );
}
