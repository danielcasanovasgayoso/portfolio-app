import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementsList } from "@/components/wallet/MovementsList";
import { PriceChart } from "@/components/charts";
import {
  getWalletSummary,
  getCashMovements,
  getWalletBalanceHistory,
} from "@/services/wallet.service";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

export default async function WalletPage() {
  const user = await requireAuth();
  const t = await getTranslations("wallet");

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav max-w-5xl mx-auto">
        <PageHeader
          title={t("title")}
          actions={
            <Link
              href="/wallet/new"
              aria-label={t("addMovement")}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </Link>
          }
        />

        <Suspense fallback={<WalletSkeleton />}>
          <WalletContent userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}

async function WalletContent({ userId }: { userId: string }) {
  const [summary, movements, history] = await Promise.all([
    getWalletSummary(userId),
    getCashMovements(userId),
    getWalletBalanceHistory(userId),
  ]);
  const t = await getTranslations("wallet");

  if (movements.length === 0) {
    return <WalletEmptyState />;
  }

  return (
    <>
      {/* Balance hero */}
      <div className="px-4 md:px-8 mb-6">
        <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8">
          <span className="label-sm block mb-3 sm:mb-6">{t("balance")}</span>
          <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground sensitive-amount mb-6">
            {formatCurrency(summary.balance)}
          </p>

          <div className="grid grid-cols-2 divide-x divide-white/10">
            <div className="min-w-0 space-y-0.5 pr-4">
              <span className="label-sm flex items-center gap-1.5 text-muted-foreground">
                <ArrowDownCircle className="h-3 w-3 text-gain" />
                {t("totalDeposits")}
              </span>
              <p className="text-sm font-mono font-bold tracking-tight text-gain tabular-nums sensitive-amount">
                +{formatCurrency(summary.totalDeposits)}
              </p>
            </div>
            <div className="min-w-0 space-y-0.5 pl-4">
              <span className="label-sm flex items-center gap-1.5 text-muted-foreground">
                <ArrowUpCircle className="h-3 w-3 text-loss" />
                {t("totalWithdrawals")}
              </span>
              <p className="text-sm font-mono font-bold tracking-tight text-loss tabular-nums sensitive-amount">
                −{formatCurrency(summary.totalWithdrawals)}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Balance evolution */}
      {history.length > 1 && (
        <div className="px-4 md:px-8 mb-6">
          <article className="bg-card rounded-xl shadow-ambient p-6">
            <span className="label-sm block mb-4">{t("evolution")}</span>
            <PriceChart data={history} showTimeframes />
          </article>
        </div>
      )}

      {/* Movement history */}
      <section className="mt-8">
        <header className="px-5 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {t("movements")}
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {t("movementCount", { count: movements.length })}
            </span>
          </div>
        </header>
        <div className="mx-4">
          <MovementsList movements={movements} />
        </div>
      </section>
    </>
  );
}

async function WalletEmptyState() {
  const t = await getTranslations("wallet");

  return (
    <div className="px-4 md:px-8">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-8 sm:p-12 text-center">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            {t("emptyTitle")}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-sm mb-8">
            {t("emptyDescription")}
          </p>
          <Link
            href="/wallet/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t("addMovement")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="px-4 md:px-8 space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
