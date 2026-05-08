import { Skeleton } from "@/components/ui/skeleton";
import { HeroBackdrop, MobileShell, SectionCard } from "@/components/pulse";

export function AssetDetailSkeleton() {
  return (
    <MobileShell>
      <HeroBackdrop height={380} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3 pt-2 pb-5">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/20" />
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-3.5 w-16 bg-white/30" />
            <Skeleton className="h-2.5 w-20 bg-white/20" />
          </div>
          <Skeleton className="h-9 w-9 rounded-xl bg-white/20" />
        </div>
        <div className="px-2 text-center">
          <Skeleton className="mx-auto h-14 w-14 rounded-[18px] bg-white/30" />
          <Skeleton className="mx-auto mt-3 h-3.5 w-40 bg-white/30" />
          <Skeleton className="mx-auto mt-3 h-9 w-44 bg-white/30" />
          <Skeleton className="mx-auto mt-2 h-5 w-44 rounded-full bg-white/30" />
        </div>

        <div className="mt-6">
          <SectionCard>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-7 w-full rounded-xl" />
            <Skeleton className="mt-4 h-56 w-full rounded-xl" />
          </SectionCard>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl bg-card p-3 ghost-border">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="mt-2 h-3.5 w-16" />
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Skeleton className="h-4 w-32" />
          <SectionCard ambient={false} className="mt-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </SectionCard>
        </div>
      </div>
    </MobileShell>
  );
}
