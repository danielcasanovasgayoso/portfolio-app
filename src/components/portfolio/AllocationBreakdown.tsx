import Link from "next/link";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
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
        <Link
          href="/portfolio/chart"
          aria-label={t("allocationByWeight")}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Link>
      </div>

      {/* Per-holding weight bars */}
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 sm:gap-4">
            <span className="w-24 flex-shrink-0 truncate text-[13px] font-medium text-foreground sm:w-44 sm:text-sm">
              {r.name}
            </span>
            <div className="h-1.5 min-w-0 flex-1 rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(r.percent, 100)}%`,
                  backgroundColor: r.color,
                }}
              />
            </div>
            <span className="w-14 flex-shrink-0 text-right text-[13px] font-bold tabular-nums text-foreground sm:text-sm">
              {r.percent.toFixed(1)}%
            </span>
            <span className="hidden w-24 flex-shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums sm:block">
              {formatCurrency(r.value)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
