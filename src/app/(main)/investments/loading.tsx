import { Skeleton } from "@/components/ui/skeleton";
import {
  PortfolioSummarySkeleton,
  PortfolioAllocationBreakdownSkeleton,
  PortfolioSectionSkeleton,
} from "@/components/skeletons";

export default function InvestmentsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto">
        {/* Root PageHeader: large title + privacy/refresh/add actions */}
        <div className="flex justify-between items-center px-4 md:px-8 pt-[max(1.5rem,env(safe-area-inset-top))] mb-8 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        <div className="px-4 md:px-8 mb-6">
          <PortfolioSummarySkeleton />
        </div>

        {/* Quick links row */}
        <div className="px-4 md:px-8 mb-6 flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>

        <div className="px-4 md:px-8 mb-12">
          <PortfolioAllocationBreakdownSkeleton />
        </div>

        <PortfolioSectionSkeleton />
        <PortfolioSectionSkeleton />
      </main>
    </div>
  );
}
