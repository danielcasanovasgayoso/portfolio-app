import { FullPortfolioSkeleton } from "@/components/skeletons";
import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary animate-pulse">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Portfolio
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Swiss Terminal
            </p>
          </div>
        </div>
      </header>

      <main className="pt-6 pb-8">
        <FullPortfolioSkeleton />
      </main>
    </div>
  );
}
