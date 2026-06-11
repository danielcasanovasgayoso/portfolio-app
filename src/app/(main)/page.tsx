import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Wallet,
  TrendingUp,
  Home,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AllocationBreakdown, type AllocationItem } from "@/components/portfolio";
import { PriceChart } from "@/components/charts";
import { getDashboardData } from "@/services/dashboard.service";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/skeletons";

// Domain accent colors for the breakdown bars.
const DOMAIN_COLORS = {
  wallet: "#f59e0b", // amber
  investments: "#4648D4", // primary indigo
  realEstate: "#14b8a6", // teal
} as const;

export default async function DashboardPage() {
  const user = await requireAuth();
  const t = await getTranslations("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto">
        <PageHeader title={t("title")} />

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}

async function DashboardContent({ userId }: { userId: string }) {
  const data = await getDashboardData(userId);
  const t = await getTranslations("dashboard");

  if (data.isEmpty) {
    return <DashboardEmptyState />;
  }

  const allocationItems: AllocationItem[] = [
    {
      id: "wallet",
      name: t("wallet"),
      value: data.wallet.balance,
      color: DOMAIN_COLORS.wallet,
    },
    {
      id: "investments",
      name: t("investments"),
      value: data.investments.marketValue,
      color: DOMAIN_COLORS.investments,
    },
    {
      id: "real-estate",
      name: t("realEstate"),
      value: data.realEstate.userEquity,
      color: DOMAIN_COLORS.realEstate,
    },
  ].filter((i) => i.value > 0);

  return (
    <>
      {/* Net worth hero with combined evolution */}
      <div className="px-4 md:px-8 mb-6">
        <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8">
          <span className="label-sm block mb-3 sm:mb-6">{t("netWorth")}</span>
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground sensitive-amount mb-2">
            {formatCurrency(data.netWorth)}
          </p>
          {data.history.length > 1 && (
            <PriceChart data={data.history} showTimeframes variant="onDark" />
          )}
        </article>
      </div>

      {/* One card per domain — the only cross-domain surface, read-only */}
      <div className="px-4 md:px-8 mb-6 grid gap-3 sm:grid-cols-3">
        <DomainCard
          href="/wallet"
          icon={<Wallet className="h-5 w-5" />}
          color={DOMAIN_COLORS.wallet}
          title={t("wallet")}
          value={data.wallet.balance}
          description={t("walletDescription")}
        />
        <DomainCard
          href="/investments"
          icon={<TrendingUp className="h-5 w-5" />}
          color={DOMAIN_COLORS.investments}
          title={t("investments")}
          value={data.investments.marketValue}
          description={t("investmentsDescription", {
            count: data.investments.holdingsCount,
          })}
          gainLoss={data.investments.gainLoss}
          gainLossPercent={data.investments.gainLossPercent}
        />
        <DomainCard
          href="/real-estate"
          icon={<Home className="h-5 w-5" />}
          color={DOMAIN_COLORS.realEstate}
          title={t("realEstate")}
          value={data.realEstate.userEquity}
          description={t("realEstateDescription", {
            count: data.realEstate.propertiesCount,
          })}
          gainLoss={data.realEstate.userGain}
          gainLossPercent={data.realEstate.userGainPercent}
        />
      </div>

      {/* Relative weight of each domain */}
      {allocationItems.length > 1 && (
        <div className="px-4 md:px-8 mb-12">
          <AllocationBreakdown items={allocationItems} />
        </div>
      )}
    </>
  );
}

function DomainCard({
  href,
  icon,
  color,
  title,
  value,
  description,
  gainLoss,
  gainLossPercent,
}: {
  href: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  value: number;
  description: string;
  gainLoss?: number;
  gainLossPercent?: number;
}) {
  const hasGain = gainLoss !== undefined && gainLossPercent !== undefined;
  const isPositive = (gainLoss ?? 0) >= 0;

  return (
    <Link href={href} className="block group">
      <article className="relative bg-card rounded-xl shadow-ambient p-5 overflow-hidden transition-transform duration-150 active:scale-[0.98] h-full">
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: color }}
        />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex shrink-0 items-center justify-center h-9 w-9 rounded-xl"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                color,
              }}
            >
              {icon}
            </div>
            <h2 className="text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {title}
            </h2>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
        <p className="text-2xl font-mono font-bold tracking-tight tabular-nums sensitive-amount">
          {formatCurrency(value)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-[12px]">
          <span className="text-muted-foreground truncate">{description}</span>
          {hasGain && gainLoss !== 0 && (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums shrink-0",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {formatPercent(gainLossPercent!)}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

async function DashboardEmptyState() {
  const t = await getTranslations("dashboard");

  const links = [
    { href: "/wallet", label: t("goToWallet"), icon: <Wallet className="w-4 h-4" /> },
    { href: "/investments", label: t("goToInvestments"), icon: <TrendingUp className="w-4 h-4" /> },
    { href: "/real-estate", label: t("goToRealEstate"), icon: <Home className="w-4 h-4" /> },
  ];

  return (
    <div className="px-4 md:px-8">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-8 sm:p-12 text-center">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
            <LayoutDashboard className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            {t("emptyTitle")}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-sm mb-8">
            {t("emptyDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                {l.icon}
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
