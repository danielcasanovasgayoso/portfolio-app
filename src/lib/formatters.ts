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

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return currencyFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return numberFormatter.format(value);
}

export function formatShares(value: number | null | undefined): string {
  if (value == null) return "—";
  return sharesFormatter.format(value);
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

export function getGainSign(value: number): string {
  return value >= 0 ? "+" : "";
}
