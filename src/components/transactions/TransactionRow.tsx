"use client";

import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatShares, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { SerializedTransaction } from "@/types/transaction";

interface TransactionRowProps {
  transaction: SerializedTransaction;
  onEdit: (transaction: SerializedTransaction) => void;
  onDelete: (transaction: SerializedTransaction) => void;
}

const typeColors: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  SELL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  DIVIDEND: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  FEE: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  TRANSFER: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

export function TransactionRow({
  transaction,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const t = useTranslations("transactions");

  const typeLabels: Record<string, string> = {
    BUY: t("typeBuy"),
    SELL: t("typeSell"),
    DIVIDEND: t("typeDividend"),
    FEE: t("typeFee"),
    TRANSFER: t("typeTransfer"),
  };

  const typeColor = typeColors[transaction.type] || typeColors.BUY;
  const typeLabel = typeLabels[transaction.type] || transaction.type;
  const transferSuffix =
    transaction.type === "TRANSFER" && transaction.transferType
      ? ` (${transaction.transferType === "IN" ? t("transferIn").split(" ").pop() : t("transferOut").split(" ").pop()})`
      : "";

  return (
    <article className="p-4 pl-5 relative bg-card rounded-2xl shadow-md border border-border overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[11px] font-medium border", typeColor)}
            >
              {typeLabel}
              {transferSuffix}
            </Badge>
            <span className="text-[12px] text-muted-foreground">
              {formatDate(transaction.date)}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors -mt-1 -mr-1">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{t("actions")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(transaction)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(transaction)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold text-foreground truncate">
            {transaction.asset.name}
          </h3>
          <p className="text-[13px] text-muted-foreground">
            {formatShares(Number(transaction.shares))} {t("shares")}
            {transaction.pricePerShare &&
              ` @ ${formatCurrency(Number(transaction.pricePerShare))}`}
          </p>
          {Number(transaction.fees) > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {t("feeAmount", { amount: formatCurrency(Number(transaction.fees)) })}
            </p>
          )}
        </div>

        <div>
          <p className="text-[17px] font-semibold text-foreground tabular-nums">
            {formatCurrency(Number(transaction.totalAmount))}
          </p>
        </div>
      </div>
    </article>
  );
}
