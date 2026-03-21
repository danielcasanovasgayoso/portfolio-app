"use client";

import Link from "next/link";
import { Plus, TrendingUp, BarChart3, Layers } from "lucide-react";

export function PortfolioEmptyState() {
  return (
    <div className="px-4 md:px-8">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-8 sm:p-12 text-center">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          {/* Faux chart lines */}
          <svg
            className="absolute bottom-0 left-0 w-full h-32 text-primary/[0.07]"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0 80 Q50 70 100 60 T200 40 T300 25 T400 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M0 90 Q80 85 150 75 T280 55 T400 35"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Icon cluster */}
          <div className="relative mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -top-2 -right-6 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center rotate-12">
              <TrendingUp className="w-4 h-4 text-primary/70" />
            </div>
            <div className="absolute -bottom-1 -left-5 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center -rotate-12">
              <Layers className="w-3.5 h-3.5 text-primary/70" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            Start building your portfolio
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-sm mb-8">
            Add your first asset to begin tracking performance, gains, and allocation across all your investments.
          </p>

          <Link
            href="/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add your first asset
          </Link>

        </div>
      </div>
    </div>
  );
}

