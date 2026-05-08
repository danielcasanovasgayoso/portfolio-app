"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  getGainClass,
} from "@/lib/formatters";
import { Avatar, Pill, WeightBar } from "@/components/pulse";
import type { Holding } from "@/types/portfolio";

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
  const isPositive = getGainClass(holding.gainLoss) === "positive";

  const portfolioPercent =
    totalPortfolioValue > 0
      ? (holding.marketValue / totalPortfolioValue) * 100
      : 0;
  const portfolioPercentLabel = portfolioPercent.toFixed(1);

  const seed = holding.ticker || holding.name || holding.id;
  const subline =
    [
      holding.currentPrice != null
        ? formatCurrency(holding.currentPrice)
        : isOther
        ? t("manual")
        : null,
      `${portfolioPercentLabel}%`,
      holding.priceDate ? formatDate(holding.priceDate) : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const heading = holding.ticker
    ? `${holding.ticker} · ${holding.name}`
    : holding.name;

  return (
    <Link
      href={`/portfolio/${holding.id}`}
      prefetch
      className="block transition-transform duration-150 active:scale-[0.98]"
    >
      <article className="rounded-2xl bg-card px-3.5 py-3 ghost-border shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar seed={seed} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-[13px] font-semibold text-foreground">
                {heading}
              </h3>
              <span className="font-mono text-[13px] font-bold tabular-nums text-foreground">
                {formatCurrency(holding.marketValue)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {subline}
              </span>
              {!isOther && (
                <Pill
                  variant={isPositive ? "gain" : "loss"}
                  icon={
                    isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )
                  }
                >
                  {formatPercent(holding.gainLossPercent)}
                </Pill>
              )}
            </div>
            {!isOther && (
              <div className="mt-2">
                <WeightBar
                  pct={Math.min(100, portfolioPercent * 2)}
                  positive={isPositive}
                />
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
