import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockHoldingById } from "@/data/mock-portfolio";
import {
  formatCurrency,
  formatPercent,
  formatShares,
  formatDate,
  getGainClass,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const { id } = await params;
  const holding = getMockHoldingById(id);

  if (!holding) {
    notFound();
  }

  const gainClass = getGainClass(holding.gainLoss);
  const isPositive = gainClass === "positive";

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link href="/" aria-label="Back to portfolio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
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
              Market Value
            </p>
            <p className="text-4xl font-bold tracking-tight mb-4">
              {formatCurrency(holding.marketValue)}
            </p>
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shares
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
                Cost Basis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(holding.costBasis)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Price Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Average Price</span>
              <span className="font-semibold">
                {formatCurrency(holding.avgPrice, true)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Current Price</span>
              <span className="font-semibold">
                {holding.currentPrice
                  ? formatCurrency(holding.currentPrice, true)
                  : "—"}
              </span>
            </div>
            {holding.priceDate && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Price Date</span>
                <span className="font-semibold">
                  {formatDate(holding.priceDate)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Ticker</span>
              <span className="font-mono text-sm">
                {holding.ticker || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Unrealized Gain/Loss
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
                  Total Return
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
      </main>
    </div>
  );
}
