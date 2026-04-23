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
    <div className="relative pt-[18px] px-[6px] pb-[6px]">
      <div className="relative bg-card rounded-[18px] overflow-hidden px-[18px] py-[16px] shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-muted/40" />
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <Skeleton className="h-3 w-12 flex-shrink-0" />
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-2 w-10" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="text-right space-y-1.5">
            <Skeleton className="h-2 w-8 ml-auto" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
        </div>
        <Skeleton className="mt-[10px] h-[3px] w-full rounded-full" />
        <Skeleton className="mt-[5px] h-2.5 w-24" />
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

