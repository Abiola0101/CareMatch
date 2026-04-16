export default function CaseDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-48 animate-pulse rounded-xl border bg-muted/40" />
      <div className="mb-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
      <h2 className="mb-2 text-xl font-semibold">Match results</h2>
      <p className="mb-6 text-sm font-medium text-foreground">
        Finding the best specialists for your case...
      </p>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
