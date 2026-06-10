import { Skeleton } from "@/components/ui/skeleton";
import { WalletSkeleton } from "@/components/skeletons";

export default function WalletLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto">
        {/* Root PageHeader: large title + privacy toggle + add button */}
        <div className="flex justify-between items-center px-4 md:px-8 pt-[max(1.5rem,env(safe-area-inset-top))] mb-8 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        <WalletSkeleton />
      </main>
    </div>
  );
}
