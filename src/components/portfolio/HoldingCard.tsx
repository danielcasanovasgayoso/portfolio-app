"use client";

import Link from "next/link";
import {
  formatCurrency,
  formatPercent,
  formatShares,
  formatDate,
  getGainClass,
} from "@/lib/formatters";
import type { Holding } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

interface HoldingCardProps {
  holding: Holding;
  totalPortfolioValue: number;
  isOther?: boolean;
  index?: number;
}

export function HoldingCard({
  holding,
  totalPortfolioValue,
  isOther = false,
  index = 0,
}: HoldingCardProps) {
  const portfolioPercent =
    totalPortfolioValue > 0
      ? ((holding.marketValue / totalPortfolioValue) * 100).toFixed(1)
      : "0";

  const gainClass = getGainClass(holding.gainLoss);
  const isPositive = gainClass === "positive";

  // Stagger animation based on index
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  if (isOther) {
    return (
      <article
        className={cn(
          "terminal-card p-4 pl-5 animate-slide-up",
          staggerClass
        )}
      >
        <div className="accent-line pl-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground truncate">
                {holding.name}
              </h3>
              <p className="text-[12px] font-mono text-muted-foreground mt-1">
                AVAIL · {portfolioPercent}%
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
                {formatCurrency(holding.marketValue)}
              </p>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Link href={`/portfolio/${holding.id}`} className="block group">
      <article
        className={cn(
          "terminal-card p-4 pl-5 card-hover animate-slide-up",
          staggerClass
        )}
      >
        {/* Accent line with gradient */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg transition-all duration-300",
            isPositive
              ? "bg-gradient-to-b from-[#00e676] to-[#00c853]"
              : "bg-gradient-to-b from-[#ff5252] to-[#ff1744]"
          )}
        />

        {/* Header row */}
        <div className="flex justify-between items-start gap-3 mb-4 pl-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {holding.name}
              </h3>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-[12px] font-mono text-muted-foreground">
              <span>{formatShares(holding.shares)} shares</span>
              <span className="text-border">·</span>
              <span>{portfolioPercent}%</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-lg font-mono font-bold text-foreground tabular-nums mb-1">
              {formatCurrency(holding.marketValue)}
            </p>
            <div
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-mono font-medium tabular-nums",
                isPositive
                  ? "bg-gain-muted text-gain"
                  : "bg-loss-muted text-loss"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {holding.gainLoss >= 0 ? "+" : ""}
              {formatCurrency(holding.gainLoss)}
            </div>
          </div>
        </div>

        {/* Data grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border pl-3">
          <div>
            <p className="data-label mb-1">Invested</p>
            <p className="text-sm font-mono font-medium text-foreground tabular-nums">
              {formatCurrency(holding.costBasis)}
            </p>
          </div>

          <div>
            <p className="data-label mb-1">Avg Price</p>
            <p className="text-sm font-mono font-medium text-foreground tabular-nums">
              {formatCurrency(holding.avgPrice, true)}
            </p>
          </div>

          <div>
            <p className="data-label mb-1">Current</p>
            <p className="text-sm font-mono font-medium text-foreground tabular-nums">
              {holding.currentPrice
                ? formatCurrency(holding.currentPrice, true)
                : "—"}
            </p>
          </div>

          <div>
            <p className="data-label mb-1">Return</p>
            <p
              className={cn(
                "text-sm font-mono font-semibold tabular-nums",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {formatPercent(holding.gainLossPercent)}
            </p>
          </div>
        </div>

        {/* Price date footer */}
        {holding.priceDate && (
          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 pl-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Price as of {formatDate(holding.priceDate)}
            </p>
          </div>
        )}
      </article>
    </Link>
  );
}
