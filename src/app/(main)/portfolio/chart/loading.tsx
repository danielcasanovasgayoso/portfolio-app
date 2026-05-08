import { Skeleton } from "@/components/ui/skeleton";
import { HeroBackdrop, MobileShell, SectionCard } from "@/components/pulse";

export default function PortfolioChartLoading() {
  return (
    <MobileShell>
      <HeroBackdrop height={200} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3 pt-2 pb-5">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/20" />
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-3.5 w-32 bg-white/30" />
            <Skeleton className="h-2.5 w-24 bg-white/20" />
          </div>
          <span className="h-9 w-9" />
        </div>

        <div className="mt-5">
          <SectionCard>
            <Skeleton className="h-7 w-full rounded-xl" />
            <Skeleton className="mt-4 h-56 w-full rounded-xl" />
          </SectionCard>
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
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </SectionCard>
        </div>
      </div>
    </MobileShell>
  );
}
