// Wallet domain: cash deposits and withdrawals.
// Single source of truth for available cash. This service never touches the
// investments or real-estate domains.

import { scopedDb } from "@/lib/scoped-db";
import type { SeriesPoint } from "@/lib/series";

export interface WalletSummary {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  movementsCount: number;
  lastMovementDate: string | null; // YYYY-MM-DD
}

export interface SerializedCashMovement {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  date: string; // ISO
  amount: number;
  note: string | null;
  createdAt: string;
}

/**
 * Current balance and lifetime totals. Balance = deposits − withdrawals.
 */
export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const sdb = scopedDb(userId);
  const [deposits, withdrawals, count, last] = await Promise.all([
    sdb.cashMovement.aggregate({
      where: { type: "DEPOSIT" },
      _sum: { amount: true },
    }),
    sdb.cashMovement.aggregate({
      where: { type: "WITHDRAWAL" },
      _sum: { amount: true },
    }),
    sdb.cashMovement.count(),
    sdb.cashMovement.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  const totalDeposits = Number(deposits._sum.amount ?? 0);
  const totalWithdrawals = Number(withdrawals._sum.amount ?? 0);

  return {
    balance: totalDeposits - totalWithdrawals,
    totalDeposits,
    totalWithdrawals,
    movementsCount: count,
    lastMovementDate: last ? last.date.toISOString().split("T")[0] : null,
  };
}

/**
 * All movements, newest first.
 */
export async function getCashMovements(
  userId: string
): Promise<SerializedCashMovement[]> {
  const movements = await scopedDb(userId).cashMovement.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return movements.map((m) => ({
    id: m.id,
    type: m.type,
    date: m.date.toISOString(),
    amount: Number(m.amount),
    note: m.note,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Cumulative balance over time, as { date, close }[] points compatible with
 * the shared PriceChart component.
 */
export async function getWalletBalanceHistory(
  userId: string
): Promise<SeriesPoint[]> {
  const movements = await scopedDb(userId).cashMovement.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { type: true, date: true, amount: true },
  });

  if (movements.length === 0) return [];

  // One point per day with the end-of-day running balance.
  const byDate = new Map<string, number>();
  let balance = 0;
  for (const m of movements) {
    const dateStr = m.date.toISOString().split("T")[0];
    const signed = m.type === "DEPOSIT" ? Number(m.amount) : -Number(m.amount);
    balance += signed;
    byDate.set(dateStr, Math.round(balance * 100) / 100);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, close]) => ({ date, close }));
}
