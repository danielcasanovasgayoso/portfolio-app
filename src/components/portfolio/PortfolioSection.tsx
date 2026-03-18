"use client";

import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import type { Holding, CategoryTotal } from "@/types/portfolio";
import { HoldingCard } from "./HoldingCard";
import { cn } from "@/lib/utils";

interface PortfolioSectionProps {
  title: string;
  holdings: Holding[];
  totals: CategoryTotal | null;
  totalPortfolioValue: number;
  isOther?: boolean;
}

export function PortfolioSection({
  title,
  holdings,
  totals,
  totalPortfolioValue,
  isOther = false,
}: PortfolioSectionProps) {
  if (holdings.length === 0) return null;

  const gainClass = totals ? getGainClass(totals.gainLoss) : "positive";

  return (
    <section className="mt-6">
      <header className="px-5 pb-3">
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <span className="text-lg font-bold text-primary">
            {totals ? formatCurrency(totals.marketValue) : "—"}
          </span>
        </div>
        {!isOther && totals && (
          <div className="grid grid-cols-3 gap-3 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/15 p-3 rounded-xl border border-primary/10 dark:border-primary/20">
            <div className="text-center">
              <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-0.5">
                Invested
              </p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(totals.costBasis)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-0.5">
                Gain/Loss
              </p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  gainClass === "positive"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {totals.gainLoss >= 0 ? "+" : ""}
                {formatCurrency(totals.gainLoss)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-0.5">
                Return
              </p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  gainClass === "positive"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {formatPercent(totals.gainLossPercent)}
              </p>
            </div>
          </div>
        )}
      </header>
      <div className="mx-4 flex flex-col gap-2">
        {holdings.map((holding) => (
          <HoldingCard
            key={holding.id}
            holding={holding}
            totalPortfolioValue={totalPortfolioValue}
            isOther={isOther}
          />
        ))}
      </div>
    </section>
  );
}
