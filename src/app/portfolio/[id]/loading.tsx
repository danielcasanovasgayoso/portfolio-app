import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssetDetailSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to portfolio"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse mt-1" />
          </div>
        </div>
      </header>
      <main>
        <AssetDetailSkeleton />
      </main>
    </div>
  );
}
