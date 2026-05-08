"use client";

import { useTranslations } from "next-intl";
import { Pill, type PillVariant } from "@/components/pulse";
import { formatCurrency, formatDate, formatShares } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  currentPrice?: number | null;
}

function pillVariant(type: string): PillVariant {
  switch (type) {
    case "BUY":
      return "type-buy";
    case "SELL":
      return "type-sell";
    case "DIVIDEND":
      return "type-dividend";
    case "FEE":
      return "type-fee";
    default:
      return "neutral";
  }
}

export function TransactionTimeline({ transactions }: TransactionTimelineProps) {
  const t = useTranslations("assetDetail");

  if (transactions.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-muted-foreground">
        {t("noTransactions")}
      </p>
    );
  }

  const labelFor = (type: string, transferType?: string | null) => {
    if (type === "TRANSFER") {
      return transferType === "IN" ? t("transferIn") : t("transferOut");
    }
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  return (
    <ol className="overflow-hidden rounded-2xl bg-card ghost-border shadow-sm">
      {transactions.map((txn, index) => {
        const isFlow = txn.type !== "DIVIDEND" && txn.type !== "FEE";
        const isPlus =
          txn.type === "SELL" ||
          txn.type === "DIVIDEND" ||
          (txn.type === "TRANSFER" && txn.transferType === "OUT");
        const amountColorClass =
          txn.type === "SELL"
            ? "text-loss"
            : txn.type === "DIVIDEND"
            ? "text-gain"
            : "text-foreground";

        const detail = isFlow
          ? [
              `${formatShares(txn.shares)} ${t("shares").toLowerCase()}`,
              txn.pricePerShare ? formatCurrency(txn.pricePerShare) : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : labelFor(txn.type);

        return (
          <li
            key={txn.id}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3",
              index < transactions.length - 1 &&
                "border-b border-[var(--outline-variant)]"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">
                  {labelFor(txn.type, txn.transferType)}
                </span>
                <Pill variant={pillVariant(txn.type)}>{txn.type}</Pill>
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {detail} · {formatDate(txn.date)}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 font-mono text-[13px] font-bold tabular-nums",
                amountColorClass
              )}
            >
              {isPlus ? "+" : ""}
              {formatCurrency(txn.totalAmount)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
