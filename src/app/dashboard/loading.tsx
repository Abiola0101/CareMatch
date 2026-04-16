export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <div className="h-9 w-56 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-36 animate-pulse rounded-lg border bg-muted/30" />
      </div>
      <div className="h-52 animate-pulse rounded-lg border bg-muted/30" />
    </div>
  );
}
