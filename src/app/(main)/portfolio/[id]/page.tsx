import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHoldingById, getAssetTransactions } from "@/services/portfolio.service";
import { getPriceHistory } from "@/services/price.service";
import {
  formatCurrency,
  formatPercent,
  formatShares,
  formatDate,
  getGainClass,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PriceChart } from "@/components/charts";
import { TransactionTimeline } from "@/components/asset-detail/TransactionTimeline";
import { requireAuth } from "@/lib/auth";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const holding = await getHoldingById(user.id, id);
  const t = await getTranslations("assetDetail");

  if (!holding) {
    notFound();
  }

  // Fetch price history and transactions in parallel
  const [priceHistory, transactions] = await Promise.all([
    holding.assetId ? getPriceHistory(holding.assetId) : Promise.resolve([]),
    holding.assetId ? getAssetTransactions(user.id, holding.assetId) : Promise.resolve([]),
  ]);

  const gainClass = getGainClass(holding.gainLoss);
  const isPositive = gainClass === "positive";

  // Format price data for chart
  const chartData = priceHistory.map((p) => ({
    date: p.date.toISOString().split("T")[0],
    close: p.close,
    open: p.open,
    high: p.high,
    low: p.low,
  }));

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
            <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
              {holding.name}
            </h1>
            <p className="text-sm text-muted-foreground">{holding.isin}</p>
          </div>
          <Badge variant="secondary" className="uppercase">
            {holding.category}
          </Badge>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card className="bg-gradient-to-br from-indigo-900 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <p className="text-sm font-medium uppercase tracking-wide opacity-85 mb-2">
              {holding.manualPricing ? t("costBasis") : t("marketValue")}
            </p>
            <p className="text-4xl font-bold tracking-tight mb-4">
              {formatCurrency(holding.marketValue)}
            </p>
            {!holding.manualPricing && (
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-300" />
                )}
                <span
                  className={cn(
                    "text-lg font-semibold",
                    isPositive ? "text-emerald-300" : "text-red-300"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrency(holding.gainLoss)} (
                  {formatPercent(holding.gainLossPercent)})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {!holding.manualPricing && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("shares")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatShares(holding.shares)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("costBasis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(holding.costBasis)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {!holding.manualPricing && chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("priceHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart data={chartData} avgPrice={holding.avgPrice} />
            </CardContent>
          </Card>
        )}

        {!holding.manualPricing && (
          <Card>
            <CardHeader>
              <CardTitle>{t("priceInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{t("averagePrice")}</span>
                <span className="font-semibold">
                  {formatCurrency(holding.avgPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{t("currentPrice")}</span>
                <span className="font-semibold">
                  {holding.currentPrice
                    ? formatCurrency(holding.currentPrice)
                    : "—"}
                </span>
              </div>
              {holding.priceDate && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("priceDate")}</span>
                  <span className="font-semibold">
                    {formatDate(holding.priceDate)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{t("ticker")}</span>
                <span className="font-semibold">
                  {holding.ticker || "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {!holding.manualPricing && (
          <Card>
            <CardHeader>
              <CardTitle>{t("performance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("unrealizedGainLoss")}
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(holding.gainLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("totalReturn")}
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatPercent(holding.gainLossPercent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("transactionHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <TransactionTimeline transactions={transactions} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
