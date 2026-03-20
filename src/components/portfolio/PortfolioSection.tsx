import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import type { Holding, CategoryTotal } from "@/types/portfolio";
import { HoldingCard } from "./HoldingCard";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";

// Category color mapping for section headers
const CATEGORY_COLORS: Record<string, string> = {
  Funds: "#00f5d4",
  "Stocks & ETFs": "#fbbf24",
  PP: "#a78bfa",
  Others: "#60a5fa",
};

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
  const isPositive = gainClass === "positive";
  const categoryColor = CATEGORY_COLORS[title] || "#00f5d4";

  return (
    <section className="mt-8">
      {/* Section Header */}
      <header className="px-5 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {title}
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                {holdings.length} {holdings.length === 1 ? "asset" : "assets"}
              </span>
            </div>
          </div>

          {/* Section total */}
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-foreground tabular-nums">
              {totals ? formatCurrency(totals.marketValue) : "—"}
            </p>
            {!isOther && totals && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-mono tabular-nums",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {formatPercent(totals.gainLossPercent)}
              </div>
            )}
          </div>
        </div>

        {/* Category stats bar */}
        {!isOther && totals && (
          <div className="bg-card rounded-xl p-6 border-0 shadow-ambient">
            <div className="grid grid-cols-3 gap-4">
              {/* Invested */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-muted-foreground">
                  <Wallet className="w-3 h-3 text-muted-foreground" />
                  <span className="label-sm">Invested</span>
                </div>
                <p className="text-sm font-mono font-semibold text-foreground tabular-nums">
                  {formatCurrency(totals.costBasis)}
                </p>
              </div>

              {/* Gain/Loss */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-muted-foreground">
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 text-gain" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-loss" />
                  )}
                  <span className="label-sm">Gain/Loss</span>
                </div>
                <p
                  className={cn(
                    "text-sm font-mono font-semibold tabular-nums",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {totals.gainLoss >= 0 ? "+" : ""}
                  {formatCurrency(totals.gainLoss)}
                </p>
              </div>

              {/* Return */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-muted-foreground">
                  <Percent className="w-3 h-3 text-muted-foreground" />
                  <span className="label-sm">Return</span>
                </div>
                <p
                  className={cn(
                    "text-sm font-mono font-semibold tabular-nums",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {formatPercent(totals.gainLossPercent)}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Holdings list */}
      <div className="mx-4 flex flex-col gap-3">
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
