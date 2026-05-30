import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { CategoryTotal } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

/** A single breakdown row: market value plus its gain/loss and return. */
interface BreakdownRow {
  value: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface PortfolioSummaryCardProps {
  grand: CategoryTotal | null;
  invested: CategoryTotal | null;
  /** "Otros" category totals (cash / manual assets). */
  other?: CategoryTotal | null;
  /** User-share real-estate equity and its gain, folded into the net worth. */
  realEstate?: BreakdownRow | null;
}

export function PortfolioSummaryCard({
  grand,
  invested,
  other,
  realEstate,
}: PortfolioSummaryCardProps) {
  const t = useTranslations("portfolio");

  const realEstateEquity = realEstate?.value ?? 0;

  if (!grand && realEstateEquity === 0) {
    return (
      <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-8 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <span className="label-sm">{t("netWorth")}</span>
        </div>
        <p className="text-4xl font-mono font-bold tracking-tight text-muted-foreground">
          —
        </p>
      </article>
    );
  }

  const netWorth = (grand?.marketValue ?? 0) + realEstateEquity;

  // One row per asset group; each mirrors the market / gain / return triplet.
  const rows: { key: string; label: string; data: BreakdownRow }[] = [];

  const market = invested ?? grand;
  if (market) {
    rows.push({
      key: "market",
      label: t("marketValue"),
      data: {
        value: market.marketValue,
        gainLoss: market.gainLoss,
        gainLossPercent: market.gainLossPercent,
      },
    });
  }

  if (other && other.marketValue !== 0) {
    rows.push({
      key: "other",
      label: t("others"),
      data: {
        value: other.marketValue,
        gainLoss: other.gainLoss,
        gainLossPercent: other.gainLossPercent,
      },
    });
  }

  if (realEstate && realEstate.value !== 0) {
    rows.push({
      key: "realEstate",
      label: t("realEstate"),
      data: realEstate,
    });
  }

  return (
    <Link href="/portfolio/chart" className="block group">
      <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8 h-full transition-transform duration-150 active:scale-[0.98]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <span className="label-sm group-hover:text-primary transition-colors">
            {t("totalNetWorth")}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Main Value */}
        <div className="mb-4 sm:mb-8">
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground">
            {formatCurrency(netWorth)}
          </p>
        </div>

        {/* Breakdown table — one row per group, columns = value / gain / return.
            Unified across breakpoints: the same single-line grid renders on
            mobile and desktop, with tighter spacing and smaller monospace
            figures on narrow screens so the three columns still fit. */}
        <div className="space-y-2 sm:space-y-3">
          {/* Column headers — hidden on mobile to keep narrow rows compact */}
          <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-4">
            <span />
            <span className="label-sm text-muted-foreground text-right">
              {t("marketValue")}
            </span>
            <span className="label-sm text-muted-foreground text-right">
              {t("gainLoss")}
            </span>
            <span className="label-sm text-muted-foreground text-right">
              {t("return")}
            </span>
          </div>

          {rows.map((row) => {
            const isPositive = row.data.gainLoss >= 0;
            const gainColor = isPositive ? "text-gain" : "text-loss";
            return (
              <div
                key={row.key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-4 items-baseline"
              >
                <span className="label-sm text-foreground truncate">
                  {row.label}
                </span>
                <span className="text-xs sm:text-base md:text-lg font-mono font-semibold text-foreground tabular-nums text-right">
                  {formatCurrency(row.data.value)}
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-base md:text-lg font-mono font-semibold tabular-nums text-right",
                    gainColor
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrency(row.data.gainLoss)}
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-base md:text-lg font-mono font-semibold tabular-nums text-right",
                    gainColor
                  )}
                >
                  {formatPercent(row.data.gainLossPercent)}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </Link>
  );
}
