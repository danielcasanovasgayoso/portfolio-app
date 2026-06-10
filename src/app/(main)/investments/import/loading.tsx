import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <div className="min-h-screen pb-nav">
      {/* Mirrors SubPageHeader: sticky bar with back button + title */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Mirrors GmailConnectCard */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      </main>
    </div>
  );
}
