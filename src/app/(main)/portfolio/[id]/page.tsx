import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getHoldingById, getAssetTransactions } from "@/services/portfolio.service";
import { getPriceHistory } from "@/services/price.service";
import { requireAuth } from "@/lib/auth";
import { HeroBackdrop, MobileShell, SectionCard } from "@/components/pulse";
import { AssetDetailHero } from "@/components/asset-detail/AssetDetailHero";
import { TransactionTimeline } from "@/components/asset-detail/TransactionTimeline";
import { CopyTickerButton } from "@/components/asset-detail/CopyTickerButton";
import { PriceChart } from "@/components/charts";
import {
  formatCurrency,
  formatPercent,
  formatShares,
  getGainClass,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const holding = await getHoldingById(user.id, id);
  const t = await getTranslations("assetDetail");

  if (!holding) {
    notFound();
  }

  const [priceHistory, transactions] = await Promise.all([
    holding.assetId ? getPriceHistory(holding.assetId) : Promise.resolve([]),
    holding.assetId
      ? getAssetTransactions(user.id, holding.assetId)
      : Promise.resolve([]),
  ]);

  const isPositive = getGainClass(holding.gainLoss) === "positive";

  const chartData = priceHistory.map((p) => ({
    date: p.date.toISOString().split("T")[0],
    close: p.close,
    open: p.open,
    high: p.high,
    low: p.low,
  }));

  const recent = transactions.slice(0, 5);

  return (
    <MobileShell>
      <HeroBackdrop height={380} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <AssetDetailHero holding={holding} />

        {!holding.manualPricing && chartData.length > 0 && (
          <div className="mt-6">
            <SectionCard>
              <PriceChart data={chartData} avgPrice={holding.avgPrice} />
            </SectionCard>
          </div>
        )}

        {!holding.manualPricing && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile label={t("quantity")} value={formatShares(holding.shares)} />
            <StatTile
              label={t("avgCost")}
              value={formatCurrency(holding.avgPrice)}
            />
            <StatTile
              label={t("totalReturn")}
              value={formatPercent(holding.gainLossPercent)}
              className={isPositive ? "text-gain" : "text-loss"}
            />
          </div>
        )}

        {!holding.manualPricing && (
          <div className="mt-5">
            <h2 className="px-1 pb-2 text-[14px] font-semibold tracking-tight text-foreground">
              {t("priceInformation")}
            </h2>
            <SectionCard ambient={false}>
              <dl className="divide-y divide-[var(--outline-variant)]">
                <Row label={t("ticker")}>
                  <span className="inline-flex items-center font-mono">
                    {holding.ticker && <CopyTickerButton ticker={holding.ticker} />}
                    {holding.ticker || "—"}
                  </span>
                </Row>
                <Row label={t("currentPrice")}>
                  {holding.currentPrice
                    ? formatCurrency(holding.currentPrice)
                    : "—"}
                </Row>
                <Row label={t("averagePrice")}>
                  {formatCurrency(holding.avgPrice)}
                </Row>
                {holding.priceDate && (
                  <Row label={t("priceDate")}>
                    {new Date(holding.priceDate).toLocaleDateString()}
                  </Row>
                )}
              </dl>
            </SectionCard>
          </div>
        )}

        <div className="mt-5">
          <h2 className="px-1 pb-2 text-[14px] font-semibold tracking-tight text-foreground">
            {t("recentActivity")}
          </h2>
          {recent.length === 0 ? (
            <SectionCard ambient={false} className="text-center">
              <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
            </SectionCard>
          ) : (
            <TransactionTimeline
              transactions={recent}
              currentPrice={holding.manualPricing ? null : holding.currentPrice}
            />
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-card p-3 ghost-border">
      <div className="label-sm mb-1">{label}</div>
      <div
        className={cn(
          "font-mono text-[13px] font-bold tabular-nums text-foreground",
          className
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
        {children}
      </dd>
    </div>
  );
}
