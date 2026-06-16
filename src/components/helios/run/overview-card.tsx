type OverviewCardProps = {
  title: string;
  description: string;
};

export function OverviewCard({ title, description }: OverviewCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
