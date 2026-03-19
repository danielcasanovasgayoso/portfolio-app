"use client";

import { useTransition } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatShares, formatDate } from "@/lib/formatters";
import { deleteTransaction } from "@/actions/transactions";
import type { SerializedTransaction } from "@/types/transaction";

interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: SerializedTransaction | null;
  onSuccess?: () => void;
}

const typeLabels: Record<string, string> = {
  BUY: "Buy",
  SELL: "Sell",
  DIVIDEND: "Dividend",
  FEE: "Fee",
  TRANSFER: "Transfer",
};

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: DeleteTransactionDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!transaction) return null;

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  const typeLabel = typeLabels[transaction.type] || transaction.type;
  const transferSuffix =
    transaction.type === "TRANSFER" && transaction.transferType
      ? ` (${transaction.transferType === "IN" ? "In" : "Out"})`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Transaction
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Asset</span>
              <span className="text-sm font-medium">{transaction.asset.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">
                {typeLabel}
                {transferSuffix}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium tabular-nums">
                {formatDate(transaction.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Shares</span>
              <span className="text-sm font-medium tabular-nums">
                {formatShares(Number(transaction.shares))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-sm font-medium tabular-nums">
                {formatCurrency(Number(transaction.totalAmount), true)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
