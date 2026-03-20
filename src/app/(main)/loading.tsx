import { Skeleton } from "@/components/ui/skeleton";

export default function MainLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="pt-6 max-w-5xl mx-auto">
        {/* Header area skeleton */}
        <div className="flex justify-between items-start px-8 mb-12">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>

        {/* Content skeleton */}
        <div className="px-4 md:px-8 space-y-6">
          <Skeleton className="h-56 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
