import { Skeleton } from "@/components/ui/skeleton";
import { SubPageHeaderSkeleton } from "@/components/skeletons";

export default function NewMovementLoading() {
  return (
    <div className="min-h-screen pb-nav">
      <SubPageHeaderSkeleton />

      {/* Mirrors MovementFormFields: type toggle, date + amount, note, submit */}
      <main className="p-4 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    </div>
  );
}
