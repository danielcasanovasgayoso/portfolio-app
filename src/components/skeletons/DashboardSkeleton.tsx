import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioAllocationBreakdownSkeleton } from "./PortfolioSkeleton";

/** Mirrors the dashboard: net-worth hero with chart, 3 domain cards, allocation. */
export function DashboardSkeleton() {
  return (
    <>
      {/* Net-worth hero with embedded chart */}
      <div className="px-4 md:px-8 mb-6">
        <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8">
          <Skeleton className="h-3 w-32 mb-3 sm:mb-6" />
          <Skeleton className="h-10 sm:h-12 md:h-14 w-56 mb-6" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-1">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-7 w-10 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </article>
      </div>

      {/* Domain cards */}
      <div className="px-4 md:px-8 mb-6 grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <article key={i} className="bg-card rounded-xl shadow-ambient p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-7 w-32 mb-2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </article>
        ))}
      </div>

      {/* Allocation by domain */}
      <div className="px-4 md:px-8 mb-12">
        <PortfolioAllocationBreakdownSkeleton />
      </div>
    </>
  );
}
