import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/formatters";

/** One holding's slice of the portfolio, by market value. */
export interface AllocationItem {
  id: string;
  /** Holding name (already resolved). */
  name: string;
  /** Market value of this holding. */
  value: number;
  /** Bar + accent color (matches the holding card's stripe). */
  color: string;
}

interface AllocationBreakdownProps {
  items: AllocationItem[];
}

/**
 * A per-holding "allocation by weight" list: each asset gets a full-width track
 * with a colored pill sized to its share of net worth, sorted largest first.
 * Makes relative sizing — e.g. an oversized cash position — scannable instantly.
 */
export function AllocationBreakdown({ items }: AllocationBreakdownProps) {
  const t = useTranslations("portfolio");

  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (total <= 0 || items.length === 0) return null;

  const rows = items
    .map((i) => ({ ...i, percent: (i.value / total) * 100 }))
    .sort((a, b) => b.percent - a.percent);

  return (
    <article className="bg-card rounded-xl shadow-ambient p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="label-sm">{t("allocationByWeight")}</span>
      </div>

      {/* Per-holding weight bars */}
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem] items-center gap-3 sm:grid-cols-[minmax(14rem,1fr)_minmax(12rem,0.9fr)_3.5rem_8rem] sm:gap-4"
          >
            <span className="min-w-0 truncate text-[13px] font-medium text-foreground sm:text-sm">
              {r.name}
            </span>
            <div
              className="relative h-1.5 min-w-0 overflow-hidden rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--foreground) 12%, transparent)",
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.max(Math.min(r.percent, 100), 1.5)}%`,
                  backgroundColor: r.color,
                }}
              />
            </div>
            <span className="text-right text-[13px] font-bold tabular-nums text-foreground sm:text-sm">
              {r.percent.toFixed(1)}%
            </span>
            <span className="hidden whitespace-nowrap text-right font-mono text-sm text-muted-foreground tabular-nums sm:block sensitive-amount">
              {formatCurrency(r.value)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
