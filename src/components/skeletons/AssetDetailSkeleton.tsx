import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AssetDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-indigo-900 to-indigo-600 text-white border-0">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 bg-white/20 mb-2" />
          <Skeleton className="h-10 w-36 bg-white/20 mb-4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 bg-white/20 rounded-full" />
            <Skeleton className="h-6 w-32 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-7 w-10" />
              ))}
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Price Info */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
