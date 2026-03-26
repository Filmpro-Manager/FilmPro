export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b p-4 flex gap-2">
          <div className="h-8 w-28 rounded-md bg-muted" />
          <div className="h-8 w-28 rounded-md bg-muted" />
          <div className="h-8 w-28 rounded-md bg-muted" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
