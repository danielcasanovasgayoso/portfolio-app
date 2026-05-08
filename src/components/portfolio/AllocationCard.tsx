import { useTranslations } from "next-intl";
import { Donut, SectionCard, type DonutSlice } from "@/components/pulse";
import { formatCurrency } from "@/lib/formatters";
import type { PortfolioSummary } from "@/types/portfolio";

const CATEGORY_COLORS = {
  funds: "#4F46E5",
  stocks: "#7C3AED",
  pp: "#06B6D4",
  others: "#10B981",
} as const;

function compactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

interface AllocationCardProps {
  summary: PortfolioSummary;
  className?: string;
}

export function AllocationCard({ summary, className }: AllocationCardProps) {
  const t = useTranslations("portfolio");
  const total = summary.totals.grand?.marketValue ?? 0;
  if (total <= 0) return null;

  const slices: DonutSlice[] = [
    {
      key: "funds" as const,
      label: t("funds"),
      value: summary.totals.funds?.marketValue ?? 0,
      color: CATEGORY_COLORS.funds,
    },
    {
      key: "stocks" as const,
      label: t("stocksEtfs"),
      value: summary.totals.stocks?.marketValue ?? 0,
      color: CATEGORY_COLORS.stocks,
    },
    {
      key: "pp" as const,
      label: t("pp"),
      value: summary.totals.pp?.marketValue ?? 0,
      color: CATEGORY_COLORS.pp,
    },
    {
      key: "others" as const,
      label: t("others"),
      value: summary.totals.others?.marketValue ?? 0,
      color: CATEGORY_COLORS.others,
    },
  ]
    .filter((slice) => slice.value > 0)
    .map((slice) => ({
      label: slice.label,
      pct: (slice.value / total) * 100,
      color: slice.color,
    }));

  if (slices.length === 0) return null;

  return (
    <SectionCard className={className}>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {t("allocation")}
          </h3>
          <span className="label-sm">
            {t("acrossClasses", { count: slices.length })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Donut
          slices={slices}
          label={compactCurrency(total)}
          sublabel="TOTAL"
        />
        <ul className="flex flex-1 flex-col gap-2">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="h-4 w-1.5 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate font-semibold text-foreground">
                {slice.label}
              </span>
              <span className="ml-auto font-mono text-xs font-bold tabular-nums text-foreground">
                {slice.pct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
