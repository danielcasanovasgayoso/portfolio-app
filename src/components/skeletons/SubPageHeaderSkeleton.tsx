import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors <SubPageHeader>: sticky compact bar with back button + title,
 * plus optional action button placeholders on the right.
 */
export function SubPageHeaderSkeleton({ actions = 0 }: { actions?: number }) {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        {actions > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {Array.from({ length: actions }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
