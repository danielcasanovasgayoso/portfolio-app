"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { exportPortfolioData } from "@/actions/settings";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Open form when navigated with ?openForm=true
  useEffect(() => {
    if (searchParams.get("openForm") === "true") {
      setIsFormOpen(true);
      // Clean up the URL param
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openForm");
      const newUrl = params.toString()
        ? `/transactions?${params.toString()}`
        : "/transactions";
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  const handleTransactionChange = () => {
    router.refresh();
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`/transactions?${params.toString()}`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    const result = await exportPortfolioData();

    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions menu */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {transactions.total} transaction{transactions.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Export
        </Button>
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
