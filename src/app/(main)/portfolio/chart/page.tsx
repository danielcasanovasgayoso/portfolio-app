import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortfolioData, getPortfolioValueHistory } from "@/services/portfolio.service";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PriceChart } from "@/components/charts";
import { requireAuth } from "@/lib/auth";

interface MonthlyChange {
  month: string; // "2026-03"
  label: string; // "Mar 2026"
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
}

function computeMonthlyChanges(
  chartData: { date: string; close: number }[]
): MonthlyChange[] {
  if (chartData.length === 0) return [];

  // Group data points by month (YYYY-MM)
  const byMonth = new Map<string, { first: number; last: number }>();
  for (const point of chartData) {
    const month = point.date.substring(0, 7); // "YYYY-MM"
    const existing = byMonth.get(month);
    if (!existing) {
      byMonth.set(month, { first: point.close, last: point.close });
    } else {
      existing.last = point.close;
    }
  }

  // Get last 12 months
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

    // Start value: previous month's last value, or this month's first value
    const prevMonth = i > 0 ? last12[i - 1] : sortedMonths[sortedMonths.indexOf(month) - 1];
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
  const monthlyChanges = computeMonthlyChanges(chartData).reverse(); // Most recent first

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={t("backToPortfolio")}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {formatCurrency(netWorth)}
            </p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {chartData.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart data={chartData} showTimeframes />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground text-center">
                {t("noData")}
              </p>
            </CardContent>
          </Card>
        )}

        {monthlyChanges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("monthlyChanges")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {monthlyChanges.map((m) => {
                const isPositive = m.change >= 0;
                return (
                  <div
                    key={m.month}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="text-sm font-medium capitalize">
                        {m.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold tabular-nums">
                        {formatCurrency(m.endValue)}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-mono tabular-nums",
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(m.change)} ({formatPercent(m.changePercent)})
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
