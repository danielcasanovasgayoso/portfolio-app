"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatShares, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TransactionRow } from "./TransactionRow";
import { TransactionForm } from "./TransactionForm";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";
import type { SerializedTransaction } from "@/types/transaction";
import type { Asset } from "@prisma/client";

interface TransactionTableProps {
  transactions: SerializedTransaction[];
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
  onTransactionChange?: () => void;
}

const typeColors: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  SELL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  DIVIDEND: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  FEE: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  TRANSFER: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

const typeLabels: Record<string, string> = {
  BUY: "Buy",
  SELL: "Sell",
  DIVIDEND: "Dividend",
  FEE: "Fee",
  TRANSFER: "Transfer",
};

export function TransactionTable({
  transactions,
  assets,
  onTransactionChange,
}: TransactionTableProps) {
  const [editingTransaction, setEditingTransaction] =
    useState<SerializedTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<SerializedTransaction | null>(null);

  const handleEdit = (transaction: SerializedTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleDelete = (transaction: SerializedTransaction) => {
    setDeletingTransaction(transaction);
  };

  const handleEditClose = () => {
    setEditingTransaction(null);
  };

  const handleDeleteClose = () => {
    setDeletingTransaction(null);
  };

  const handleSuccess = () => {
    onTransactionChange?.();
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
        <p className="text-muted-foreground max-w-sm">
          No transactions match your current filters. Try adjusting your filters
          or add a new transaction.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-3">
        {transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const typeColor =
                typeColors[transaction.type] || typeColors.BUY;
              const typeLabel =
                typeLabels[transaction.type] || transaction.type;
              const transferSuffix =
                transaction.type === "TRANSFER" && transaction.transferType
                  ? ` ${transaction.transferType === "IN" ? "In" : "Out"}`
                  : "";

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium tabular-nums">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[11px] font-medium border", typeColor)}
                    >
                      {typeLabel}
                      {transferSuffix}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="font-medium truncate">
                        {transaction.asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.asset.ticker || transaction.asset.isin}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatShares(Number(transaction.shares))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {transaction.pricePerShare
                      ? formatCurrency(Number(transaction.pricePerShare))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(Number(transaction.totalAmount))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {transaction.fees && Number(transaction.fees) > 0
                      ? formatCurrency(Number(transaction.fees))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(transaction)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(open) => !open && handleEditClose()}
        transaction={editingTransaction}
        assets={assets}
        onSuccess={handleSuccess}
      />

      {/* Delete Dialog */}
      <DeleteTransactionDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && handleDeleteClose()}
        transaction={deletingTransaction}
        onSuccess={handleSuccess}
      />
    </>
  );
}
