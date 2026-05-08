"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  TransactionFilters,
  TransactionForm,
  TransactionTable,
} from "@/components/transactions";
import { TransactionsHero } from "@/components/transactions/TransactionsHero";
import type { PaginatedResult, SerializedTransaction } from "@/types/transaction";
import type { Asset } from "@prisma/client";

interface TransactionsContentProps {
  transactions: PaginatedResult<SerializedTransaction>;
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
  heroTotals: {
    netCashFlow: number;
    buyTotal: number;
    dividendTotal: number;
  };
}

export function TransactionsContent({
  transactions,
  assets,
  heroTotals,
}: TransactionsContentProps) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const searchParams = useSearchParams();

  const shouldOpenForm = searchParams.get("openForm") === "true";
  const [isFormOpen, setIsFormOpen] = useState(shouldOpenForm);

  useEffect(() => {
    if (!shouldOpenForm) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openForm");
    const newUrl = params.toString()
      ? `/transactions?${params.toString()}`
      : "/transactions";
    router.replace(newUrl);
  }, [shouldOpenForm, searchParams, router]);

  const handleTransactionChange = () => router.refresh();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <>
      <TransactionsHero
        netCashFlow={heroTotals.netCashFlow}
        buyTotal={heroTotals.buyTotal}
        dividendTotal={heroTotals.dividendTotal}
      />

      <details className="mt-5 group">
        <summary className="flex cursor-pointer items-center justify-between rounded-2xl bg-card px-3.5 py-2.5 ghost-border shadow-sm">
          <span className="text-[13px] font-semibold text-foreground">
            {t("more")}
          </span>
          <span className="label-sm">
            {t("count", { count: transactions.total })}
          </span>
        </summary>
        <div className="mt-3">
          <TransactionFilters assets={assets} hideTypes />
        </div>
      </details>

      <div className="mt-5">
        <TransactionTable
          transactions={transactions.data}
          assets={assets}
          onTransactionChange={handleTransactionChange}
        />
      </div>

      {transactions.totalPages > 1 && (
        <div className="mt-5 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    transactions.page > 1 && handlePageChange(transactions.page - 1)
                  }
                  className={
                    transactions.page <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from(
                { length: transactions.totalPages },
                (_, i) => i + 1
              )
                .filter(
                  (page) =>
                    page === 1 ||
                    page === transactions.totalPages ||
                    Math.abs(page - transactions.page) <= 1
                )
                .map((page, index, arr) => {
                  const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                  return (
                    <span key={page} className="flex items-center">
                      {showEllipsis && (
                        <PaginationItem>
                          <span className="px-2 text-muted-foreground">…</span>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === transactions.page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </span>
                  );
                })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    transactions.page < transactions.totalPages &&
                    handlePageChange(transactions.page + 1)
                  }
                  className={
                    transactions.page >= transactions.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        assets={assets}
        onSuccess={handleTransactionChange}
      />
    </>
  );
}
