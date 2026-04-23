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
import { ChevronRight } from "lucide-react";

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

  const portfolioPercentNum =
    totalPortfolioValue > 0
      ? (holding.marketValue / totalPortfolioValue) * 100
      : 0;
  const portfolioPercent = portfolioPercentNum.toFixed(1);

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
              </div>
              <p className="text-[12px] font-mono text-muted-foreground mt-1">
                {holding.manualPricing ? t("manual") : t("avail")} · {portfolioPercent}%
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
                {formatCurrency(holding.marketValue)}
              </p>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  const glow = isPositive ? "rgba(0,200,83,.35)" : "rgba(255,59,48,.32)";
  const accent = isPositive ? "var(--gain)" : "var(--loss)";
  const weightBarWidth = Math.min(100, (portfolioPercentNum / 30) * 100);

  const metaParts = [
    holding.ticker,
    holding.currentPrice != null ? formatCurrency(holding.currentPrice) : null,
    holding.priceDate ? formatDate(holding.priceDate) : null,
  ].filter(Boolean) as string[];

  return (
    <Link href={`/portfolio/${holding.id}`} className="block group">
      <div className="relative pt-[18px] px-[6px] pb-[6px]">
        {/* Top wash (ambient glow) */}
        <div
          aria-hidden
          className="absolute top-0 left-[10px] right-[10px] h-[50px] rounded-[30px] pointer-events-none"
          style={{ background: glow, filter: "blur(28px)" }}
        />

        <article
          className="relative bg-card rounded-[18px] overflow-hidden px-[18px] py-[16px] border-0 transition-transform duration-150 active:scale-[0.98]"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,255,255,.9) inset, 0 1px 2px rgba(24,20,69,.06), 0 8px 24px -12px rgba(24,20,69,.12)",
          }}
        >
          {/* Accent bar */}
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            }}
          />

          {/* Header row */}
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {holding.name}
              </h3>
              {metaParts.length > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground mt-[3px] tracking-[0.08em] truncate">
                  {metaParts.join(" · ")}
                </p>
              )}
            </div>
            <div
              className={cn(
                "font-mono text-[13px] font-extrabold tabular-nums flex-shrink-0",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {formatPercent(holding.gainLossPercent)}
            </div>
          </div>

          {/* Worth / Gain row */}
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.14em] font-semibold">
                {t("worth")}
              </div>
              <div className="text-[30px] font-bold text-foreground tabular-nums leading-none mt-[2px] tracking-[-0.025em]">
                {formatCurrency(holding.marketValue)}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.14em] font-semibold">
                {t("gain")}
              </div>
              <div
                className={cn(
                  "font-mono text-[14px] font-bold tabular-nums mt-[2px]",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {holding.gainLoss >= 0 ? "+" : ""}
                {formatCurrency(holding.gainLoss)}
              </div>
            </div>
          </div>

          {/* Weight bar */}
          <div className="mt-[10px] h-[3px] rounded-full bg-[#F6F2FF] dark:bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${weightBarWidth}%`,
                background: "linear-gradient(90deg, #4648D4, #6063EE)",
              }}
            />
          </div>
          <div className="mt-[5px] font-mono text-[10px] text-muted-foreground tracking-[0.04em]">
            {portfolioPercent}
            {t("ofPortfolio")}
          </div>
        </article>
      </div>
    </Link>
  );
}
