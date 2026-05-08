import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/formatters";
import type { CategoryTotal, Holding } from "@/types/portfolio";
import { HoldingCard } from "./HoldingCard";

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
  const t = useTranslations("portfolio");

  if (holdings.length === 0) return null;

  return (
    <section className="mt-6 first:mt-0">
      <header className="mb-2 flex items-baseline justify-between px-1">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <span className="label-sm">{t("assetCount", { count: holdings.length })}</span>
        </div>
        {totals && (
          <span className="font-mono text-[15px] font-bold tabular-nums text-foreground">
            {formatCurrency(totals.marketValue)}
          </span>
        )}
      </header>
      <div className="flex flex-col gap-2">
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
