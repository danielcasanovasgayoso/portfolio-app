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
import { getAssetAccentColor } from "@/lib/asset-colors";
import { ChevronRight } from "lucide-react";

interface HoldingCardProps {
  holding: Holding;
  totalPortfolioValue: number;
  accentColor?: string;
}

export function HoldingCard({
  holding,
  totalPortfolioValue,
  accentColor,
}: HoldingCardProps) {
  const t = useTranslations("portfolio");

  const percentNum =
    totalPortfolioValue > 0
      ? (holding.marketValue / totalPortfolioValue) * 100
      : 0;
  const portfolioPercent = percentNum.toFixed(1);

  // Manual assets (cash / other) have no real cost basis, so gain/loss is
  // structurally zero and price/date are meaningless — show value + weight only.
  const isManual = holding.manualPricing === true;
  const hasPrice = holding.currentPrice !== null;
  const showPerformance = !isManual && hasPrice;
  const isPositive = getGainClass(holding.gainLoss) === "positive";
  const stripeColor = accentColor ?? getAssetAccentColor(holding.id);

  return (
    <Link href={`/portfolio/${holding.id}`} className="block group">
      <article className="relative bg-card rounded-xl shadow-sm px-4 py-3 pl-5 border-0 overflow-hidden transition-transform duration-150 active:scale-[0.98]">
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: stripeColor }}
        />
        {/* Row 1: Name left, chevron right */}
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {holding.name}
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Row 2: Details left, value & performance right */}
        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="min-w-0 flex-1 text-[12px] font-mono text-muted-foreground space-y-1.5">
            {showPerformance && <p>{formatCurrency(holding.currentPrice!)}</p>}
            {/* Weight bar — relative size scannable at a glance */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(percentNum, 100)}%`,
                    backgroundColor: stripeColor,
                  }}
                />
              </div>
              <span className="tabular-nums">
                {portfolioPercent}% {t("weight").toLowerCase()}
              </span>
            </div>
            {showPerformance && holding.priceDate && (
              <p>{formatDate(holding.priceDate)}</p>
            )}
          </div>

          <div className="text-right flex-shrink-0 text-[12px] font-mono space-y-0.5">
            <p className="font-bold text-foreground tabular-nums">
              {formatCurrency(holding.marketValue)}
            </p>
            {showPerformance && (
              <>
                <p
                  className={cn(
                    "font-medium tabular-nums",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {holding.gainLoss >= 0 ? "+" : ""}
                  {formatCurrency(holding.gainLoss)}
                </p>
                <p
                  className={cn(
                    "font-medium tabular-nums",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {formatPercent(holding.gainLossPercent)}
                </p>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
