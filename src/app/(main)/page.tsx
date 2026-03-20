import { Suspense } from "react";
import {
  PortfolioSummaryCard,
  PortfolioSection,
} from "@/components/portfolio";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { getPortfolioData } from "@/services/portfolio.service";
import { requireAuth } from "@/lib/auth";
import {
  PortfolioSummarySkeleton,
  PortfolioSectionSkeleton,
} from "@/components/skeletons";

export default async function PortfolioPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-6 pb-24 max-w-5xl mx-auto">
        {/* Header renders instantly — no data dependency */}
        <div className="flex justify-between items-start px-8 mb-12">
          <div className="flex flex-col max-w-[60%]">
             <h1 className="display-lg tracking-tight">Portfolio</h1>
             <p className="body-md text-muted-foreground mt-2">Monitor and curate your assets with precision.</p>
          </div>
          <div className="mt-2">
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
  const data = await getPortfolioData(userId);

  return (
    <>
      {/* Summary Card */}
      <div className="px-4 md:px-8 mb-12">
        <PortfolioSummaryCard
          grand={data.totals.grand}
          invested={data.totals.invested}
        />
      </div>

      {/* Holdings by Category */}
      <PortfolioSection
        title="Funds"
        holdings={data.holdings.funds}
        totals={data.totals.funds}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
      />
      <PortfolioSection
        title="Stocks & ETFs"
        holdings={data.holdings.stocks}
        totals={data.totals.stocks}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
      />
      <PortfolioSection
        title="PP"
        holdings={data.holdings.pp}
        totals={data.totals.pp}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
      />
      <PortfolioSection
        title="Others"
        holdings={data.holdings.others}
        totals={data.totals.others}
        totalPortfolioValue={data.totals.grand?.marketValue ?? 0}
        isOther
      />

    </>
  );
}

function PortfolioContentSkeleton() {
  return (
    <div className="space-y-6 pb-20">
      <div className="px-4 md:px-8">
        <PortfolioSummarySkeleton />
      </div>
      <PortfolioSectionSkeleton />
      <PortfolioSectionSkeleton />
    </div>
  );
}
