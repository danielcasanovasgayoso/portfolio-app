import { Skeleton } from "@/components/ui/skeleton";

export function PortfolioSummarySkeleton() {
  return (
    <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8 h-full">
      {/* Header: label + chevron */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>

      {/* Main value */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-10 sm:h-12 md:h-14 w-56" />
      </div>

      {/* Invested / gain columns mirroring the live card layout */}
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="min-w-0 space-y-0.5 pr-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="min-w-0 space-y-0.5 pl-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </article>
  );
}

export function PortfolioAllocationBreakdownSkeleton() {
  const rows = [
    { nameWidth: "10rem", barWidth: "80%" },
    { nameWidth: "13rem", barWidth: "60%" },
    { nameWidth: "8rem", barWidth: "50%" },
    { nameWidth: "11rem", barWidth: "33%" },
  ];

  return (
    <article className="bg-card rounded-xl shadow-ambient p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-3 w-32" />
      </div>

      <ul className="space-y-3.5">
        {rows.map((row, index) => (
          <li
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem] items-center gap-3 sm:grid-cols-[minmax(14rem,1fr)_minmax(12rem,0.9fr)_3.5rem_8rem] sm:gap-4"
          >
            <Skeleton
              className="h-4 max-w-full"
              style={{ width: row.nameWidth }}
            />
            <div className="relative h-1.5 min-w-0 overflow-hidden rounded-full bg-muted/50">
              <Skeleton
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: row.barWidth }}
              />
            </div>
            <Skeleton className="h-4 w-10 justify-self-end" />
            <Skeleton className="hidden h-4 w-24 justify-self-end sm:block" />
          </li>
        ))}
      </ul>
    </article>
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
