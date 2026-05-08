"use client";

import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, Pill, type PillVariant } from "@/components/pulse";
import { formatCurrency, formatDate, formatShares } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SerializedTransaction } from "@/types/transaction";

interface TransactionRowProps {
  transaction: SerializedTransaction;
  onEdit: (transaction: SerializedTransaction) => void;
  onDelete: (transaction: SerializedTransaction) => void;
  /** Hide the bottom divider — used on the last row in a group. */
  last?: boolean;
}

const TYPE_PILL: Record<string, PillVariant> = {
  BUY: "type-buy",
  SELL: "type-sell",
  DIVIDEND: "type-dividend",
  FEE: "type-fee",
  TRANSFER: "neutral",
};

export function TransactionRow({
  transaction,
  onEdit,
  onDelete,
  last = false,
}: TransactionRowProps) {
  const t = useTranslations("transactions");

  const ticker = transaction.asset.ticker || transaction.asset.isin;
  const seed = ticker || transaction.asset.id;

  const typeLabel = transaction.type;
  const transferTag =
    transaction.type === "TRANSFER" && transaction.transferType
      ? transaction.transferType
      : null;

  const sharesPart = transaction.shares
    ? `${formatShares(transaction.shares)} ${t("shares").toLowerCase()}`
    : null;
  const pricePart = transaction.pricePerShare
    ? formatCurrency(transaction.pricePerShare)
    : null;
  const datePart = formatDate(transaction.date);

  const subline = [sharesPart, pricePart, datePart].filter(Boolean).join(" · ");

  const isPlus =
    transaction.type === "SELL" || transaction.type === "DIVIDEND";
  const amountColor =
    transaction.type === "SELL"
      ? "text-loss"
      : transaction.type === "DIVIDEND"
      ? "text-gain"
      : "text-foreground";

  return (
    <article
      className={cn(
        "flex items-center gap-3 px-3.5 py-3",
        last ? "" : "border-b border-[var(--outline-variant)]"
      )}
    >
      <Avatar seed={seed} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {ticker}
          </span>
          <Pill variant={TYPE_PILL[transaction.type] ?? "neutral"}>
            {typeLabel}
            {transferTag ? ` · ${transferTag}` : ""}
          </Pill>
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {subline}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            "font-mono text-[13px] font-bold tabular-nums",
            amountColor
          )}
        >
          {isPlus ? "+" : ""}
          {formatCurrency(transaction.totalAmount)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label={t("actions")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(transaction)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
