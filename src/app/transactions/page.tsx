import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactions, getAssets } from "@/actions/transactions";
import { TransactionsContent } from "./TransactionsContent";

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
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to portfolio"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Transactions
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Suspense fallback={<TransactionsSkeleton />}>
          <TransactionsLoader searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function TransactionsLoader({
  searchParams,
}: {
  searchParams: Promise<{
    types?: string;
    assetId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    perPage?: string;
  }>;
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

  const [transactionsResult, assets] = await Promise.all([
    getTransactions(filters),
    getAssets(),
  ]);

  return (
    <TransactionsContent
      transactions={transactionsResult}
      assets={assets}
    />
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-8 w-[140px]" />
          <Skeleton className="h-8 w-[140px]" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
