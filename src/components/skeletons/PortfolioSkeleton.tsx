import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/pulse";
import { getAvatarInitial } from "@/lib/avatarColor";

export function HoldingCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card px-3.5 py-3 ghost-border shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-1 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioSectionSkeleton() {
  return (
    <section className="mt-6">
      <header className="mb-2 flex items-baseline justify-between px-1">
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-1.5 h-2 w-16" />
        </div>
        <Skeleton className="h-4 w-20" />
      </header>
      <div className="flex flex-col gap-2">
        <HoldingCardSkeleton />
        <HoldingCardSkeleton />
        <HoldingCardSkeleton />
      </div>
    </section>
  );
}

export function AllocationCardSkeleton() {
  return (
    <SectionCard>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-1.5 h-2 w-20" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-[104px] w-[104px] rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-1.5 shrink-0" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="ml-auto h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * Skeleton mirroring the Pulse dashboard layout (hero header + hero number + delta + allocation).
 * Renders inside the same MobileShell so the visible chrome (gradient backdrop, glass nav) keeps
 * its position while data streams in.
 */
export function DashboardSkeleton({ email }: { email?: string }) {
  const initials = email ? getAvatarInitial(email.split("@")[0] ?? email) : "·";
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-2 pb-5 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.18] text-[12px] font-bold text-white/90">
            {initials}
          </span>
          <div className="leading-tight">
            <Skeleton className="h-2.5 w-16 bg-white/30" />
            <Skeleton className="mt-1.5 h-3.5 w-20 bg-white/30" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/20" />
          <Skeleton className="h-9 w-9 rounded-xl bg-white/20" />
        </div>
      </div>
      <div className="px-2 pb-2 text-center">
        <Skeleton className="mx-auto h-2.5 w-32 bg-white/30" />
        <Skeleton className="mx-auto mt-3 h-12 w-56 bg-white/30" />
        <Skeleton className="mx-auto mt-3 h-5 w-44 rounded-full bg-white/30" />
        <Skeleton className="mx-auto mt-4 h-7 w-44 rounded-full bg-white/30" />
      </div>

      <div className="mt-6">
        <AllocationCardSkeleton />
      </div>

      <PortfolioSectionSkeleton />
      <PortfolioSectionSkeleton />
    </>
  );
}

/**
 * @deprecated kept for legacy callers (loading.tsx) — use DashboardSkeleton instead.
 */
export function PortfolioSummarySkeleton() {
  return (
    <SectionCard>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-12 w-48" />
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
