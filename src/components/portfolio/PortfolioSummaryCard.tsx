import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { CategoryTotal } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";

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

  // One card per asset group, each rendered with its own icon badge.
  const cards: {
    key: string;
    label: string;
    icon: LucideIcon;
    data: BreakdownRow;
  }[] = [];

  const market = invested ?? grand;
  if (market) {
    cards.push({
      key: "market",
      label: t("marketValueFull"),
      icon: TrendingUp,
      data: {
        value: market.marketValue,
        gainLoss: market.gainLoss,
        gainLossPercent: market.gainLossPercent,
      },
    });
  }

  if (other && other.marketValue !== 0) {
    cards.push({
      key: "other",
      label: t("othersFull"),
      icon: User,
      data: {
        value: other.marketValue,
        gainLoss: other.gainLoss,
        gainLossPercent: other.gainLossPercent,
      },
    });
  }

  if (realEstate && realEstate.value !== 0) {
    cards.push({
      key: "realEstate",
      label: t("realEstate"),
      icon: Building2,
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
        <div className="mb-6 sm:mb-8">
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground">
            {formatCurrency(netWorth)}
          </p>
        </div>

        {/* Breakdown: icon-badged cards. Stacked on mobile (separated by a
            horizontal rule), laid out as equal columns with vertical dividers
            on tablet and up — mirroring the reference design. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y divide-white/10 sm:divide-y-0 sm:divide-x">
          {cards.map((card) => {
            const Icon = card.icon;
            const isPositive = card.data.gainLoss >= 0;
            const gainColor = isPositive ? "text-gain" : "text-loss";
            const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
            const hasMovement = card.data.gainLoss !== 0;

            return (
              <div
                key={card.key}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:flex-col sm:items-stretch sm:gap-2 sm:py-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#A9ABFF]">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 space-y-1">
                  <span className="label-sm block text-muted-foreground">
                    {card.label}
                  </span>
                  <p className="text-lg font-mono font-bold tracking-tight text-foreground tabular-nums">
                    {formatCurrency(card.data.value)}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums",
                      gainColor
                    )}
                  >
                    <span>
                      {isPositive ? "+" : ""}
                      {formatCurrency(card.data.gainLoss)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {formatPercent(card.data.gainLossPercent)}
                      {hasMovement && <TrendIcon className="h-3 w-3" />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </Link>
  );
}
