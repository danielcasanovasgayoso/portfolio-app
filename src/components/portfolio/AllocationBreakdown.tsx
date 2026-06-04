import { useTranslations } from "next-intl";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** One asset-class slice of the portfolio allocation. */
export interface AllocationSegment {
  /** Stable key (also used to look up the segment color). */
  key: string;
  /** Human-readable, already-translated label. */
  label: string;
  /** Market value of this class. */
  value: number;
  /** Since-inception return for this class. */
  gainLossPercent: number;
  /** Whether a return makes sense for this class (false for cash / no cost basis). */
  showReturn: boolean;
  /** Bar + dot color. */
  color: string;
}

interface AllocationBreakdownProps {
  segments: AllocationSegment[];
}

/**
 * Flat companion to the hero card: a single proportional bar plus a legend that
 * makes asset-class allocation scannable at a glance — so an oversized cash
 * position reads as a wide slice rather than a number buried at the bottom.
 */
export function AllocationBreakdown({ segments }: AllocationBreakdownProps) {
  const t = useTranslations("portfolio");

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0 || segments.length === 0) return null;

  const withPercent = segments.map((s) => ({
    ...s,
    percent: (s.value / total) * 100,
  }));

  return (
    <article className="bg-card rounded-xl shadow-ambient p-6 sm:p-8">
      <span className="label-sm block mb-4">{t("allocation")}</span>

      {/* Proportional bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {withPercent.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${s.percent}%`, backgroundColor: s.color }}
            title={`${s.label} · ${s.percent.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {withPercent.map((s) => (
          <li key={s.key} className="flex items-center gap-3 min-w-0">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[13px] font-medium text-foreground truncate">
              {s.label}
            </span>
            <span className="text-[13px] font-mono font-semibold text-muted-foreground tabular-nums ml-auto flex-shrink-0">
              {s.percent.toFixed(1)}%
            </span>
            <span className="hidden sm:inline w-px self-stretch bg-border" />
            <span className="hidden sm:inline text-[12px] font-mono text-muted-foreground tabular-nums flex-shrink-0 w-[5.5rem] text-right">
              {formatCurrency(s.value)}
            </span>
            <span
              className={cn(
                "text-[12px] font-mono font-medium tabular-nums flex-shrink-0 w-[4.5rem] text-right",
                s.showReturn
                  ? s.gainLossPercent >= 0
                    ? "text-gain"
                    : "text-loss"
                  : "text-muted-foreground"
              )}
            >
              {s.showReturn ? formatPercent(s.gainLossPercent) : t("notApplicable")}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
