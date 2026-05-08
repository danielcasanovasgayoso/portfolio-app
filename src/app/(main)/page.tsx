import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { HeroBackdrop, MobileShell } from "@/components/pulse";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { DashboardHero } from "@/components/portfolio/DashboardHero";
import { AllocationCard } from "@/components/portfolio/AllocationCard";
import { getPortfolioData } from "@/services/portfolio.service";
import { requireAuth } from "@/lib/auth";
import { DashboardSkeleton } from "@/components/skeletons";

const HERO_HEIGHT = 360;

export default async function PortfolioPage() {
  const user = await requireAuth();

  return (
    <MobileShell>
      <HeroBackdrop height={HERO_HEIGHT} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Suspense fallback={<DashboardSkeleton email={user.email} />}>
          <DashboardContent userId={user.id} email={user.email} />
        </Suspense>
      </div>
    </MobileShell>
  );
}

async function DashboardContent({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const data = await getPortfolioData(userId);
  const t = await getTranslations("portfolio");

  const isEmpty =
    data.holdings.funds.length === 0 &&
    data.holdings.stocks.length === 0 &&
    data.holdings.pp.length === 0 &&
    data.holdings.others.length === 0;

  const grand = data.totals.grand;
  const reference = data.totals.invested ?? grand;

  return (
    <>
      <DashboardHero
        email={email}
        totalNetWorth={grand?.marketValue ?? null}
        gainLoss={reference?.gainLoss ?? null}
        gainLossPercent={reference?.gainLossPercent ?? null}
      />

      {isEmpty ? (
        <PortfolioEmptyState />
      ) : (
        <>
          <div className="mt-5">
            <AllocationCard summary={data} />
          </div>

          <div className="mt-5">
            <h2 className="px-1 text-[15px] font-semibold tracking-tight text-foreground">
              {t("holdings")}
            </h2>
          </div>

          <div className="mt-3 space-y-6">
            <PortfolioSection
              title={t("funds")}
              holdings={data.holdings.funds}
              totals={data.totals.funds}
              totalPortfolioValue={grand?.marketValue ?? 0}
            />
            <PortfolioSection
              title={t("stocksEtfs")}
              holdings={data.holdings.stocks}
              totals={data.totals.stocks}
              totalPortfolioValue={grand?.marketValue ?? 0}
            />
            <PortfolioSection
              title={t("pp")}
              holdings={data.holdings.pp}
              totals={data.totals.pp}
              totalPortfolioValue={grand?.marketValue ?? 0}
            />
            <PortfolioSection
              title={t("others")}
              holdings={data.holdings.others}
              totals={data.totals.others}
              totalPortfolioValue={grand?.marketValue ?? 0}
              isOther
            />
          </div>
        </>
      )}
    </>
  );
}
