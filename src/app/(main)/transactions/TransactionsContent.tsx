"use client";

import { useState, useEffect } from "react";
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
  TransactionTable,
  TransactionFilters,
  TransactionForm,
} from "@/components/transactions";
import type { SerializedTransaction, PaginatedResult } from "@/types/transaction";
import type { Asset } from "@prisma/client";

interface TransactionsContentProps {
  transactions: PaginatedResult<SerializedTransaction>;
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
}

export function TransactionsContent({
  transactions,
  assets,
}: TransactionsContentProps) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenForm = searchParams.get("openForm") === "true";
  const [isFormOpen, setIsFormOpen] = useState(shouldOpenForm);

  // Clean up the ?openForm=true query param after it triggered the form open
  useEffect(() => {
    if (shouldOpenForm) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openForm");
      const newUrl = params.toString()
        ? `/transactions?${params.toString()}`
        : "/transactions";
      router.replace(newUrl);
    }
  }, [shouldOpenForm, searchParams, router]);

  const handleTransactionChange = () => {
    router.refresh();
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {t("count", { count: transactions.total })}
        </p>
      </div>

      {/* Filters */}
      <TransactionFilters assets={assets} />

      {/* Table */}
      <TransactionTable
        transactions={transactions.data}
        assets={assets}
        onTransactionChange={handleTransactionChange}
      />

      {/* Pagination */}
      {transactions.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    transactions.page > 1 &&
                    handlePageChange(transactions.page - 1)
                  }
                  className={
                    transactions.page <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: transactions.totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === transactions.totalPages ||
                    Math.abs(page - transactions.page) <= 1
                  );
                })
                .map((page, index, arr) => {
                  const showEllipsis =
                    index > 0 && page - arr[index - 1] > 1;

                  return (
                    <span key={page} className="flex items-center">
                      {showEllipsis && (
                        <PaginationItem>
                          <span className="px-2 text-muted-foreground">...</span>
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

      {/* Add Transaction Form */}
      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        assets={assets}
        onSuccess={handleTransactionChange}
      />
    </div>
  );
}
