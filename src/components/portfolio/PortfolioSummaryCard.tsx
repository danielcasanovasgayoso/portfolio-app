"use client";

import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import type { CategoryTotal } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface PortfolioSummaryCardProps {
  grand: CategoryTotal | null;
  invested: CategoryTotal | null;
}

export function PortfolioSummaryCard({
  grand,
  invested,
}: PortfolioSummaryCardProps) {
  if (!grand || !invested) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-600 mx-4 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wide opacity-85">
          Total Net Worth
        </p>
        <p className="text-4xl font-bold tracking-tight mt-2">—</p>
      </div>
    );
  }

  const gainClass = getGainClass(invested.gainLoss);

  return (
    <article className="bg-gradient-to-br from-indigo-900 to-indigo-600 mx-4 rounded-2xl p-6 text-white shadow-lg">
      <p className="text-sm font-medium uppercase tracking-wide opacity-85 mb-2">
        Total Net Worth
      </p>
      <p className="text-4xl md:text-5xl font-bold tracking-tighter mb-5 tabular-nums">
        {formatCurrency(grand.marketValue)}
      </p>
      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/15">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide opacity-75 mb-1">
            Invested
          </p>
          <p className="text-base md:text-lg font-semibold tabular-nums">
            {formatCurrency(invested.costBasis)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide opacity-75 mb-1">
            Gain/Loss
          </p>
          <p
            className={cn(
              "text-base md:text-lg font-semibold tabular-nums",
              gainClass === "positive" ? "text-emerald-300" : "text-red-300"
            )}
          >
            {invested.gainLoss >= 0 ? "+" : ""}
            {formatCurrency(invested.gainLoss)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide opacity-75 mb-1">
            Return
          </p>
          <p
            className={cn(
              "text-base md:text-lg font-semibold tabular-nums",
              gainClass === "positive" ? "text-emerald-300" : "text-red-300"
            )}
          >
            {formatPercent(invested.gainLossPercent)}
          </p>
        </div>
      </div>
    </article>
  );
}
