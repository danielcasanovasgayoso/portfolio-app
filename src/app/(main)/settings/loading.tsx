import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen pb-nav">
      <div className="flex justify-between items-center px-4 md:px-8 pt-[max(1.5rem,env(safe-area-inset-top))] mb-8 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-32" />
      </div>

      <main className="p-4 space-y-5 max-w-5xl mx-auto md:px-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24 ml-2" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </main>
    </div>
  );
}
