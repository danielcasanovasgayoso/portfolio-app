"use client";

import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import type { CategoryTotal } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Target, Percent } from "lucide-react";

interface PortfolioSummaryCardProps {
  grand: CategoryTotal | null;
  invested: CategoryTotal | null;
}

export function PortfolioSummaryCard({
  grand,
  invested,
}: PortfolioSummaryCardProps) {
  const displayTotals = invested || grand;

  if (!grand) {
    return (
      <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-8 relative overflow-hidden h-full flex flex-col justify-center">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
            <span className="label-sm">Net Worth</span>
          </div>
          <p className="text-4xl font-mono font-bold tracking-tight text-muted-foreground">
            —
          </p>
        </div>
      </article>
    );
  }

  const gainClass = getGainClass(displayTotals?.gainLoss ?? 0);
  const isPositive = gainClass === "positive";

  return (
    <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-8 relative overflow-hidden h-full">
      {/* Ambient glow effect */}
      <div
        className={cn(
          "absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none",
          isPositive ? "bg-gain" : "bg-loss"
        )}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isPositive ? "bg-gain" : "bg-loss"
              )}
            />
            <span className="label-sm">Total Net Worth</span>
          </div>
          <span className="label-sm opacity-60">LIVE</span>
        </div>

        {/* Main Value */}
        <div className="mb-8">
          <p className="text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground animate-count">
            {formatCurrency(grand.marketValue)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Invested */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" />
              <span className="label-sm text-muted-foreground">Invested</span>
            </div>
            <p className="text-lg md:text-xl font-mono font-semibold text-foreground tabular-nums">
              {formatCurrency(displayTotals?.costBasis ?? 0)}
            </p>
          </div>

          {/* Gain/Loss */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-gain" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-loss" />
              )}
              <span className="label-sm text-muted-foreground">Gain/Loss</span>
            </div>
            <p
              className={cn(
                "text-lg md:text-xl font-mono font-semibold tabular-nums",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {(displayTotals?.gainLoss ?? 0) >= 0 ? "+" : ""}
              {formatCurrency(displayTotals?.gainLoss ?? 0)}
            </p>
          </div>

          {/* Return */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Percent className="w-3.5 h-3.5" />
              <span className="label-sm text-muted-foreground">Return</span>
            </div>
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-lg md:text-xl font-mono font-semibold tabular-nums",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {formatPercent(displayTotals?.gainLossPercent ?? 0)}
              </p>
              {/* Mini indicator badge */}
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium",
                  isPositive
                    ? "bg-gain-muted text-gain"
                    : "bg-loss-muted text-loss"
                )}
              >
                {isPositive ? "↑" : "↓"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[2px] opacity-60",
          isPositive
            ? "bg-gradient-to-r from-transparent via-[var(--gain)] to-transparent"
            : "bg-gradient-to-r from-transparent via-[var(--loss)] to-transparent"
        )}
        aria-hidden="true"
      />
    </article>
  );
}
