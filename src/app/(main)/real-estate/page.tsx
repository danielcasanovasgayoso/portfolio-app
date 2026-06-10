import { Suspense } from "react";
import Link from "next/link";
import { Plus, Home } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { PriceChart } from "@/components/charts";
import {
  getProperties,
  getRealEstateSummary,
  getRealEstateEquityHistory,
} from "@/services/real-estate.service";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const addButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 py-2";

export default async function RealEstatePage() {
  const user = await requireAuth();
  const t = await getTranslations("realEstate");

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto motion-safe:animate-fade-in">
        <PageHeader
          title={t("title")}
          actions={
            <Link
              href="/real-estate/new"
              aria-label={t("addProperty")}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </Link>
          }
        />

        <Suspense fallback={<RealEstateSkeleton />}>
          <RealEstateContent userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}

async function RealEstateContent({ userId }: { userId: string }) {
  const [properties, summary, history] = await Promise.all([
    getProperties(userId),
    getRealEstateSummary(userId),
    getRealEstateEquityHistory(userId),
  ]);
  const t = await getTranslations("realEstate");

  if (properties.length === 0) {
    return <RealEstateEmptyState />;
  }

  const gainPositive = summary.userGain >= 0;

  return (
    <>
      {/* Equity hero — aggregate figures so the screen reads as a portfolio,
          not a lone card, even with a single property. */}
      <div className="px-4 md:px-8 mb-6">
        <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8">
          <span className="label-sm block mb-3 sm:mb-6">{t("equity")}</span>
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground sensitive-amount mb-3">
            {formatCurrency(summary.userEquity)}
          </p>
          <p
            className={cn(
              "text-sm font-mono font-bold tracking-tight tabular-nums sensitive-amount mb-6",
              gainPositive ? "text-gain" : "text-loss"
            )}
          >
            {gainPositive ? "+" : "−"}
            {formatCurrency(Math.abs(summary.userGain))} (
            {formatPercent(summary.userGainPercent)})
          </p>

          <div className="grid grid-cols-2 divide-x divide-white/10">
            <div className="min-w-0 space-y-0.5 pr-4">
              <span className="label-sm text-muted-foreground">
                {t("marketValue")}
              </span>
              <p className="text-sm font-mono font-bold tracking-tight tabular-nums text-foreground sensitive-amount">
                {formatCurrency(summary.marketValue)}
              </p>
            </div>
            <div className="min-w-0 space-y-0.5 pl-4">
              <span className="label-sm text-muted-foreground">
                {t("mortgageBalance")}
              </span>
              <p className="text-sm font-mono font-bold tracking-tight tabular-nums text-foreground sensitive-amount">
                {formatCurrency(summary.mortgageBalance)}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Equity evolution — only meaningful with more than one data point. */}
      {history.length > 1 && (
        <div className="px-4 md:px-8 mb-6">
          <article className="bg-card rounded-xl shadow-ambient p-6">
            <span className="label-sm block mb-4">{t("valueOverTime")}</span>
            <PriceChart data={history} showTimeframes />
          </article>
        </div>
      )}

      {/* Properties */}
      <section className="mt-8">
        <header className="px-5 pb-4">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {t("properties")}
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {summary.propertiesCount}
          </span>
        </header>
        <div className="px-4 grid gap-4 sm:grid-cols-2">
          {properties.map((p) => (
            <Link key={p.id} href={`/real-estate/${p.id}`}>
              <Card className="transition-all hover:bg-muted/40 active:scale-[0.99]">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
                      <Home className="h-5 w-5" />
                    </div>
                    <span className="font-semibold truncate">{p.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("marketValue")}</p>
                      <p className="font-semibold sensitive-amount">
                        {p.marketValue != null ? formatCurrency(p.marketValue) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("mortgageBalance")}</p>
                      <p className="font-semibold sensitive-amount">
                        {p.mortgageBalance != null
                          ? formatCurrency(p.mortgageBalance)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("equity")}</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 sensitive-amount">
                        {p.equity != null ? formatCurrency(p.equity) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("acquisitionCost")}</p>
                      <p className="font-semibold sensitive-amount">
                        {formatCurrency(p.acquisitionTotal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

async function RealEstateEmptyState() {
  const t = await getTranslations("realEstate");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
        <Home className="h-7 w-7" />
      </div>
      <p className="text-lg font-medium">{t("emptyTitle")}</p>
      <p className="text-sm text-muted-foreground mb-6">{t("emptyDescription")}</p>
      <Link href="/real-estate/new" className={addButtonClass}>
        <Plus className="mr-2 h-4 w-4" />
        {t("addProperty")}
      </Link>
    </div>
  );
}

function RealEstateSkeleton() {
  return (
    <div className="px-4 md:px-8 space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
