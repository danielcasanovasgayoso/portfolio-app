import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, FileText, Mail } from "lucide-react";
import {
  PortfolioSummaryCard,
  PortfolioSection,
  AllocationBreakdown,
  type AllocationItem,
} from "@/components/portfolio";
import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPortfolioData } from "@/services/portfolio.service";
import { requireAuth } from "@/lib/auth";
import {
  assignAssetAccentColors,
  getAssetAccentColor,
} from "@/lib/asset-colors";
import {
  PortfolioAllocationBreakdownSkeleton,
  PortfolioSummarySkeleton,
  PortfolioSectionSkeleton,
} from "@/components/skeletons";

export default async function InvestmentsPage() {
  const user = await requireAuth();
  const t = await getTranslations("portfolio");

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto motion-safe:animate-fade-in">
        {/* Header renders instantly — no data dependency */}
        <PageHeader
          title={t("title")}
          actions={
            <>
              <RefreshPricesButton />
              <Link
                href="/investments/transactions/new"
                aria-label={t("addFirstTransaction")}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </>
          }
        />

        {/* Data-dependent content streams in via Suspense */}
        <Suspense fallback={<InvestmentsContentSkeleton />}>
          <InvestmentsContent userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}

async function InvestmentsContent({ userId }: { userId: string }) {
  const data = await getPortfolioData(userId);
  const t = await getTranslations("portfolio");

  const allHoldings = [
    ...data.holdings.funds,
    ...data.holdings.etfs,
    ...data.holdings.stocks,
    ...data.holdings.pensions,
  ];

  if (allHoldings.length === 0) {
    return <PortfolioEmptyState />;
  }

  const accentColors = assignAssetAccentColors(allHoldings.map((h) => h.id));
  const totalMarketValue = data.totals.total?.marketValue ?? 0;

  // Per-holding allocation by market value, reusing each holding's accent color.
  const allocationItems: AllocationItem[] = allHoldings.map((h) => ({
    id: h.id,
    name: h.name,
    value: h.marketValue,
    color: accentColors.get(h.id) ?? getAssetAccentColor(h.id),
  }));

  const sections = [
    { key: "funds", title: t("funds"), holdings: data.holdings.funds, totals: data.totals.funds },
    { key: "etfs", title: t("etfs"), holdings: data.holdings.etfs, totals: data.totals.etfs },
    { key: "stocks", title: t("stocks"), holdings: data.holdings.stocks, totals: data.totals.stocks },
    { key: "pensions", title: t("pensions"), holdings: data.holdings.pensions, totals: data.totals.pensions },
  ];

  return (
    <>
      {/* Summary Card */}
      <div className="px-4 md:px-8 mb-6">
        <PortfolioSummaryCard totals={data.totals.total} />
      </div>

      {/* Quick links into the domain's sub-screens */}
      <div className="px-4 md:px-8 mb-6 flex gap-3">
        <Link
          href="/investments/transactions"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors active:scale-[0.98]"
        >
          <FileText className="h-4 w-4 text-primary" />
          {t("transactions")}
        </Link>
        <Link
          href="/investments/import"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors active:scale-[0.98]"
        >
          <Mail className="h-4 w-4 text-primary" />
          {t("importFromGmail")}
        </Link>
      </div>

      {/* Allocation by weight — makes relative sizing obvious */}
      {allocationItems.length > 1 && (
        <div className="px-4 md:px-8 mb-12">
          <AllocationBreakdown items={allocationItems} />
        </div>
      )}

      {/* Holdings by asset class */}
      {sections.map((s) => (
        <PortfolioSection
          key={s.key}
          title={s.title}
          holdings={s.holdings}
          totals={s.totals}
          totalPortfolioValue={totalMarketValue}
          accentColors={accentColors}
        />
      ))}
    </>
  );
}

function InvestmentsContentSkeleton() {
  return (
    <>
      <div className="px-4 md:px-8 mb-6">
        <PortfolioSummarySkeleton />
      </div>
      <div className="px-4 md:px-8 mb-12">
        <PortfolioAllocationBreakdownSkeleton />
      </div>
      <PortfolioSectionSkeleton />
      <PortfolioSectionSkeleton />
    </>
  );
}
