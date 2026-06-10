import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the wallet screen: balance hero, evolution chart, movement rows. */
export function WalletSkeleton() {
  return (
    <>
      {/* Balance hero */}
      <div className="px-4 md:px-8 mb-6">
        <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8">
          <Skeleton className="h-3 w-28 mb-3 sm:mb-6" />
          <Skeleton className="h-10 sm:h-12 md:h-14 w-48 mb-6" />
          <div className="grid grid-cols-2 divide-x divide-white/10">
            <div className="min-w-0 space-y-1 pr-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="min-w-0 space-y-1 pl-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </article>
      </div>

      {/* Evolution chart card */}
      <div className="px-4 md:px-8 mb-6">
        <article className="bg-card rounded-xl shadow-ambient p-6">
          <Skeleton className="h-3 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </article>
      </div>

      {/* Movement rows */}
      <div className="mt-8">
        <div className="px-5 pb-4 space-y-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-2 w-20" />
        </div>
        <div className="mx-4 flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-3 pl-1.5">
                <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
