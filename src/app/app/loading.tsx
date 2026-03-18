export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        Preparing the workspace, current priorities, and sample deliverables.
      </div>
      <div className="skeleton h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-80 w-full" />
    </div>
  );
}
