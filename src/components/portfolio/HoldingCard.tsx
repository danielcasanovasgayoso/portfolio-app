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

interface HoldingCardProps {
  holding: Holding;
  totalPortfolioValue: number;
  isOther?: boolean;
}

export function HoldingCard({
  holding,
  totalPortfolioValue,
  isOther = false,
}: HoldingCardProps) {
  const portfolioPercent =
    totalPortfolioValue > 0
      ? ((holding.marketValue / totalPortfolioValue) * 100).toFixed(1)
      : "0";

  const gainClass = getGainClass(holding.gainLoss);

  if (isOther) {
    return (
      <article className="p-4 pl-5 relative bg-card rounded-2xl shadow-md border border-border overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              {holding.name}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Available · {portfolioPercent}%
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[17px] font-semibold text-foreground tabular-nums">
              {formatCurrency(holding.marketValue)}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Link href={`/portfolio/${holding.id}`}>
      <article className="p-4 pl-5 relative bg-card rounded-2xl shadow-md border border-border transition-colors hover:bg-accent/50 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate mb-1">
              {holding.name}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {formatShares(holding.shares)} shares · {portfolioPercent}% of
              total portfolio
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[17px] font-semibold text-foreground mb-1 tabular-nums">
              {formatCurrency(holding.marketValue)}
            </p>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-medium tabular-nums",
                gainClass === "positive"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              {holding.gainLoss >= 0 ? "+" : ""}
              {formatCurrency(holding.gainLoss)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="text-center">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Avg Price
            </p>
            <p className="text-sm font-medium text-foreground tabular-nums">
              {formatCurrency(holding.avgPrice, true)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Current
            </p>
            <p className="text-sm font-medium text-foreground tabular-nums">
              {holding.currentPrice
                ? formatCurrency(holding.currentPrice, true)
                : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Return
            </p>
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                gainClass === "positive"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {formatPercent(holding.gainLossPercent)}
            </p>
          </div>
        </div>
        {holding.priceDate && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Price as of {formatDate(holding.priceDate)}
          </p>
        )}
      </article>
    </Link>
  );
}
