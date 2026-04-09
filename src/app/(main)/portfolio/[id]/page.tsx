import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CopyTickerButton } from "@/components/asset-detail/CopyTickerButton";
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
import { RefreshAssetButton } from "@/components/asset-detail/RefreshAssetButton";
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase">
              {holding.category}
            </Badge>
            {!holding.manualPricing && holding.assetId && (
              <RefreshAssetButton assetId={holding.assetId} />
            )}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
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

        <Card>
          <CardHeader>
            <CardTitle>{t("performance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">
                {holding.manualPricing ? t("costBasis") : t("marketValue")}
              </span>
              <span className="font-semibold">
                {formatCurrency(holding.marketValue)}
              </span>
            </div>
            {!holding.manualPricing && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("costBasis")}</span>
                  <span className="font-semibold">
                    {formatCurrency(holding.costBasis)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("unrealizedGainLoss")}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(holding.gainLoss)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("totalReturn")}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatPercent(holding.gainLossPercent)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">{t("shares")}</span>
                  <span className="font-semibold">
                    {formatShares(holding.shares)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!holding.manualPricing && (
          <Card>
            <CardHeader>
              <CardTitle>{t("priceInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{t("ticker")}</span>
                <span className="font-semibold flex items-center">
                  {holding.ticker && <CopyTickerButton ticker={holding.ticker} />}
                  {holding.ticker || "—"}
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
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{t("averagePrice")}</span>
                <span className="font-semibold">
                  {formatCurrency(holding.avgPrice)}
                </span>
              </div>
              {holding.priceDate && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">{t("priceDate")}</span>
                  <span className="font-semibold">
                    {formatDate(holding.priceDate)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("transactionHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <TransactionTimeline transactions={transactions} currentPrice={holding.manualPricing ? null : holding.currentPrice} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
