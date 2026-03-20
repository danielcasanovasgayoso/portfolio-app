import { Header } from "@/components/layout/Header";
import {
  PortfolioSummaryCard,
  PortfolioSection,
} from "@/components/portfolio";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { CategoryAllocationChart } from "@/components/charts";
import { getPortfolioData } from "@/services/portfolio.service";
import { requireAuth } from "@/lib/auth";

export default async function PortfolioPage() {
  const user = await requireAuth();
  const data = await getPortfolioData(user.id);

  return (
    <div className="min-h-screen">
      <Header title="Portfolio" />

      <main className="pt-6 pb-8">
        {/* Action bar */}
        <div className="flex justify-between items-center px-4 mb-6">
          <div className="flex items-center gap-2">
          </div>
          <RefreshPricesButton />
        </div>

        {/* Hero Summary Card */}
        <PortfolioSummaryCard
          grand={data.totals.grand}
          invested={data.totals.invested}
        />

        {/* Allocation Chart */}
        {data.totals.grand && (
          <div className="mx-4 mt-6">
            <CategoryAllocationChart
              funds={data.totals.funds?.marketValue ?? 0}
              stocks={data.totals.stocks?.marketValue ?? 0}
              pp={data.totals.pp?.marketValue ?? 0}
              others={data.totals.others?.marketValue ?? 0}
            />
          </div>
        )}

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

        {/* Footer timestamp */}
        <div className="mt-10 px-4">
          <div className="terminal-card p-3 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Last Updated: {new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
