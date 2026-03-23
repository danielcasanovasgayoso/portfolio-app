"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  formatCurrency,
  formatPercent,
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
}

export function HoldingCard({
  holding,
  totalPortfolioValue,
  isOther = false,
}: HoldingCardProps) {
  const t = useTranslations("portfolio");

  const portfolioPercent =
    totalPortfolioValue > 0
      ? ((holding.marketValue / totalPortfolioValue) * 100).toFixed(1)
      : "0";

  const gainClass = getGainClass(holding.gainLoss);
  const isPositive = gainClass === "positive";

  if (isOther) {
    return (
      <Link href={`/portfolio/${holding.id}`} className="block group">
        <article className="bg-card rounded-xl shadow-sm p-5 border-0 transition-transform duration-150 active:scale-[0.98]">
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {holding.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
              <p className="text-[12px] font-mono text-muted-foreground mt-1">
                {holding.manualPricing ? t("manual") : t("avail")} · {portfolioPercent}%
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
                {formatCurrency(holding.marketValue)}
              </p>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/portfolio/${holding.id}`} className="block group">
      <article className="bg-card rounded-xl shadow-sm p-4 border-0 transition-transform duration-150 active:scale-[0.98]">
        <div className="flex justify-between items-start gap-3">
          {/* Row 1: Name & Market Value */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {holding.name}
              </h3>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
          <p className="text-lg font-mono font-bold text-foreground tabular-nums flex-shrink-0">
            {formatCurrency(holding.marketValue)}
          </p>
        </div>

        {/* Row 2: Current price & Gain/Loss */}
        <div className="flex justify-between items-center mt-1">
          <p className="text-[12px] font-mono text-muted-foreground">
            {holding.currentPrice
              ? formatCurrency(holding.currentPrice)
              : "—"}
            {" · "}
            {portfolioPercent}%
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[12px] font-mono font-medium tabular-nums",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {holding.gainLoss >= 0 ? "+" : ""}
              {formatCurrency(holding.gainLoss)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium tabular-nums",
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
              {formatPercent(holding.gainLossPercent)}
            </span>
          </div>
        </div>

        {/* Row 3: Last update date */}
        {holding.priceDate && (
          <p className="text-[10px] font-mono text-muted-foreground mt-2 text-center">
            {t("priceAsOf", { date: formatDate(holding.priceDate) })}
          </p>
        )}
      </article>
    </Link>
  );
}
