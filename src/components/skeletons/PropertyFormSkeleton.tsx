import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** Mirrors <PropertyForm>: details card, owners card, mortgage card, submit. */
export function PropertyFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Property details */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <div className="grid grid-cols-2 gap-4">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
        </CardContent>
      </Card>

      {/* Owners */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </CardContent>
      </Card>

      {/* Mortgage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </CardHeader>
      </Card>

      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
    </div>
  );
}
