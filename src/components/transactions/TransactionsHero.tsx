"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowLeft, TrendingUp } from "lucide-react";
import { GlassLink, HeroHeader, HeroStat, Pill, SegmentedControl } from "@/components/pulse";
import { formatCurrency } from "@/lib/formatters";

const FILTER_OPTIONS = ["All", "BUY", "SELL", "DIVIDEND", "FEE"] as const;
type FilterValue = (typeof FILTER_OPTIONS)[number];

interface TransactionsHeroProps {
  netCashFlow: number;
  buyTotal: number;
  dividendTotal: number;
}

export function TransactionsHero({
  netCashFlow,
  buyTotal,
  dividendTotal,
}: TransactionsHeroProps) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTypes =
    searchParams.get("types")?.split(",").filter(Boolean) ?? [];
  const filterValue: FilterValue =
    currentTypes.length === 1 && FILTER_OPTIONS.includes(currentTypes[0] as FilterValue)
      ? (currentTypes[0] as FilterValue)
      : "All";

  const setFilter = useCallback(
    (next: FilterValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "All") {
        params.delete("types");
      } else {
        params.set("types", next);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const labels: Record<FilterValue, string> = {
    All: t("filterAll"),
    BUY: t("typeBuy"),
    SELL: t("typeSell"),
    DIVIDEND: t("typeDividend"),
    FEE: t("typeFee"),
  };

  return (
    <div className="relative">
      <HeroHeader
        left={
          <GlassLink href="/" aria-label={t("backToPortfolio")}>
            <ArrowLeft className="h-4 w-4" />
          </GlassLink>
        }
        center={
          <div className="text-[14px] font-semibold text-white">{t("title")}</div>
        }
        right={null}
      />

      <HeroStat
        label={t("netCashFlow")}
        value={formatCurrency(netCashFlow)}
        size={38}
        delta={
          <div className="flex flex-wrap justify-center gap-2">
            <Pill variant="glass" icon={<ArrowDownRight className="h-3 w-3" />}>
              {t("buyTotal", { amount: formatCurrency(buyTotal) })}
            </Pill>
            <Pill variant="gain" icon={<TrendingUp className="h-3 w-3" />}>
              {t("divTotal", { amount: formatCurrency(dividendTotal) })}
            </Pill>
          </div>
        }
      />

      <div className="mt-4">
        <SegmentedControl<FilterValue>
          options={FILTER_OPTIONS}
          value={filterValue}
          onChange={setFilter}
          variant="glass"
          font="mono"
          ariaLabel={t("type")}
          renderLabel={(o) => labels[o]}
        />
      </div>
    </div>
  );
}
