"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreVertical,
  Download,
  Upload,
  Mail,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { exportPortfolioData, importPortfolioData } from "@/actions/settings";
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setImportResult({ success: false, message: "Please select a JSON file" });
      setTimeout(() => setImportResult(null), 5000);
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const response = await importPortfolioData(text);

      if (response.success && response.data) {
        const { assetsImported, transactionsImported } = response.data;
        setImportResult({
          success: true,
          message: `Imported ${assetsImported} assets and ${transactionsImported} transactions`,
        });
        router.refresh();
      } else {
        setImportResult({
          success: false,
          message: response.error || "Failed to import data",
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to read file",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        ref={fileInputRef}
        className="hidden"
      />

      {/* Header with Add button and actions menu */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {transactions.total} transaction{transactions.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/import")}>
                <Mail className="h-4 w-4 mr-2" />
                Import from Gmail
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import from JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export to JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Import result feedback */}
      {importResult && (
        <div
          className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
            importResult.success
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {importResult.success ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {importResult.message}
        </div>
      )}

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
                  // Show first page, last page, current page, and pages around current
                  return (
                    page === 1 ||
                    page === transactions.totalPages ||
                    Math.abs(page - transactions.page) <= 1
                  );
                })
                .map((page, index, arr) => {
                  // Add ellipsis if there's a gap
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
