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

  const portfolioPercent =
    totalPortfolioValue > 0
      ? ((holding.marketValue / totalPortfolioValue) * 100).toFixed(1)
      : "0";

  const hasPrice = holding.currentPrice !== null;
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
        <div className="flex items-end justify-between gap-3 mt-1">
          <div className="text-[12px] font-mono text-muted-foreground space-y-0.5">
            {hasPrice && <p>{formatCurrency(holding.currentPrice!)}</p>}
            <p>
              {portfolioPercent}% {t("weight").toLowerCase()}
            </p>
            {holding.priceDate && <p>{formatDate(holding.priceDate)}</p>}
          </div>

          <div className="text-right flex-shrink-0 text-[12px] font-mono space-y-0.5">
            <p className="font-bold text-foreground tabular-nums">
              {formatCurrency(holding.marketValue)}
            </p>
            {hasPrice && (
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
