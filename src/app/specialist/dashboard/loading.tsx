export default function SpecialistDashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <div className="h-10 w-64 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border bg-muted/30" />
    </main>
  );
}
