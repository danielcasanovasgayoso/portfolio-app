import { HeroBackdrop, MobileShell } from "@/components/pulse";
import { DashboardSkeleton } from "@/components/skeletons";

export default function MainLoading() {
  return (
    <MobileShell>
      <HeroBackdrop height={360} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <DashboardSkeleton />
      </div>
    </MobileShell>
  );
}
