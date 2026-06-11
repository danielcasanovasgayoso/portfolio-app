import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the Real Estate tab content: equity hero, chart, property cards. */
export function RealEstateSkeleton() {
  return (
    <div className="px-4 md:px-8 space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
