import { Header } from "@/components/layout/Header";
import {
  PortfolioSummaryCard,
  PortfolioSection,
} from "@/components/portfolio";
import { getMockPortfolioData } from "@/data/mock-portfolio";

export default function PortfolioPage() {
  const data = getMockPortfolioData();

  return (
    <div className="min-h-screen pb-12">
      <Header title="Portfolio" />

      <main className="pt-4">
        <PortfolioSummaryCard
          grand={data.totals.grand}
          invested={data.totals.invested}
        />

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
      </main>
    </div>
  );
}
