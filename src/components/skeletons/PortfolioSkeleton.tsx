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
    <div className="terminal-card p-4 pl-5">
      {/* Accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-muted rounded-l-lg" />

      <div className="pl-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-5 w-24 ml-auto" />
            <Skeleton className="h-5 w-20 ml-auto" />
          </div>
        </div>

        {/* Data grid */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-2 w-12 mx-auto" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
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
          <div className="flex items-center gap-3">
            <Skeleton className="w-1 h-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-6 w-28 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>

        {/* Stats bar */}
        <div className="terminal-card p-3">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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

