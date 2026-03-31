"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded chart components - recharts is excluded from initial bundle
export const LazyPriceChart = dynamic(
  () => import("./PriceChart").then((mod) => ({ default: mod.PriceChart })),
  {
    loading: () => (
      <div className="h-64 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
    ssr: false,
  }
);
