import { Suspense } from "react";
import { HeroBackdrop, MobileShell } from "@/components/pulse";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactions, getAssets } from "@/actions/transactions";
import { TransactionsContent } from "./TransactionsContent";
import { requireAuth } from "@/lib/auth";

interface TransactionsPageProps {
  searchParams: Promise<{
    types?: string;
    assetId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    perPage?: string;
  }>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  await requireAuth();

  return (
    <MobileShell>
      <HeroBackdrop height={320} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Suspense fallback={<TransactionsLoadingFallback />}>
          <TransactionsLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </MobileShell>
  );
}

async function TransactionsLoader({
  searchParams,
}: {
  searchParams: TransactionsPageProps["searchParams"];
}) {
  const params = await searchParams;

  const filters = {
    types: params.types?.split(",").filter(Boolean) as
      | ("BUY" | "SELL" | "DIVIDEND" | "FEE" | "TRANSFER")[]
      | undefined,
    assetId: params.assetId,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    page: params.page ? parseInt(params.page) : 1,
    perPage: params.perPage ? parseInt(params.perPage) : 20,
  };

  const [transactionsResult, assets, last30] = await Promise.all([
    getTransactions(filters),
    getAssets(),
    (() => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return getTransactions({ dateFrom: cutoff, page: 1, perPage: 1000 });
    })(),
  ]);

  let buyTotal = 0;
  let sellTotal = 0;
  let dividendTotal = 0;
  for (const tx of last30.data) {
    if (tx.type === "BUY") buyTotal += tx.totalAmount;
    else if (tx.type === "SELL") sellTotal += tx.totalAmount;
    else if (tx.type === "DIVIDEND") dividendTotal += tx.totalAmount;
  }
  const netCashFlow = sellTotal + dividendTotal - buyTotal;

  return (
    <TransactionsContent
      transactions={transactionsResult}
      assets={assets}
      heroTotals={{ netCashFlow, buyTotal, dividendTotal }}
    />
  );
}

function TransactionsLoadingFallback() {
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-2 pb-5">
        <Skeleton className="h-9 w-9 rounded-xl bg-white/20" />
        <Skeleton className="h-3.5 w-32 bg-white/30" />
        <span className="h-9 w-9" />
      </div>
      <div className="px-2 text-center">
        <Skeleton className="mx-auto h-2.5 w-44 bg-white/30" />
        <Skeleton className="mx-auto mt-3 h-9 w-48 bg-white/30" />
        <Skeleton className="mx-auto mt-3 h-5 w-60 rounded-full bg-white/30" />
      </div>
      <Skeleton className="mt-4 h-9 w-full rounded-xl bg-white/20" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </>
  );
}
