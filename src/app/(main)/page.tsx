import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  PortfolioSummaryCard,
  PortfolioSection,
  AllocationBreakdown,
  type AllocationSegment,
} from "@/components/portfolio";
import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { getPortfolioData } from "@/services/portfolio.service";
import { getRealEstateSummary } from "@/services/real-estate.service";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { assignAssetAccentColors, CATEGORY_COLORS } from "@/lib/asset-colors";
import {
  PortfolioSummarySkeleton,
  PortfolioSectionSkeleton,
} from "@/components/skeletons";

export default async function PortfolioPage() {
  const user = await requireAuth();
  const t = await getTranslations("portfolio");

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-[max(1.5rem,env(safe-area-inset-top))] pb-nav max-w-5xl mx-auto">
        {/* Header renders instantly — no data dependency */}
        <div className="flex justify-between items-center px-8 mb-8">
          <div className="flex flex-col max-w-[60%]">
             <h1 className="text-[1.75rem] font-bold tracking-tight">{t("title")}</h1>
          </div>
          <div>
            <RefreshPricesButton />
          </div>
        </div>

        {/* Data-dependent content streams in via Suspense */}
        <Suspense fallback={<PortfolioContentSkeleton />}>
          <PortfolioContent userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}

async function PortfolioContent({ userId }: { userId: string }) {
  const [data, realEstate] = await Promise.all([
    getPortfolioData(userId),
    getRealEstateSummary(userId),
  ]);
  const t = await getTranslations("portfolio");

  const hasRealEstate = realEstate.userEquity !== 0;
  const isEmpty =
    data.holdings.funds.length === 0 &&
    data.holdings.stocks.length === 0 &&
    data.holdings.pp.length === 0 &&
    data.holdings.others.length === 0 &&
    !hasRealEstate;

  if (isEmpty) {
    return <PortfolioEmptyState />;
  }

  const accentColors = assignAssetAccentColors([
    ...data.holdings.funds,
    ...data.holdings.stocks,
    ...data.holdings.pp,
    ...data.holdings.others,
  ].map((h) => h.id));

  // Asset-class breakdown for the allocation bar. Cash/Other has no cost basis,
  // so its return is suppressed. Real-estate equity is folded in as its own class.
  const allocationSegments: AllocationSegment[] = [
    { key: "funds", label: t("funds"), totals: data.totals.funds, showReturn: true },
    { key: "stocks", label: t("stocksEtfs"), totals: data.totals.stocks, showReturn: true },
    { key: "pp", label: t("pp"), totals: data.totals.pp, showReturn: true },
    { key: "others", label: t("others"), totals: data.totals.others, showReturn: false },
  ]
    .filter((s) => s.totals && s.totals.marketValue > 0)
    .map((s) => ({
      key: s.key,
      label: s.label,
      value: s.totals!.marketValue,
      gainLossPercent: s.totals!.gainLossPercent,
      showReturn: s.showReturn,
      color: CATEGORY_COLORS[s.key],
    }));

  if (hasRealEstate && realEstate.userEquity > 0) {
    allocationSegments.push({
      key: "realEstate",
      label: t("realEstate"),
      value: realEstate.userEquity,
      gainLossPercent: realEstate.userGainPercent,
      showReturn: true,
      color: CATEGORY_COLORS.realEstate,
    });
  }

  return (
    <>
      {/* Summary Card */}
      <div className="px-4 md:px-8 mb-6">
        <PortfolioSummaryCard
          grand={data.totals.grand}
          invested={data.totals.invested}
          other={data.totals.others}
          realEstate={{
            value: realEstate.userEquity,
            gainLoss: realEstate.userGain,
            gainLossPercent: realEstate.userGainPercent,
          }}
        />
      </div>

      {/* Asset-class allocation — makes relative sizing (e.g. cash drag) obvious */}
      {allocationSegments.length > 1 && (
        <div className="px-4 md:px-8 mb-12">
          <AllocationBreakdown segments={allocationSegments} />
        </div>
      )}

      {/* Holdings by Category */}
      <PortfolioSection
        title={t("funds")}
        holdings={data.holdings.funds}
        totals={data.totals.funds}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
        accentColors={accentColors}
      />
      <PortfolioSection
        title={t("stocksEtfs")}
        holdings={data.holdings.stocks}
        totals={data.totals.stocks}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
        accentColors={accentColors}
      />
      <PortfolioSection
        title={t("pp")}
        holdings={data.holdings.pp}
        totals={data.totals.pp}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
        accentColors={accentColors}
      />
      <PortfolioSection
        title={t("others")}
        holdings={data.holdings.others}
        totals={data.totals.others}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
        isOther
        accentColors={accentColors}
      />

      {hasRealEstate && (
        <section className="mt-8">
          <header className="px-5 pb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {t("realEstate")}
              </h2>
              <p className="text-xl font-mono font-bold text-foreground tabular-nums">
                {formatCurrency(realEstate.userEquity)}
              </p>
            </div>
          </header>

          <div className="mx-4 flex flex-col gap-3">
            <Link href="/real-estate" className="block group">
              <article className="relative bg-card rounded-xl shadow-sm px-4 py-3 pl-5 border-0 overflow-hidden transition-transform duration-150 active:scale-[0.98]">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                <div className="flex items-center justify-between gap-1.5">
                  <h3 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {t("realEstateEquity")}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
                <div className="flex items-end justify-end gap-3 mt-1">
                  <p className="text-[12px] font-mono font-bold text-foreground tabular-nums">
                    {formatCurrency(realEstate.userEquity)}
                  </p>
                </div>
              </article>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function PortfolioContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="px-4 md:px-8">
        <PortfolioSummarySkeleton />
      </div>
      <PortfolioSectionSkeleton />
      <PortfolioSectionSkeleton />
    </div>
  );
}
