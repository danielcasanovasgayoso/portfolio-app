"use client";

import { useTranslations } from "next-intl";
import { formatCurrency, formatShares, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Coins,
  Receipt,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  transferType?: string | null;
  date: string;
  shares: number;
  pricePerShare: number | null;
  totalAmount: number;
  fees: number;
}

interface TransactionTimelineProps {
  transactions: Transaction[];
}

function getTransactionIcon(type: string, transferType?: string | null) {
  switch (type) {
    case "BUY":
      return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
    case "SELL":
      return <ArrowUpCircle className="h-5 w-5 text-red-500" />;
    case "TRANSFER":
      return (
        <ArrowRightLeft
          className={cn(
            "h-5 w-5",
            transferType === "IN" ? "text-green-500" : "text-orange-500"
          )}
        />
      );
    case "DIVIDEND":
      return <Coins className="h-5 w-5 text-amber-500" />;
    case "FEE":
      return <Receipt className="h-5 w-5 text-gray-500" />;
    default:
      return <ArrowRightLeft className="h-5 w-5 text-gray-400" />;
  }
}

function getTransactionColor(type: string, transferType?: string | null) {
  switch (type) {
    case "BUY":
      return "text-green-600 dark:text-green-400";
    case "SELL":
      return "text-red-600 dark:text-red-400";
    case "TRANSFER":
      return transferType === "IN"
        ? "text-green-600 dark:text-green-400"
        : "text-orange-600 dark:text-orange-400";
    case "DIVIDEND":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

export function TransactionTimeline({
  transactions,
}: TransactionTimelineProps) {
  const t = useTranslations("assetDetail");

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("noTransactions")}
      </p>
    );
  }

  const getTransactionLabel = (type: string, transferType?: string | null) => {
    if (type === "TRANSFER") {
      return transferType === "IN" ? t("transferIn") : t("transferOut");
    }
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-4">
      {transactions.map((txn, index) => (
        <div
          key={txn.id}
          className={cn(
            "flex items-start gap-3 pb-4",
            index < transactions.length - 1 && "border-b border-border"
          )}
        >
          <div className="mt-0.5">{getTransactionIcon(txn.type, txn.transferType)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-sm font-medium",
                  getTransactionColor(txn.type, txn.transferType)
                )}
              >
                {getTransactionLabel(txn.type, txn.transferType)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDate(txn.date)}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {txn.type !== "DIVIDEND" && txn.type !== "FEE" && (
                <span>
                  {formatShares(txn.shares)} {t("shares").toLowerCase()}
                  {txn.pricePerShare && (
                    <> @ {formatCurrency(txn.pricePerShare)}</>
                  )}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {(txn.type === "BUY" || (txn.type === "TRANSFER" && txn.transferType === "IN"))
                  ? "-"
                  : txn.type === "SELL" || txn.type === "DIVIDEND"
                    ? "+"
                    : ""}
                {formatCurrency(txn.totalAmount)}
              </span>
              {txn.fees > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("fees", { amount: formatCurrency(txn.fees) })}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
