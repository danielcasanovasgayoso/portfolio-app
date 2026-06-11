import { Skeleton } from "@/components/ui/skeleton";
import { SubPageHeaderSkeleton } from "@/components/skeletons";

export default function NewTransactionLoading() {
  return (
    <div className="min-h-screen pb-nav">
      <SubPageHeaderSkeleton />

      {/* Mirrors the form's own loading state: stacked field blocks */}
      <main className="p-4 max-w-lg mx-auto">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    </div>
  );
}
