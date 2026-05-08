import { TrendingDown, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  HeroBackdrop,
  MobileShell,
  PageHeader,
  SectionCard,
} from "@/components/pulse";
import {
  getPortfolioData,
  getPortfolioValueHistory,
} from "@/services/portfolio.service";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PriceChart } from "@/components/charts";
import { requireAuth } from "@/lib/auth";

interface MonthlyChange {
  month: string;
  label: string;
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
}

function computeMonthlyChanges(
  chartData: { date: string; close: number }[]
): MonthlyChange[] {
  if (chartData.length === 0) return [];

  const byMonth = new Map<string, { first: number; last: number }>();
  for (const point of chartData) {
    const month = point.date.substring(0, 7);
    const existing = byMonth.get(month);
    if (!existing) {
      byMonth.set(month, { first: point.close, last: point.close });
    } else {
      existing.last = point.close;
    }
  }

  const sortedMonths = Array.from(byMonth.keys()).sort();
  const last12 = sortedMonths.slice(-12);

  const monthFormatter = new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric",
  });

  const result: MonthlyChange[] = [];
  for (let i = 0; i < last12.length; i++) {
    const month = last12[i];
    const data = byMonth.get(month)!;
    const prevMonth =
      i > 0 ? last12[i - 1] : sortedMonths[sortedMonths.indexOf(month) - 1];
    const startValue = prevMonth ? byMonth.get(prevMonth)!.last : data.first;
    const endValue = data.last;
    const change = endValue - startValue;
    const changePercent = startValue > 0 ? change / startValue : 0;

    const date = new Date(month + "-15");
    result.push({
      month,
      label: monthFormatter.format(date),
      startValue,
      endValue,
      change,
      changePercent,
    });
  }

  return result;
}

export default async function PortfolioChartPage() {
  const user = await requireAuth();
  const t = await getTranslations("portfolioChart");

  const [data, chartData] = await Promise.all([
    getPortfolioData(user.id),
    getPortfolioValueHistory(user.id),
  ]);

  const netWorth = data.totals.grand?.marketValue ?? 0;
  const monthlyChanges = computeMonthlyChanges(chartData).reverse();

  return (
    <MobileShell>
      <HeroBackdrop height={200} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <PageHeader
          title={t("title")}
          backHref="/"
          backLabel={t("backToPortfolio")}
          subtitle={formatCurrency(netWorth)}
        />

        <div className="mt-5">
          <SectionCard>
            {chartData.length > 1 ? (
              <PriceChart data={chartData} showTimeframes />
            ) : (
              <p className="px-1 py-2 text-center text-sm text-muted-foreground">
                {t("noData")}
              </p>
            )}
          </SectionCard>
        </div>

        {monthlyChanges.length > 0 && (
          <div className="mt-5">
            <h2 className="px-1 pb-2 text-[14px] font-semibold tracking-tight text-foreground">
              {t("monthlyChanges")}
            </h2>
            <SectionCard ambient={false}>
              <ol className="divide-y divide-[var(--outline-variant)]">
                {monthlyChanges.map((m) => {
                  const isPositive = m.change >= 0;
                  return (
                    <li
                      key={m.month}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 text-gain" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        )}
                        <span className="text-[13px] font-semibold capitalize text-foreground">
                          {m.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[13px] font-bold tabular-nums text-foreground">
                          {formatCurrency(m.endValue)}
                        </p>
                        <p
                          className={cn(
                            "font-mono text-[11px] tabular-nums",
                            isPositive ? "text-gain" : "text-loss"
                          )}
                        >
                          {isPositive ? "+" : ""}
                          {formatCurrency(m.change)} ({formatPercent(m.changePercent)})
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </SectionCard>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
