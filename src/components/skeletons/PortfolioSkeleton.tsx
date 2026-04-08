import { Skeleton } from "@/components/ui/skeleton";

export function PortfolioSummarySkeleton() {
  return (
    <div className="hero-card mx-4 p-6">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Main value */}
        <div className="mb-8">
          <Skeleton className="h-14 w-64" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HoldingCardSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm px-4 py-3">
      {/* Row 1: Name left, chevron right */}
      <div className="flex items-center justify-between gap-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
      </div>

      {/* Row 2: Details left, value & performance right */}
      <div className="flex items-end justify-between gap-3 mt-1">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-18" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-3 w-20 ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-3 w-14 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioSectionSkeleton() {
  return (
    <div className="mt-8">
      {/* Header */}
      <div className="px-5 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-2 w-16 mt-1" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>

        {/* Stats bar */}
        <div className="bg-card rounded-xl p-6 shadow-ambient">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-3 w-12 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="mx-4 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <HoldingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

