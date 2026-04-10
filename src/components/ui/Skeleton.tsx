export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-white/8 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-k-card border border-k-border bg-k-surface p-5">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="rounded-k-card border border-k-border bg-k-surface p-5">
        <Skeleton className="mb-4 h-4 w-32" />
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}
