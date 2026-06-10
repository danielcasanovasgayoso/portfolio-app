import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { CategoryTotal } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";

interface PortfolioSummaryCardProps {
  /** Aggregated totals of every investment holding. */
  totals: CategoryTotal | null;
}

/**
 * Hero card of the investments screen: total market value with invested
 * capital and unrealized gain. Links to the investments evolution chart.
 * Investments only — wallet cash and real estate live in their own domains.
 */
export function PortfolioSummaryCard({ totals }: PortfolioSummaryCardProps) {
  const t = useTranslations("portfolio");

  if (!totals) {
    return (
      <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-8 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <span className="label-sm">{t("marketValueFull")}</span>
        </div>
        <p className="text-4xl font-mono font-bold tracking-tight text-muted-foreground">
          —
        </p>
      </article>
    );
  }

  const isPositive = totals.gainLoss >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Link href="/investments/chart" className="block group">
      <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8 h-full transition-transform duration-150 active:scale-[0.98]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <span className="label-sm group-hover:text-primary transition-colors">
            {t("marketValueFull")}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Main Value */}
        <div className="mb-6 sm:mb-8">
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground sensitive-amount">
            {formatCurrency(totals.marketValue)}
          </p>
        </div>

        {/* Invested and gain/loss columns */}
        <div className="grid grid-cols-2 divide-x divide-white/10">
          <div className="min-w-0 space-y-0.5 pr-4">
            <span className="label-sm block text-muted-foreground">
              {t("invested")}
            </span>
            <p className="text-sm font-mono font-bold tracking-tight text-foreground tabular-nums sensitive-amount">
              {formatCurrency(totals.costBasis)}
            </p>
          </div>
          <div className="min-w-0 space-y-0.5 pl-4">
            <span className="label-sm block text-muted-foreground">
              {t("gainLoss")}
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-mono font-bold tabular-nums",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              <span className="sensitive-amount">
                {isPositive ? "+" : ""}
                {formatCurrency(totals.gainLoss)}
              </span>
              <span className="flex items-center gap-0.5 text-[11px]">
                {formatPercent(totals.gainLossPercent)}
                {totals.gainLoss !== 0 && <TrendIcon className="h-2.5 w-2.5" />}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
