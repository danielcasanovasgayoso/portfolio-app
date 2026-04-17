import { Skeleton } from "@/components/ui/skeleton";
import {
  PortfolioSummarySkeleton,
  PortfolioSectionSkeleton,
} from "@/components/skeletons";

export default function MainLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pt-[max(1.5rem,env(safe-area-inset-top))] pb-24 max-w-5xl mx-auto">
        <div className="flex justify-between items-center px-8 mb-8">
          <div className="flex flex-col max-w-[60%]">
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>

        <div className="space-y-6 pb-20">
          <div className="px-4 md:px-8">
            <PortfolioSummarySkeleton />
          </div>
          <PortfolioSectionSkeleton />
          <PortfolioSectionSkeleton />
        </div>
      </main>
    </div>
  );
}
