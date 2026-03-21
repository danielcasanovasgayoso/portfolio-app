"use client";

import { useState } from "react";
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
import { ChevronRight, TrendingUp, TrendingDown, Pencil } from "lucide-react";
import { AssetForm } from "@/components/assets/AssetForm";

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
  const [editOpen, setEditOpen] = useState(false);

  const portfolioPercent =
    totalPortfolioValue > 0
      ? ((holding.marketValue / totalPortfolioValue) * 100).toFixed(1)
      : "0";

  const gainClass = getGainClass(holding.gainLoss);
  const isPositive = gainClass === "positive";

  if (isOther) {
    if (holding.manualPricing) {
      return (
        <>
          <article
            className="bg-card rounded-xl shadow-sm p-5 border-0 cursor-pointer transition-transform duration-150 active:scale-[0.98]"
            onClick={() => setEditOpen(true)}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-foreground truncate">
                    {holding.name}
                  </h3>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-[12px] font-mono text-muted-foreground mt-1">
                  MANUAL · {portfolioPercent}%
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
                  {formatCurrency(holding.marketValue)}
                </p>
              </div>
            </div>
          </article>
          <AssetForm
            open={editOpen}
            onOpenChange={setEditOpen}
            editAsset={{
              assetId: holding.assetId!,
              name: holding.name,
              category: holding.category,
              value: holding.marketValue,
            }}
          />
        </>
      );
    }

    return (
      <article className="bg-card rounded-xl shadow-sm p-5 border-0">
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
      </article>
    );
  }

  return (
    <Link href={`/portfolio/${holding.id}`} className="block group">
      <article className="bg-card rounded-xl shadow-sm p-5 border-0 transition-transform duration-150 active:scale-[0.98]">
        {/* Header row */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {holding.name}
              </h3>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 mt-2">
          <div className="bg-muted p-3 rounded-md">
            <p className="label-sm mb-1 text-muted-foreground">Invested</p>
            <p className="text-sm font-mono font-medium text-foreground tabular-nums">
              {formatCurrency(holding.costBasis)}
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="label-sm mb-1 text-muted-foreground">Avg Price</p>
            <p className="text-sm font-mono font-medium text-foreground tabular-nums">
              {formatCurrency(holding.avgPrice)}
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="label-sm mb-1 text-muted-foreground">Current</p>
            <p className="text-sm font-mono font-medium text-foreground tabular-nums">
              {holding.currentPrice
                ? formatCurrency(holding.currentPrice)
                : "—"}
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="label-sm mb-1 text-muted-foreground">Return</p>
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
          <div className="flex items-center justify-center mt-3 pt-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Price as of {formatDate(holding.priceDate)}
            </p>
          </div>
        )}
      </article>
    </Link>
  );
}
