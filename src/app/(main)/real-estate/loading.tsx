import { Skeleton } from "@/components/ui/skeleton";
import { RealEstateSkeleton } from "@/components/skeletons";

export default function RealEstateLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto">
        {/* Root PageHeader: large title + add button */}
        <div className="flex justify-between items-center px-4 md:px-8 pt-[max(1.5rem,env(safe-area-inset-top))] mb-8 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>

        <RealEstateSkeleton />
      </main>
    </div>
  );
}
