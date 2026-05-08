"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TransactionRow } from "./TransactionRow";
import { TransactionForm } from "./TransactionForm";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";
import { SectionCard } from "@/components/pulse";
import type { SerializedTransaction } from "@/types/transaction";
import type { Asset } from "@prisma/client";

interface TransactionTableProps {
  transactions: SerializedTransaction[];
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
  onTransactionChange?: () => void;
}

interface MonthGroup {
  key: string;
  label: string;
  rows: SerializedTransaction[];
}

export function TransactionTable({
  transactions,
  assets,
  onTransactionChange,
}: TransactionTableProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const [editing, setEditing] = useState<SerializedTransaction | null>(null);
  const [deleting, setDeleting] = useState<SerializedTransaction | null>(null);

  const groups = useMemo<MonthGroup[]>(() => {
    const monthFormatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    });
    const map = new Map<string, MonthGroup>();
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      let group = map.get(key);
      if (!group) {
        const label = monthFormatter.format(date);
        group = {
          key,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          rows: [],
        };
        map.set(key, group);
      }
      group.rows.push(tx);
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [locale, transactions]);

  if (transactions.length === 0) {
    return (
      <SectionCard ambient={false} className="text-center">
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      </SectionCard>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.key}>
            <header className="mb-2 flex items-baseline justify-between px-1">
              <span className="text-[13px] font-semibold text-foreground">
                {group.label}
              </span>
              <span className="label-sm">
                {t("count", { count: group.rows.length })}
              </span>
            </header>
            <div className="overflow-hidden rounded-2xl bg-card ghost-border shadow-sm">
              {group.rows.map((tx, idx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  last={idx === group.rows.length - 1}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <TransactionForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        transaction={editing}
        assets={assets}
        onSuccess={() => onTransactionChange?.()}
      />

      <DeleteTransactionDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        transaction={deleting}
        onSuccess={() => onTransactionChange?.()}
      />
    </>
  );
}
