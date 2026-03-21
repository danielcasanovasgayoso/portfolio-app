import { Skeleton } from "@/components/ui/skeleton";

export default function AssetDetailLoading() {
  return (
    <div className="min-h-screen pb-20">
      {/* Sticky header skeleton */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Hero card */}
        <Skeleton className="h-40 w-full rounded-xl" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>

        {/* Chart */}
        <Skeleton className="h-72 w-full rounded-xl" />

        {/* Price info */}
        <Skeleton className="h-48 w-full rounded-xl" />
      </main>
    </div>
  );
}
