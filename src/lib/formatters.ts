// Currency and number formatters for the portfolio

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sharesFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

// Date-only values (YYYY-MM-DD) are anchored to UTC midnight, so format in UTC to
// avoid a timezone-dependent day shift between the server and the client.
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Collapses the non-breaking / narrow-no-break spaces that ICU emits (e.g.
 * between the amount and the € sign) to a regular space. Node and the browser
 * can disagree on which space they use, which causes React hydration mismatches;
 * normalizing here makes the output deterministic across both.
 */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, " ");
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return normalizeSpaces(currencyFormatter.format(value));
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return normalizeSpaces(numberFormatter.format(value));
}

export function formatShares(value: number | null | undefined): string {
  if (value == null) return "—";
  return normalizeSpaces(sharesFormatter.format(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return dateFormatter.format(date);
  } catch {
    return value;
  }
}

export function getGainClass(value: number): "positive" | "negative" {
  return value >= 0 ? "positive" : "negative";
}
